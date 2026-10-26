-- ==============================================================================
-- 1. SCHÉMA DU PORTFOLIO LANDRY NET
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  tag text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  image_url text,
  image_alt text NOT NULL DEFAULT '',
  technologies text[] NOT NULL DEFAULT '{}',
  external_url text,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  content jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published projects" ON public.projects;
CREATE POLICY "Public reads published projects" ON public.projects FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert projects" ON public.projects;
CREATE POLICY "Admins insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update projects" ON public.projects;
CREATE POLICY "Admins update projects" ON public.projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete projects" ON public.projects;
CREATE POLICY "Admins delete projects" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'emploi' CHECK (kind IN ('emploi','stage','formation')),
  title text NOT NULL,
  organization text NOT NULL DEFAULT '',
  period text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.experiences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiences TO authenticated;
GRANT ALL ON public.experiences TO service_role;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published experiences" ON public.experiences;
CREATE POLICY "Public reads published experiences" ON public.experiences FOR SELECT TO anon, authenticated
  USING (published OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert experiences" ON public.experiences;
CREATE POLICY "Admins insert experiences" ON public.experiences FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update experiences" ON public.experiences;
CREATE POLICY "Admins update experiences" ON public.experiences FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete experiences" ON public.experiences;
CREATE POLICY "Admins delete experiences" ON public.experiences FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS experiences_updated_at ON public.experiences;
CREATE TRIGGER experiences_updated_at BEFORE UPDATE ON public.experiences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  issuer text NOT NULL DEFAULT '',
  date_label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.certifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications TO authenticated;
GRANT ALL ON public.certifications TO service_role;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published certifications" ON public.certifications;
CREATE POLICY "Public reads published certifications" ON public.certifications FOR SELECT TO anon, authenticated
  USING (published OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert certifications" ON public.certifications;
CREATE POLICY "Admins insert certifications" ON public.certifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update certifications" ON public.certifications;
CREATE POLICY "Admins update certifications" ON public.certifications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete certifications" ON public.certifications;
CREATE POLICY "Admins delete certifications" ON public.certifications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS certifications_updated_at ON public.certifications;
CREATE TRIGGER certifications_updated_at BEFORE UPDATE ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads app_settings" ON public.app_settings;
CREATE POLICY "Public reads app_settings" ON public.app_settings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Admins select app_settings" ON public.app_settings;
CREATE POLICY "Admins select app_settings" ON public.app_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert app_settings" ON public.app_settings;
CREATE POLICY "Admins insert app_settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update app_settings" ON public.app_settings;
CREATE POLICY "Admins update app_settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete app_settings" ON public.app_settings;
CREATE POLICY "Admins delete app_settings" ON public.app_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));


CREATE TABLE IF NOT EXISTS public.login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_key_time ON public.login_attempts (key_hash, created_at);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Storage pour les images de projet
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public reads project images" ON storage.objects;
CREATE POLICY "Public reads project images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Admins upload project images" ON storage.objects;
CREATE POLICY "Admins upload project images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin') AND lower(storage.extension(name)) IN ('png','jpg','jpeg','webp'));

DROP POLICY IF EXISTS "Admins update project images" ON storage.objects;
CREATE POLICY "Admins update project images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete project images" ON storage.objects;
CREATE POLICY "Admins delete project images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));

-- ==============================================================================
-- 2. CONTENU INITIAL (PROJETS, PARCOURS, CERTIFICATIONS)
-- ==============================================================================

