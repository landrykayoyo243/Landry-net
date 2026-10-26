import postgres from "postgres";

const uri =
  "postgresql://postgres.zssesfkvdrvkemhpfdkn:rTMKY0z5jy7owJ9e@aws-0-eu-north-1.pooler.supabase.com:5432/postgres";
const sql = postgres(uri, { ssl: "require", max: 1 });

const fixes = [
  // ── app_settings : accès complet aux admins ──────────────────
  `DROP POLICY IF EXISTS "Admins select app_settings" ON public.app_settings`,
  `CREATE POLICY "Admins select app_settings" ON public.app_settings
     FOR SELECT TO authenticated
     USING (public.has_role(auth.uid(), 'admin'))`,

  `DROP POLICY IF EXISTS "Public reads app_settings" ON public.app_settings`,
  `CREATE POLICY "Public reads app_settings" ON public.app_settings
     FOR SELECT TO anon USING (true)`,

  `DROP POLICY IF EXISTS "Admins insert app_settings" ON public.app_settings`,
  `CREATE POLICY "Admins insert app_settings" ON public.app_settings
     FOR INSERT TO authenticated
     WITH CHECK (public.has_role(auth.uid(), 'admin'))`,

  `DROP POLICY IF EXISTS "Admins update app_settings" ON public.app_settings`,
  `CREATE POLICY "Admins update app_settings" ON public.app_settings
     FOR UPDATE TO authenticated
     USING (public.has_role(auth.uid(), 'admin'))
     WITH CHECK (public.has_role(auth.uid(), 'admin'))`,

  `DROP POLICY IF EXISTS "Admins delete app_settings" ON public.app_settings`,
  `CREATE POLICY "Admins delete app_settings" ON public.app_settings
     FOR DELETE TO authenticated
     USING (public.has_role(auth.uid(), 'admin'))`,

  // ── Grants manquants ────────────────────────────────────────
  `GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated`,

  // ── user_roles : admin peut tout gérer ─────────────────────
  `DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles`,
  `CREATE POLICY "Admins manage user_roles" ON public.user_roles
     FOR ALL TO authenticated
     USING (public.has_role(auth.uid(), 'admin'))`,

  // ── login_attempts : service_role only (pas de changement) ──
];

for (const q of fixes) {
  try {
    await sql.unsafe(q);
    console.log("✅ " + q.trim().split("\n")[0].slice(0, 70));
  } catch (e) {
    console.log("❌ " + q.trim().split("\n")[0].slice(0, 70) + " -> " + e.message);
  }
}

await sql.end();
console.log("\n🎉 Policies RLS mises à jour !");
