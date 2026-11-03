import { SITE_URL, absoluteUrl } from "@/lib/siteConfig";

// Tout le contenu du site est ici : modifiez ce fichier pour mettre à jour les textes.
const cv = { url: "/cv.pdf" };

// Adresse publique du site lue depuis la configuration centrale
export const siteUrl = SITE_URL;
export const shareImage = {
  url: absoluteUrl("/og-landry-net.jpg"),
  width: 1200,
  height: 630,
  alt: "Logo Landry Net",
};

// ─────────────────────────────────────────────────────────
// WHATSAPP — c'est ici que vous changez votre numéro.
// Écrivez-le sans "+", sans espaces ni tirets, avec l'indicatif du pays.
// RD Congo : 243 puis votre numéro  →  243906619747
// ─────────────────────────────────────────────────────────
export const whatsappNumber = "243906619747";

// Message écrit d'avance pour la personne qui clique sur le bouton WhatsApp.
export const whatsappMessage =
  "Bonjour Landry, je vous contacte depuis votre portfolio.";

// Lien WhatsApp complet, construit automatiquement à partir du numéro ci-dessus.
export const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

export const profile = {
  name: "Landry Kayoyo",
  fullName: "Ngoy Bahati Kayoyo Landry",
  title: "Administrateur systèmes & réseaux | Développeur web",
  tagline:
    "Je conçois des infrastructures fiables et des applications web utiles — du câblage réseau jusqu'à la mise en ligne.",
  email: "Kayoyolandry@gmail.com",
  phone: "+243 906 619 747",
  phoneHref: "tel:+243906619747",
  whatsappNumber,
  whatsappMessage,
  whatsapp: whatsappUrl,
  linkedin: "https://cd.linkedin.com/in/landry-kayoyo-48141534b",
  github: "https://github.com/landrykayoyo",
  youtube: "https://share.google/6fI4VCZ680YWEZgCY",
  location: "Lubumbashi, RD Congo",
  cvUrl: cv.url,
};

// Les liens avec "href" mènent à une section de la page d'accueil ;
// ceux avec "to" mènent à une page dédiée.
export const nav = [
  { to: "/a-propos", label: "À propos" },
  { href: "#competences", label: "Compétences" },
  { href: "#projets", label: "Projets" },
  { href: "#parcours", label: "Parcours" },
  { to: "/contact", label: "Contact" },
];

// Institutions et marques partenaires / environnements d'intervention
export const brands = [
  { name: "XSECURITY", role: "Cybersécurité & Réseaux", city: "Lubumbashi" },
  { name: "INPP", role: "Infrastructures critiques", city: "Direction provinciale" },
  { name: "CNSS", role: "Systèmes de production", city: "Lubumbashi" },
  { name: "Université Don Bosco", role: "Sciences Informatiques", city: "Lubumbashi" },
  { name: "PayLix", role: "Plateforme Fintech & Web", city: "RDC" },
  { name: "Cisco Networking", role: "Validation académique", city: "Academy" },
];

// Résumé court affiché sur la page d'accueil (5 à 8 lignes).
export const about = [
  "Diplômé en administration des systèmes et réseaux à l'Université Don Bosco de Lubumbashi, je suis membre de l'équipe technique de XSECURITY.",
  "J'accompagne les petites entreprises : mise en place de réseaux, sécurisation des systèmes et développement d'applications web.",
  "Mon objectif : livrer des services fiables, sécurisés et simples à maintenir.",
];

// Phrase d'accroche / conviction éditoriale affichée en haut de la page d'accueil
export const conviction = {
  text: "Une infrastructure solide ne se remarque pas : elle fonctionne en continu et en silence.",
  highlight: "Le code moderne ne vaut que s'il est fiable, sécurisé et immédiatement utile.",
};