INSERT INTO public.projects (slug,title,tag,intro,summary,image_url,image_alt,technologies,external_url,featured,sort_order,status,content) 
VALUES 
('cluster-haute-disponibilite','Infrastructure haute disponibilité par cluster étendu','Projet de fin d''études','Ce projet de fin d''études porte sur la continuité des services informatiques. Le principe d''un cluster étendu est de répartir les ressources sur plusieurs sites pour ne pas dépendre d''un seul serveur ou d''un seul emplacement.','Une panne de serveur peut interrompre tous les services d''une organisation pendant des heures.','/og-landry-net.jpg','Tableau de bord de supervision de serveurs sur un ordinateur portable',ARRAY['Cluster','Linux','Virtualisation','Haute disponibilité']::text[],NULL,true,0,'published','[]'::jsonb),
('paylix','PayLix — gestion des frais scolaires','En cours de développement','PayLix est une plateforme en cours de développement pour la gestion des frais scolaires. Elle vise à remplacer un suivi dispersé sur papier par une vue structurée des paiements, au service des écoles, des parents et de l''administration.','Les écoles publiques et privées suivent encore souvent les paiements sur papier, avec erreurs et retards.','/og-landry-net.jpg','Application web affichée sur un ordinateur et un smartphone',ARRAY['Développement web','Base de données','Tableaux de bord']::text[],'https://paylix-gamma.vercel.app/',true,1,'published','[]'::jsonb),
('marketnet','MarketNet — boutiques en ligne avec commandes sur WhatsApp','Projet personnel','Une plateforme où le commerçant crée sa boutique en quelques minutes depuis son smartphone et reçoit des commandes structurées sur WhatsApp.','De nombreux commerçants de RDC et d''Afrique francophone vendent via leurs statuts WhatsApp et doivent répéter les prix en message privé, envoyer des dizaines de photos et gérer des commandes floues (taille, couleur, adresse).','/og-landry-net.jpg','Maquette d''un smartphone affichant une boutique en ligne',ARRAY['Développement web','Authentification','Intégration WhatsApp','Mobile-first']::text[],'https://appmarketnet.vercel.app/',true,2,'published','[]'::jsonb),
('reseaux-pme','Mise en place de réseaux pour PME','XSECURITY','Au sein de XSECURITY, je participe à la mise en place de réseaux pour de petites entreprises. L''objectif est de permettre aux équipes de travailler avec une connexion stable et de partager leurs ressources sur un réseau organisé.','De petites entreprises avaient besoin d''un réseau stable pour travailler et partager leurs ressources.','/og-landry-net.jpg','Baie de brassage avec câbles réseau bleus organisés',ARRAY['LAN','Câblage','Équipements Cisco','Wi-Fi']::text[],NULL,true,3,'published','[]'::jsonb),
('securisation-systemes','Sécurisation des systèmes clients','XSECURITY','Cette activité menée au sein de XSECURITY concerne la protection des postes et des données d''entreprise. Elle associe les règles d''accès, les protections des systèmes et les sauvegardes pour réduire l''exposition aux risques.','Des postes et données d''entreprise étaient exposés faute de règles de sécurité claires.','/og-landry-net.jpg','Pare-feu réseau avec un cadenas lumineux symbolisant la sécurité',ARRAY['Pare-feu','Contrôle d''accès','Sauvegardes']::text[],NULL,false,4,'published','[]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.experiences (kind,period,title,organization,description,sort_order,published) 
VALUES 
('emploi','Actuellement','Membre de l''équipe technique','XSECURITY','Solutions informatiques pour PME : réseaux, sécurité, développement d''applications.',0,true),
('formation','2026','Licence en administration des systèmes et réseaux','Université Don Bosco de Lubumbashi','Mémoire : infrastructure de services haute disponibilité par cluster étendu.',1,true),
('stage','Stage · 2 mois','Stagiaire académique','INPP — Institut National de Préparation Professionnelle','Support informatique, maintenance matérielle et logicielle.',2,true);
-- ==============================================================================
-- 5. MESSAGES DE CONTACT
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied')),
  replied_at timestamptz,
  reply_notes text
);

GRANT ALL ON public.contact_messages TO service_role;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read contact_messages" ON public.contact_messages;
CREATE POLICY "Admins read contact_messages" ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update contact_messages" ON public.contact_messages;
CREATE POLICY "Admins update contact_messages" ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete contact_messages" ON public.contact_messages;
CREATE POLICY "Admins delete contact_messages" ON public.contact_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

