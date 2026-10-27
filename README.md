# Landry Net

Portfolio personnel et site vitrine de Landry Kayoyo, centré sur l'administration systèmes & réseaux, la cybersécurité, la haute disponibilité et le développement web.

Le projet est construit avec React, TypeScript, TanStack Router et Vite. Il intègre un espace d'administration pour gérer les projets, expériences, formations, médias et contenus de manière simple.

## Présentation

Landry Net est un site portfolio destiné à présenter :

- les compétences techniques et le parcours professionnel ;
- les projets réalisés et les études de cas ;
- les réalisations en réseaux, sécurité et infrastructures ;
- les services offerts à des clients ou partenaires ;
- un formulaire de contact relié à un système d'email et à une base de données.

## Fonctionnalités principales

- Portfolio moderne et responsive
- Page d'accueil orientée marketing et repositionnement professionnel
- Pages “À propos”, “Projets”, “Contact”
- Gestion de contenus via une interface d'administration
- Stockage d'images via Cloudinary
- Base de données gérée avec Supabase / Postgres
- Formulaire de contact avec envoi d'email via SMTP
- SEO et métadonnées Open Graph
- Tests unitaires avec Vitest

## Stack technique

- React 19
- TypeScript
- Vite
- TanStack Router / Start
- Tailwind CSS
- Supabase
- Drizzle ORM
- Nodemailer
- Cloudinary
- Vitest

## Prérequis

Avant de lancer le projet, assurez-vous d'avoir installé :

- Node.js 20+
- npm ou bun
- Un compte Supabase
- Un accès SMTP (ex. Gmail avec mot de passe d'application)
- Un compte Cloudinary (si vous utilisez les médias)

## Installation

1. Cloner le dépôt :

```bash
git clone https://github.com/landrykayoyo243/Landry-net.git
cd Landry-net
```

2. Installer les dépendances :

```bash
npm install
```

3. Copier le fichier d'environnement :

```bash
cp .env.example .env
```

4. Remplir les variables dans le fichier `.env` avec vos valeurs réelles.

## Variables d'environnement

Le fichier `.env.example` contient les principaux paramètres nécessaires.

### Exemple de variables

```env
VITE_SITE_URL="https://votre-domaine.com"
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_PROJECT_ID="..."

VITE_SUPABASE_URL="https://xxxxx.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_PROJECT_ID="..."

ADMIN_EMAIL="votre.email@gmail.com"
ADMIN_PASSWORD="MotDePasseAdmin!Fort123"

CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
CLOUDINARY_FOLDER="Landry_Media"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="votre.email@gmail.com"
SMTP_PASSWORD="xxxx xxxx xxxx xxxx"
SMTP_FROM="votre.email@gmail.com"
CONTACT_EMAIL="votre.email@gmail.com"
```

### Notes importantes

- Ne jamais committer le fichier `.env` dans Git.
- Pour Gmail, utilisez un mot de passe d’application, pas votre mot de passe principal.
- La variable `VITE_SITE_URL` est importante pour les URLs SEO et Open Graph.

## Base de données

Le projet utilise Supabase/PostgreSQL ainsi que Drizzle.

### Commandes utiles

```bash
npm run db:migrate
npm run db:admin
npm run db:projects
npm run setup
```

### Description

- `db:migrate` : applique les migrations de base de données
- `db:admin` : configure le compte administrateur
- `db:projects` : alimente les projets de démonstration
- `setup` : exécute les migrations, la configuration admin et l’initialisation des contenus

## Lancer le projet en local

```bash
npm run dev
```

Ensuite ouvrez l’URL affichée dans le terminal, généralement :

```text
http://localhost:5173
```

## Vérification / build

### Build de production

```bash
npm run build
```

### Prévisualisation du build

```bash
npm run preview
```

## Tests et qualité

```bash
npm run test
npm run lint
```

## Structure du projet

```text
Landry-net/
├── .env.example
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── drizzle/
│   ├── migrations/
│   └── schema.ts
├── public/
├── scripts/
├── src/
│   ├── components/
│   ├── content/
│   ├── hooks/
│   ├── integrations/
│   ├── lib/
│   ├── routes/
│   ├── styles.css
│   ├── test/
│   └── ...
├── supabase/
├── run-migrations.mjs
├── vercel.json
└── ...
```

## Administration

Le projet contient un espace admin pour gérer les contenus du portfolio.

En fonction de la configuration, l’URL d’admin est souvent accessible via la route dédiée du projet, ou via l’interface de gestion mise en place dans l’application.

## Déploiement

Le projet est compatible avec un déploiement sur Vercel.

Étapes recommandées :

1. Pousser le dépôt GitHub
2. Connecter le repo à Vercel
3. Ajouter les variables d’environnement depuis `.env.example`
4. Déployer le projet

Vérifiez aussi les paramètres de domaine et les variables `VITE_SITE_URL`, `SUPABASE_*`, `SMTP_*` et `CLOUDINARY_*` dans l’environnement de production.

## Formulaire de contact

Le formulaire de contact envoie :

- les informations du message dans une table Supabase ;
- un email SMTP au destinataire configuré ;
- un retour utilisateur confirmant le succès ou l’échec.

## Contribution

Les contributions sont les bienvenues. Pour proposer une amélioration :

1. Créez une branche
2. Modifiez le code
3. Vérifiez les tests et le build
4. Ouvrez une Pull Request

## Licence

Aucune licence spécifique n’a été définie dans ce dépôt pour le moment.

## Contact

Pour toute question technique ou demande de collaboration :

- Site : https://landrynet.vercel.app
- GitHub : https://github.com/landrykayoyo243/Landry-net

---

Ce README a été réécrit pour être plus clair, plus complet et plus facile à comprendre pour un nouveau développeur ou un client qui souhaite lancer le projet localement.