// Contenu de la page dédiée /a-propos inspiré d'une narration fluide et percutante.
export const aboutPage = {
  back: "Retour à l'accueil",
  eyebrow: "Landry Kayoyo · Derrière la machine",
  titleLead: "Bâtisseur de l'invisible,",
  titleAccent: "garant de votre continuité numérique.",
  title: "Bâtisseur de l'invisible, garant de votre continuité numérique.",
  intro:
    "Administrateur systèmes par discipline, développeur web par désir de créer. Je partage ici mon cheminement, mes racines à Lubumbashi et la façon dont je relie la technique brute aux besoins réels des organisations.",

  storyParagraphs: [
    "Diplômé en Administration des Systèmes et Réseaux à l'Université Don Bosco et membre technique de l'équipe XSECURITY à Lubumbashi, j'ai développé mes compétences au contact direct du terrain et des impératifs réels des entreprises.",
    "Mon approche associe la rigueur de l'administration réseau et l'agilité du développement moderne. Je conçois des systèmes stables, sécurisés et pérennes, avec une priorité constante : garantir la continuité de service et la protection absolue des données.",
    "Aujourd'hui, j'accompagne les entreprises et porteurs de projets dans la modernisation de leur parc informatique, la mise en place d'architectures réseau résilientes et le déploiement d'applications web sur mesure.",
  ],

  quote: {
    lead: "C'est cette vision qui me guide :",
    accent: "concevoir des solutions robustes, utiles et immédiatement opérationnelles.",
  },

  pillars: {
    eyebrow: "Domaines d'intervention",
    title: "Trois expertises complémentaires,",
    accent: "une même exigence.",
    lead: "Accompagner les entreprises et les équipes dans la fiabilité et la sécurité de leur écosystème numérique.",
    items: [
      {
        tag: "Infrastructures",
        title: "Systèmes & Réseaux",
        description:
          "Conception, déploiement et maintenance d'infrastructures informatiques résilientes : serveurs Linux & Windows, virtualisation et routage Cisco.",
        subtext: "Des réseaux configurés pour fonctionner en continu sans temps d'arrêt imprévu.",
        linkText: "Voir mes réalisations →",
        linkHref: "/#projets",
      },
      {
        tag: "Protection",
        title: "Cybersécurité & Données",
        description:
          "Politiques strictes de contrôle d'accès, segmentation réseau, sauvegardes automatisées et stratégies de reprise après sinistre.",
        subtext: "Garantir l'intégrité et la confidentialité des données stratégiques de l'organisation.",
        linkText: "Échanger sur vos systèmes →",
        linkHref: "/contact",
      },
      {
        tag: "Ingénierie",
        title: "Développement Web",
        description:
          "Création d'applications web modernes, bases de données structurées et plateformes adaptées aux besoins locaux (telle que PayLix).",
        subtext: "Des outils conçus pour automatiser vos tâches et propulser vos services en ligne.",
        linkText: "Découvrir les projets →",
        linkHref: "/#projets",
      },
    ],
  },

  timeline: {
    eyebrow: "Mon parcours",
    title: "Les étapes",
    accent: "clés.",
    items: [
      {
        year: "2022",
        title: "Formation académique",
        text: "Formation approfondie en Administration des Systèmes & Réseaux à l'Université Don Bosco de Lubumbashi, axée sur les réseaux Cisco, la virtualisation et la sécurité.",
      },
      {
        year: "2025",
        title: "Immersion terrain",
        text: "Déploiement et maintenance d'infrastructures d'entreprises, diagnostic réseau, administration de serveurs et assistance technique aux utilisateurs.",
      },
      {
        year: "2026",
        title: "XSECURITY & Applications Web",
        text: "Intégration de l'équipe technique de XSECURITY à Lubumbashi : sécurisation des parcs informatiques et conception de plateformes web comme PayLix.",
      },
      {
        year: "Aujourd'hui",
        title: "Contribuer aux grands défis",
        text: "Poursuite de mon engagement auprès des organisations : sécuriser leurs systèmes d'information, moderniser leurs outils et concevoir des applications fiables.",
      },
    ],
  },

  cta: {
    eyebrow: "Me contacter",
    title: "Le prochain projet commence",
    accent: "peut-être aujourd'hui.",
    lead: "Que vous ayez besoin de moderniser votre infrastructure réseau, de sécuriser vos postes de travail ou de concevoir une application web sur mesure, je serais ravi d'échanger avec vous.",
    primary: "Me contacter →",
    secondary: "Voir mes réalisations →",
  },
};

