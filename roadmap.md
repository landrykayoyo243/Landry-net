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

---

## Prochaine étape : Gestion et publication en mode Brouillon (Prévu pour demain)

### Objectifs
Mettre en place un système robuste de cycle de vie des contenus permettant à Landry de préparer ses publications (projets, parcours, certifications, immersions) sous forme de brouillons confidentiels avant de les rendre publics en un clic.

### Tâches planifiées
- [ ] **Gestion des Projets en mode Brouillon** :
  - Vérifier et harmoniser le champ `status: 'draft' | 'published'` sur la table `projects`.
  - Assurer l'étanchéité des requêtes publiques : les visiteurs et moteurs de recherche ne doivent voir que les projets au statut `published`.
  - Permettre un mode aperçu privé pour l'administrateur permettant de visualiser le rendu exact du projet brouillon avant mise en ligne.
- [ ] **Extension du mode Brouillon aux autres contenus** :
  - Expériences professionnelles & formations (`experiences.published`).
  - Certifications (`certifications.published`).
  - Témoignages & immersions terrain (`immersion.published`).
  - Organisations partenaires (`organizations.published`).
- [ ] **Interface d'administration (UI/UX)** :
  - Badges visuels distincts dans les listes : `Publié` (vert) vs `Brouillon` (ambre/gris).
  - Filtre rapide par statut dans les tableaux de bord administratifs (Tous / Publiés / Brouillons).
  - Bascule (Switch/Toggle) instantanée de statut avec toast de confirmation.
  - Sauvegarde automatique transparente lors de la rédaction d'un brouillon.
- [ ] **Journal d'audit & Traçabilité** :
  - Enregistrer dans le journal d'audit toute action de publication ou de dépublication avec horodatage et métadonnées.
- [ ] **Validation & Tests** :
  - Tests unitaires et d'intégration validant le non-affichage des brouillons côté public et leur accessibilité côté admin.