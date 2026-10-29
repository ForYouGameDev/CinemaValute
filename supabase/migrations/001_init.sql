-- CineVault schema. Run in Supabase SQL editor. All tables have RLS enabled.
create table admin_roles (user_id uuid primary key references auth.users on delete cascade);
create or replace function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from admin_roles where user_id = auth.uid()) $$;
create table profiles (id uuid primary key references auth.users on delete cascade, display_name text, avatar_url text, created_at timestamptz default now());
create table titles (id uuid primary key default gen_random_uuid(), tmdb_id int not null, media_type text check (media_type in ('movie','tv')), title text not null, published boolean default false, featured boolean default false, age_rating text, language text, created_at timestamptz default now(), unique(tmdb_id, media_type));
create table seasons (id uuid primary key default gen_random_uuid(), title_id uuid references titles on delete cascade, season_number int not null);
create table episodes (id uuid primary key default gen_random_uuid(), season_id uuid references seasons on delete cascade, episode_number int not null, name text);
create table playback_sources (id uuid primary key default gen_random_uuid(), title_id uuid references titles on delete cascade, episode_id uuid references episodes, source_type text not null check (source_type in ('youtube','public_domain','licensed_player','provider_link')), url text not null check (url ~ '^https://'), label text, access text default 'free' check (access in ('free','subscription','rent','buy')), enabled boolean default true);
create table collections (id uuid primary key default gen_random_uuid(), name text not null, tmdb_ids int[] default '{}', published boolean default false);
create table favorites (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, tmdb_id int not null, media_type text not null, title text, poster_path text, created_at timestamptz default now(), unique(user_id,tmdb_id,media_type));
create table watchlist (like favorites including all);
alter table watchlist add foreign key (user_id) references auth.users on delete cascade;
create table watch_history (user_id uuid not null default auth.uid() references auth.users on delete cascade, tmdb_id int not null, media_type text not null, progress_seconds int default 0, updated_at timestamptz default now(), primary key(user_id,tmdb_id,media_type));
create table link_clicks (id bigserial primary key, source_id uuid references playback_sources on delete cascade, user_id uuid, created_at timestamptz default now());
create table reports (id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid(), tmdb_id int, message text not null check (length(message) < 1000), resolved boolean default false, created_at timestamptz default now());
create table audit_log (id bigserial primary key, admin_id uuid, action text, detail jsonb, created_at timestamptz default now());
do $$ declare t text; begin foreach t in array array['admin_roles','profiles','titles','seasons','episodes','playback_sources','collections','favorites','watchlist','watch_history','link_clicks','reports','audit_log'] loop execute format('alter table %I enable row level security', t); end loop; end $$;
do $$ declare t text; begin foreach t in array array['favorites','watchlist','watch_history'] loop execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t); end loop; end $$;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "read published" on titles for select using (published or is_admin());
create policy "admin titles" on titles for all using (is_admin()) with check (is_admin());
create policy "read sources" on playback_sources for select using (enabled and exists(select 1 from titles t where t.id = title_id and t.published) or is_admin());
create policy "admin sources" on playback_sources for all using (is_admin()) with check (is_admin());
create policy "read seasons" on seasons for select using (true); create policy "admin seasons" on seasons for all using (is_admin()) with check (is_admin());
create policy "read episodes" on episodes for select using (true); create policy "admin episodes" on episodes for all using (is_admin()) with check (is_admin());
create policy "read collections" on collections for select using (published or is_admin()); create policy "admin collections" on collections for all using (is_admin()) with check (is_admin());
create policy "insert click" on link_clicks for insert with check (true); create policy "admin clicks" on link_clicks for select using (is_admin());
create policy "insert report" on reports for insert with check (user_id = auth.uid()); create policy "admin reports" on reports for all using (is_admin()) with check (is_admin());
create policy "admin audit" on audit_log for select using (is_admin());
-- admin_roles has NO insert/update policy: add the owner manually (see README).
create function admin_stats() returns json language sql security definer set search_path=public as
$$ select case when is_admin() then json_build_object('users',(select count(*) from auth.users),'titles',(select count(*) from titles),'favorites',(select count(*) from favorites),'clicks',(select count(*) from link_clicks)) end $$;
create function log_admin() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into audit_log(admin_id,action,detail) values (auth.uid(), tg_op||' '||tg_table_name, to_jsonb(coalesce(new,old))); return coalesce(new,old); end $$;
create trigger audit_titles after insert or update or delete on titles for each row when (auth.uid() is not null) execute function log_admin();
create trigger audit_sources after insert or update or delete on playback_sources for each row when (auth.uid() is not null) execute function log_admin();
