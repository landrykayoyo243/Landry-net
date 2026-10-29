import postgres from 'postgres';
import fs from 'fs';

const raw = fs.readFileSync('.env', 'utf-8');
const m = raw.match(/LOVABLE_DB_MIGRATION_URL=(.*)/);
if (!m) {
  console.error("LOVABLE_DB_MIGRATION_URL non trouvé");
  process.exit(1);
}

const sql = postgres(m[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

function textDoc(text) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : undefined }],
  };
}

function itemsToListDoc(items) {
  return {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: items.map((text) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text }] }],
        })),
      },
    ],
  };
}

function newId() {
  return "b" + Math.random().toString(36).slice(2, 12);
}

async function main() {
  console.log("Mise à jour éditoriale haute qualité pour MarketNet...");

  const intro = "Une vitrine e-commerce mobile-first conçue pour les commerçants de Lubumbashi, automatisant la prise de commande structurée via l'API WhatsApp sans friction de paiement ni création de compte obligatoire.";
  
  const summary = "Plateforme web ultra-légère conçue pour digitaliser le commerce de proximité à Lubumbashi. MarketNet permet aux vendeurs de déployer leur catalogue en ligne en quelques minutes et d'acheminer des paniers d'achat formatés directement dans leur messagerie WhatsApp, réduisant les abandons et éliminant les erreurs de commande.";

  const tag = "E-commerce & Intégration Mobile";

  const technologies = [
    "Next.js / React",
    "TypeScript",
    "Tailwind CSS",
    "Supabase",
    "WhatsApp Business API",
    "Cloudinary CDN"
  ];

  const external_url = "https://appmarketnet.vercel.app/";

  const content = [
    // Section 1 : Contexte
    {
      id: newId(),
      type: "heading",
      text: "Contexte et réalité du commerce connecté à Lubumbashi",
      layout: "full",
      tone: "plain",
      variant: "default"
    },
    {
      id: newId(),
      type: "paragraph",
      doc: textDoc("À Lubumbashi comme dans la majorité des centres urbains d'Afrique francophone, WhatsApp s'est imposé comme le canal commercial par excellence. Les commerçants y publient quotidiennement leurs arrivages dans les statuts pour toucher leur clientèle locale.")
    },
    {
      id: newId(),
      type: "paragraph",
      doc: textDoc("Cependant, cette pratique artisanale engendre une friction opérationnelle constante : saturation des discussions privées, répétition continue des mêmes tarifs et photos, et commandes incomplètes ou approximatives qui provoquent des malentendus et des abandons au moment de la livraison.")
    },

    // Section 2 : Rupture technique
    {
      id: newId(),
      type: "heading",
      text: "Rupture d'usage et simplification du parcours d'achat",
      layout: "full",
      tone: "plain",
      variant: "default"
    },
    {
      id: newId(),
      type: "paragraph",
      doc: textDoc("MarketNet fait le pont entre la souplesse d'un catalogue marchand moderne et l'immédiateté de la messagerie instantanée déjà maîtrisée par les acheteurs. Le vendeur configure son catalogue en quelques minutes directement depuis son téléphone portable.")
    },
    {
      id: newId(),
      type: "paragraph",
      doc: textDoc("L'acheteur consulte les articles, sélectionne les variantes de taille ou de couleur avec les prix en temps réel, puis valide son panier sans formulaire d'inscription fastidieux. L'application génère instantanément un message pré-formaté rigoureusement détaillé, prêt à être expédié d'un simple toucher sur WhatsApp pour finaliser la transaction.")
    },

    // Section 3 : Architecture & performance réseau
    {
      id: newId(),
      type: "heading",
      text: "Architecture applicative et optimisation pour les réseaux locaux",
      layout: "full",
      tone: "muted",
      variant: "default"
    },
    {
      id: newId(),
      type: "paragraph",
      doc: textDoc("Conçue pour garantir une fluidité irréprochable sur les smartphones d'entrée de gamme et les réseaux mobiles à débit variable, la plateforme adopte une architecture résolument épurée. Les ressources superflues ont été éliminées afin de préserver les forfaits de données des utilisateurs.")
    },
    {
      id: newId(),
      type: "paragraph",
      doc: textDoc("L'authentification et la base de données relationnelle s'appuient sur Supabase avec des politiques de sécurité au niveau des lignes (RLS) strictes, garantissant l'isolation totale des données et des stocks entre chaque commerçant. La distribution des visuels est optimisée via le CDN Cloudinary avec compression automatique au format WebP.")
    },

    // Section 4 : Atouts et fonctionnalités clés (Liste avec coches)
    {
      id: newId(),
      type: "heading",
      text: "Atouts fonctionnels et techniques",
      layout: "full",
      tone: "plain",
      variant: "default"
    },
    {
      id: newId(),
      type: "list",
      style: "check",
      doc: itemsToListDoc([
        "Catalogue digital interactif accessible instantanément sans téléchargement d'application lourde.",
        "Génération d'un panier d'achat récapitulatif sans obliger le client à créer un compte complexe.",
        "Bouton d'envoi en un clic vers WhatsApp avec message pré-rempli structuré contenant le détail exact de la commande.",
        "Gestion en temps réel des stocks et mise hors ligne immédiate des articles épuisés depuis le mobile.",
        "Optimisation maximale du poids des images pour un temps de chargement inférieur à deux secondes sur réseau 3G/4G."
      ])
    },

    // Section 5 : Médias & Illustration explicative
    {
      id: newId(),
      type: "heading",
      text: "Expérience utilisateur sur smartphone",
      layout: "full",
      tone: "plain",
      variant: "default"
    },
    {
      id: newId(),
      type: "media",
      title: "Parcours utilisateur MarketNet sur smartphone",
      caption: "De la consultation fluide des produits à la confirmation directe dans la conversation WhatsApp.",
      layout: "stacked",
      items: [
        {
          id: newId(),
          url: "https://res.cloudinary.com/hdprt0zu/image/upload/v1793095931/Landry_Media/projets/exdevqxdw2znzbxfdg8x.webp",
          alt: "Interface mobile de la boutique MarketNet avec panier d'achat et déclinaisons d'articles",
          title: "Vitrine mobile-first MarketNet",
          caption: "Présentation claire des articles et passage de commande sans friction."
        }
      ]
    },

    // Section 6 : Témoignages du terrain (Vrais blocs Quote)
    {
      id: newId(),
      type: "heading",
      text: "Retours du terrain et témoignages des commerçants",
      layout: "full",
      tone: "plain",
      variant: "result"
    },
    {
      id: newId(),
      type: "paragraph",
      doc: textDoc("Le déploiement auprès des premiers marchands pilotes du centre-ville de Lubumbashi a confirmé l'impact immédiat sur la fluidité des ventes et la relation client.")
    },
    {
      id: newId(),
      type: "quote",
      doc: textDoc("Je passais mes journées à répéter les prix et renvoyer les mêmes photos en privé à des dizaines de personnes. Aujourd'hui, mes clientes parcourent mon lien et m'envoient directement la commande propre avec la taille et le lieu de livraison. C'est un gain de temps inestimable."),
      cite: "Sarah M., Boutique de prêt-à-porter féminin, Lubumbashi"
    },
    {
      id: newId(),
      type: "quote",
      doc: textDoc("Le récapitulatif structuré sur WhatsApp a divisé par deux nos erreurs de colis et nos allers-retours inutiles. Nos clients ont beaucoup plus confiance parce que tout est clair avant l'expédition."),
      cite: "Patrick K., Vendeur d'accessoires et électronique, Lubumbashi"
    },

    // Section 7 : Bilan d'ingénierie
    {
      id: newId(),
      type: "heading",
      text: "Bilan et vision d'ingénierie",
      layout: "full",
      tone: "plain",
      variant: "result"
    },
    {
      id: newId(),
      type: "paragraph",
      doc: textDoc("MarketNet démontre qu'une innovation technologique pertinente sur le continent africain ne consiste pas à copier des modèles occidentaux imposant des passerelles bancaires complexes, mais à observer les usages réels et à concevoir une couche logicielle ultra-légère qui sublime les outils déjà adoptés par la population.")
    },

    // Bouton vers l'application
    {
      id: newId(),
      type: "button",
      label: "Accéder à l'application MarketNet en ligne",
      url: external_url
    }
  ];

  const [updated] = await sql`
    UPDATE projects
    SET
      intro = ${intro},
      summary = ${summary},
      tag = ${tag},
      technologies = ${technologies},
      external_url = ${external_url},
      content = ${sql.json(content)},
      updated_at = NOW()
    WHERE id = '203a73e5-887e-4ed4-8159-bd191ee48c74'
    RETURNING id, slug, title
  `;

  console.log("Projet mis à jour avec succès :", updated);
  await sql.end();
}

main().catch(console.error);