export const skills = [
  {
    category: "Systèmes",
    icon: "server",
    description: "Administration de serveurs Windows & Linux, virtualisation et haute disponibilité par clusters.",
    items: ["Windows Server", "Ubuntu / Linux", "Virtualisation", "Clusters haute disponibilité"],
  },
  {
    category: "Réseaux",
    icon: "network",
    description: "Conception d'infrastructures LAN résilientes, adressage IP, routage et diagnostic rapide.",
    items: ["Réseaux LAN", "Adressage IP", "Cisco Packet Tracer", "Dépannage réseau"],
  },
  {
    category: "Sécurité",
    icon: "shield",
    description: "Protection des données d'entreprise, politiques d'accès, sauvegardes et continuité de service.",
    items: ["Sécurisation des systèmes", "Gestion des accès", "Sauvegardes", "Continuité de service"],
  },
  {
    category: "Développement web",
    icon: "code",
    description: "Création d'applications web robustes, interfaces ergonomiques et modélisation de bases de données.",
    items: ["HTML / CSS", "JavaScript", "Applications web", "Bases de données"],
  },
  {
    category: "Support & outils",
    icon: "wrench",
    description: "Assistance technique aux utilisateurs, maintenance du matériel informatique et collaboration Git.",
    items: ["Support informatique", "Matériel informatique", "Outils open source", "Git"],
  },
];

export const projectPage = {
  back: "Tous les projets",
  readMore: "Voir le projet en détail",
  live: "Voir le projet en ligne",
  liveShort: "Accéder au site",
  liveBadge: "En ligne",
  eyebrow: "Étude de cas",
  technologies: "Technologies & outils",
  contactTitle: "Un besoin similaire ? Parlons-en.",
  contactText: "Vous avez un projet de réseau, de sécurité ou d'application web ? Échangeons sur votre besoin.",
  contact: "Discuter sur WhatsApp",
  email: "M'écrire par email",
  next: "Découvrir un autre projet",
  unavailableText: "Ce projet n'est pas disponible. Retrouvez les autres réalisations du portfolio.",
};

export const languages = [
  { name: "Français", level: "Langue maternelle", value: 100 },
  { name: "Swahili", level: "Courant", value: 85 },
  { name: "Anglais", level: "Débutant", value: 30 },
];

// À remplacer par de vrais témoignages.
export const testimonials = [
  { quote: "Landry est rigoureux et toujours prêt à apprendre. Il a su s'intégrer rapidement à l'équipe et prendre en charge le support aux utilisateurs.", name: "Jean Ngoy", role: "Encadreur, XSECURITY" },
  { quote: "Un technicien sérieux qui comprend à la fois le réseau et le développement. Il explique clairement ses choix.", name: "Don Moen", role: "Collègue, XSECURITY" },
  { quote: "Travail soigné, délais respectés et une vraie envie de bien faire. Je le recommande.", name: "Leader Bokassa", role: "Client" },
];


// --- Section Hero (page d'accueil) ---
export const heroSection = {
  badge: "Administrateur Systèmes · Développeur Web",
  titleLead: "Infrastructures fiables,",
  titleAccent: "code créé pour durer.",
  description: "J'aide les organisations à sécuriser leurs systèmes, gérer leurs parcs informatiques et déployer des applications web robustes.",
  ctaPrimary: "Voir mes projets",
  ctaSecondary: "Télécharger mon CV",
  ctaContact: "Me contacter",
};

// --- Section Marques (BrandsMarquee) ---
export const brandsSection = {
  eyebrow: "Environnements d'intervention",
  titleLead: "Ils m'ont fait",
  titleAccent: "confiance.",
};
