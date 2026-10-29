# Feuille de route (Roadmap) — Portfolio Landry Net

## Fonctionnalités réalisées (Aujourd'hui)
- [x] **Module Assistant IA (Google Gemini)** :
  - Passerelle serveur unique avec repli automatique (fallback 503/429 pour haute disponibilité).
  - Coffre-fort de secrets chiffrés en symétrique AES-256-GCM avec clé maître sécurisée (`APP_ENCRYPTION_KEY`).
  - Journal d'audit immuable (`audit_log`) avec masquage automatique des adresses IP.
  - Gestion dynamique des compétences (skills) en base Supabase (`ai_skills`, `ai_skill_versions`) avec versioning et restauration.
  - Chat IA responsive (adapté smartphone 360px avec capsule de saisie sans scrollbar disgracieuse).
  - Rédaction d'études de cas techniques et suggestions d'illustrations, sans émoji, professionnelle et claire.
  - Système d'alertes instantanées Telegram lors de la réception d'un message de contact.

- [x] **Publication intelligente & Mode Brouillon via l'Assistant IA** :
  - **Règle d'or projets** : L'assistant ne peut jamais publier un projet directement. Tout projet issu de l'IA est forcé en `status: 'draft'` côté serveur.
  - `assistant-actions.server.ts` : module serveur d'actions (créer brouillon projet, créer expérience, créer certification).
  - `sectionsToBlocks` & `stringToRichDoc` : conversion parfaite des sections `[SECTION:...]` vers les blocs TipTap compatibles avec l'éditeur Word (RichEditor).
  - Détection automatique des blocs `action:create_project_draft` dans les réponses IA et exécution côté serveur.
  - Expériences et certifications : publication directe autorisée.
  - Route `/api/admin/assistant` enrichie avec `directAction` pour exécution sans génération IA.
  - **Widget chat** : badge **Brouillon** (ambre) + bouton « Ouvrir dans l'éditeur Word » après création ; badge **Publié** (vert) pour expériences/certifications.
  - Bouton rapide « Enregistrer comme Brouillon de Projet » si des sections `[SECTION:]` sont détectées dans la réponse.
  - Skills IA mis à jour avec la règle de brouillon strict inscrite dans les instructions.
  - Audit `project.create_draft_ai` enregistré à chaque création via l'assistant.
  - 39/39 tests Vitest valides.

---

## Prochaine étape : Badges et filtres dans les listes admin

### Objectifs
Compléter le cycle de vie des contenus avec des indicateurs visuels clairs dans les panneaux d'administration.

### Tâches planifiées
- [ ] **Interface d'administration (UI/UX) projets** :
  - Filtre rapide par statut dans le tableau de bord projets (Tous / Publiés / Brouillons).
  - Sauvegarde automatique transparente lors de la rédaction d'un brouillon.
- [ ] **Extension du mode Brouillon aux autres contenus** :
  - Expériences professionnelles & formations (`experiences.published`).
  - Certifications (`certifications.published`).
  - Toggle rapide dans les listes admin pour publier/dépublier en un clic.
- [ ] **Journal d'audit & Traçabilité** :
  - Enregistrer dans le journal d'audit toute action de publication ou de dépublication avec horodatage et métadonnées.
- [ ] **Validation & Tests** :
  - Tests unitaires et d'intégration validant le non-affichage des brouillons côté public et leur accessibilité côté admin.