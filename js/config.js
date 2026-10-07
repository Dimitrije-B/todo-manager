/* Sync-Einstellungen
   Leer lassen = alles bleibt lokal im Browser.
   Für Sync zwischen Desktop und Handy: Supabase-Projekt anlegen, supabase/schema.sql ausführen
   und hier die Project URL und den anon/publishable Key eintragen (Supabase → Project Settings → API).
   Der anon-Key darf öffentlich sein, die Zeilen sind per Row Level Security pro Nutzer geschützt.
   Den service_role-/secret-Key NIEMALS hier eintragen. */
window.TODO_CONFIG = {
  supabaseUrl: '',      // z. B. 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: '',  // z. B. 'eyJhbGciOi…' oder 'sb_publishable_…'
  table: 'todo_entities'
};
