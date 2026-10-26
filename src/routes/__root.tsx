import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { NotFoundPage, ServerErrorPage } from "@/components/portfolio/ErrorPage";
import { ImageFallback, OfflineBanner } from "@/components/portfolio/AppStatus";
import { isPreviewDeployment } from "@/lib/siteConfig";

function NotFoundComponent() {
  return <NotFoundPage />;
}

function ErrorComponent({ error }: ErrorComponentProps) {
  // Le détail technique reste dans la console, jamais affiché au visiteur.
  console.error(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return <ServerErrorPage />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Landry Kayoyo" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Landry Kayoyo" },
      { name: "google-site-verification", content: "7i407FtKGpD5q2BAf_JbE73Wc2niO1tXYjZ5n8sxq1I" },
      ...(isPreviewDeployment ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Manrope:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <OfflineBanner />
      <ImageFallback />
    </QueryClientProvider>
  );
}
