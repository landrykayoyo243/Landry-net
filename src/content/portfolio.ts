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
  { to: "/projets", label: "Projets" },
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

// Contenu de la page dédiée /a-propos.
export const aboutPage = {
  back: "Retour à l'accueil",
  readStory: "Lire mon histoire",
  eyebrow: "Mon histoire · Ma vision",
  title: "Derrière les réseaux et le code, une exigence de fiabilité.",
  intro:
    "Administrateur systèmes & réseaux et développeur web à Lubumbashi — j'interviens de bout en bout pour concevoir des architectures résilientes et des outils numériques immédiatement utiles.",
  storyTitle: "Mon parcours",
  storySubtitle: "Des bancs de l'Université Don Bosco aux interventions critiques chez XSECURITY, l'INPP et la CNSS.",
  chapters: [
    {
      number: "01",
      tag: "Vocation & Rigueur académique",
      title: "Les fondations à l'Université Don Bosco",
      text: "Diplômé en Administration des Systèmes et Réseaux à l'Université Don Bosco de Lubumbashi, j'ai forgé mes bases autour de principes stricts : la haute disponibilité par cluster, la documentation claire et l'analyse rigoureuse du besoin.",
    },
    {
      number: "02",
      tag: "Épreuve du terrain critique",
      title: "L'apprentissage opérationnel : INPP & CNSS",
      text: "Mes immersions au sein de l'INPP (Institut National de Préparation Professionnelle) et de la CNSS (Caisse Nationale de Sécurité Sociale) m'ont confronté aux réalités du terrain : infrastructures sensibles, maintenance critique et continuité de service.",
    },
    {
      number: "03",
      tag: "Pratique en production",
      title: "XSECURITY & Le développement web utile",
      text: "Aujourd'hui membre de l'équipe technique de XSECURITY à Lubumbashi, j'accompagne les entreprises locales dans la sécurisation de leurs réseaux, l'administration de leurs serveurs et la création d'applications utiles.",
    },
    {
      number: "04",
      tag: "Engagement & Vision",
      title: "Construire des outils qui durent",
      text: "En République Démocratique du Congo, les défis d'infrastructure exigent du pragmatisme : des réseaux tolérants aux pannes, des données protégées et des applications rapides mais robustes.",
    },
  ],
  story: [
    "Administrateur systèmes & réseaux et développeur web à Lubumbashi, j'interviens au cœur des infrastructures numériques pour garantir leur continuité, leur sécurité et leur efficacité.",
    "Diplômé en administration des systèmes et réseaux de l'Université Don Bosco de Lubumbashi, j'ai forgé mes compétences autour des architectures résilientes et de la haute disponibilité.",
    "Aujourd'hui membre de l'équipe technique de XSECURITY, j'accompagne les entreprises dans l'installation de réseaux fiables, la sécurisation de leurs données et la création d'applications utiles.",
    "Mon engagement est simple : transformer la complexité technique en outils stables, clairs et immédiatement utiles à votre organisation.",
  ],
  valuesTitle: "Ce qui guide chacune de mes missions",
  valuesIntro:
    "Quatre principes non négociables, du sertissage d'un câble RJ45 jusqu'au déploiement d'une application web en ligne.",
  values: [
    {
      title: "Fiabilité absolue",
      text: "Un système qui tombe, c'est une activité qui s'arrête et des pertes financières. Je conçois des architectures conçues pour durer et tolérer les pannes sans interruption de service.",
    },
    {
      title: "Sécurité native",
      text: "Les données de l'entreprise sont son bien le plus précieux. J'intègre le contrôle d'accès strict, la redondance et les sauvegardes dès le premier jour, jamais après coup.",
    },
    {
      title: "Clarté & Pédagogie",
      text: "Un bon travail technique est un travail documenté et compréhensible. J'explique chaque choix en langage simple pour que le client reste maître de ses outils.",
    },
    {
      title: "Exigence continue",
      text: "Les technologies et menaces évoluent rapidement. Veille quotidienne, certifications Cisco et perfectionnement constant sur le web font partie de ma routine.",
    },
  ],
  milestonesTitle: "Les étapes clés de mon parcours",
  ctaTitle: "Écrivons ensemble le prochain chapitre",
  ctaText:
    "Un réseau à déployer, un serveur à sécuriser ou une application web à développer ? Discutons de vos enjeux techniques et trouvons la solution la plus adaptée.",
  cta: "Me contacter directement",
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
