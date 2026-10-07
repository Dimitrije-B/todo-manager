-- ToDo-Manager: Tabelle für den Sync zwischen Geräten
-- Im Supabase-Dashboard unter "SQL Editor" einfügen und ausführen. Mehrfaches Ausführen schadet nicht.

create table if not exists public.todo_entities (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  kind       text        not null check (kind in ('area', 'task', 'status', 'settings')),
  payload    jsonb       not null,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  synced_at  timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create index if not exists todo_entities_user_synced on public.todo_entities (user_id, synced_at);

-- synced_at setzt immer der Server. So verpasst kein Gerät eine Änderung, auch wenn seine Uhr falsch geht.
create or replace function public.todo_entities_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists todo_entities_touch on public.todo_entities;
create trigger todo_entities_touch
  before insert or update on public.todo_entities
  for each row execute function public.todo_entities_touch();

-- Jede Person sieht und ändert nur ihre eigenen Zeilen
alter table public.todo_entities enable row level security;

drop policy if exists "todo: eigene Zeilen lesen" on public.todo_entities;
create policy "todo: eigene Zeilen lesen" on public.todo_entities
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "todo: eigene Zeilen anlegen" on public.todo_entities;
create policy "todo: eigene Zeilen anlegen" on public.todo_entities
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "todo: eigene Zeilen ändern" on public.todo_entities;
create policy "todo: eigene Zeilen ändern" on public.todo_entities
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "todo: eigene Zeilen löschen" on public.todo_entities;
create policy "todo: eigene Zeilen löschen" on public.todo_entities
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.todo_entities to authenticated;
revoke all on public.todo_entities from anon;
