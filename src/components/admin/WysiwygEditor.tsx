import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Youtube } from "@tiptap/extension-youtube";
import { toast } from "sonner";
import { uploadProjectImage } from "@/lib/admin-data";
import { compressImageBeforeUpload } from "@/lib/cloudinary";

export interface WysiwygEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
  onEditorReady: (editor: Editor | null) => void;
  placeholder?: string;
}

export function WysiwygEditor({
  initialHtml,
  onChange,
  onEditorReady,
  placeholder = "Rédigez ici le contenu de l'étude de cas (contexte, problématique, solution, architecture, résultats...)",
}: WysiwygEditorProps) {
  const isUpdatingFromPropRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        dropcursor: {
          color: "oklch(0.5 0.2 258)",
          width: 2,
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-xl border border-border shadow-sm my-4",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse border border-border rounded-lg my-4",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({
        inline: false,
        nocookie: true,
        allowFullscreen: true,
        HTMLAttributes: {
          class: "aspect-video w-full max-w-3xl rounded-2xl my-6 border border-border/80 shadow-md mx-auto block bg-muted",
        },
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "tiptap-content min-h-[500px] w-full p-6 sm:p-8 text-foreground focus:outline-none prose prose-neutral max-w-none",
        "data-placeholder": placeholder,
      },
      // ── Gestion du Drag & Drop d'images directement dans l'éditeur ──
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file && file.type.startsWith("image/")) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const pos = coordinates ? coordinates.pos : view.state.selection.from;

            void (async () => {
              const toastId = toast.loading("Optimisation et importation de l'image...");
              try {
                const optimized = await compressImageBeforeUpload(file);
                const url = await uploadProjectImage(optimized);
                toast.success("Image importée avec succès !", { id: toastId });

                if (editor) {
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(pos)
                    .setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, "") })
                    .run();
                }
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur lors de l'importation.", {
                  id: toastId,
                });
              }
            })();

            return true;
          }
        }
        return false;
      },
      // ── Gestion du Copier-Coller (Images et Vidéos YouTube/Vimeo) ──
      handlePaste: (view, event) => {
        // 1. Détection automatique des liens vidéo YouTube / Shorts / Vimeo collés
        const text = event.clipboardData?.getData("text/plain")?.trim();
        if (text && (text.includes("youtube.com") || text.includes("youtu.be") || text.includes("vimeo.com"))) {
          const shortsMatch = text.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
          if (shortsMatch && shortsMatch[1]) {
            event.preventDefault();
            const embedUrl = `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`;
            if (editor) {
              editor.chain().focus().setYoutubeVideo({ src: embedUrl }).run();
              toast.success("Vidéo YouTube intégrée et mise en forme !");
            }
            return true;
          }

          const ytMatch = text.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
          if (ytMatch && ytMatch[1]) {
            event.preventDefault();
            const embedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
            if (editor) {
              editor.chain().focus().setYoutubeVideo({ src: embedUrl }).run();
              toast.success("Vidéo YouTube intégrée et mise en forme !");
            }
            return true;
          }
        }

        // 2. Détection des fichiers image collés depuis le presse-papier
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void (async () => {
                const toastId = toast.loading("Téléversement de l'image collée vers Cloudinary...");
                try {
                  const optimized = await compressImageBeforeUpload(file);
                  const url = await uploadProjectImage(optimized);
                  toast.success("Image collée et sauvegardée !", { id: toastId });

                  if (editor) {
                    editor
                      .chain()
                      .focus()
                      .setImage({ src: url, alt: "Image insérée" })
                      .run();
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur de collage.", {
                    id: toastId,
                  });
                }
              })();
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      if (isUpdatingFromPropRef.current) return;
      onChange(e.getHTML());
    },
  });

  // Notifie le parent dès que l'éditeur est prêt
  useEffect(() => {
    onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Synchronisation descendante : si initialHtml change (depuis le mode HTML ou le reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (initialHtml !== current) {
      isUpdatingFromPropRef.current = true;
      editor.commands.setContent(initialHtml, false);
      isUpdatingFromPropRef.current = false;
    }
  }, [editor, initialHtml]);

  return (
    <div className="relative min-h-[500px] w-full bg-card rounded-xl border border-border/80 shadow-2xs overflow-hidden">
      <EditorContent editor={editor} />
    </div>
  );
}
