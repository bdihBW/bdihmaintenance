-- BDIH Maintenance Platform: evidence files (photos, PDFs) in the database.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- 1. Private storage bucket for the files themselves
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

-- 2. Who can upload / view files
drop policy if exists "bdih evidence read" on storage.objects;
create policy "bdih evidence read" on storage.objects for select to authenticated
  using (bucket_id = 'evidence');

drop policy if exists "bdih evidence upload" on storage.objects;
create policy "bdih evidence upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and name like 'ev/%');

drop policy if exists "bdih evidence upload public reports" on storage.objects;
create policy "bdih evidence upload public reports" on storage.objects for insert to anon
  with check (bucket_id = 'evidence' and name like 'ev/public/%');

drop policy if exists "bdih evidence replace" on storage.objects;
create policy "bdih evidence replace" on storage.objects for update to authenticated
  using (bucket_id = 'evidence') with check (bucket_id = 'evidence');
-- No delete policy: evidence is never deleted.

-- 3. A register of every file, so evidence can be queried and audited from the database
create table if not exists public.evidence_files (
  id          text primary key,              -- storage path, e.g. ev/f1abc-photo.jpg
  name        text not null,
  type        text,
  size        bigint,
  ref         text,                          -- the check / work order / request / asset it belongs to (when known)
  uploaded_by uuid default auth.uid(),
  uploaded_at timestamptz not null default now()
);
alter table public.evidence_files enable row level security;

drop policy if exists "bdih files read" on public.evidence_files;
create policy "bdih files read" on public.evidence_files for select to authenticated using (true);

drop policy if exists "bdih files add" on public.evidence_files;
create policy "bdih files add" on public.evidence_files for insert to authenticated with check (true);

drop policy if exists "bdih files add public" on public.evidence_files;
create policy "bdih files add public" on public.evidence_files for insert to anon with check (id like 'ev/public/%');

drop policy if exists "bdih files link" on public.evidence_files;
create policy "bdih files link" on public.evidence_files for update to authenticated using (true) with check (true);
