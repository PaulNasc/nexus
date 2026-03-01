-- Note videos bucket for cross-machine sync
insert into storage.buckets (id, name, public)
values ('note-videos', 'note-videos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can read note videos" on storage.objects;
create policy "Users can read note videos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'note-videos'
  and (
    (split_part(name, '/', 1) = 'user' and split_part(name, '/', 2) = auth.uid()::text)
    or (
      split_part(name, '/', 1) = 'org'
      and split_part(name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
      and public.is_org_member((split_part(name, '/', 2))::uuid, auth.uid())
    )
  )
);

drop policy if exists "Users can insert note videos" on storage.objects;
create policy "Users can insert note videos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'note-videos'
  and (
    (split_part(name, '/', 1) = 'user' and split_part(name, '/', 2) = auth.uid()::text)
    or (
      split_part(name, '/', 1) = 'org'
      and split_part(name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
      and public.is_org_member((split_part(name, '/', 2))::uuid, auth.uid())
    )
  )
);

drop policy if exists "Users can update note videos" on storage.objects;
create policy "Users can update note videos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'note-videos'
  and (
    (split_part(name, '/', 1) = 'user' and split_part(name, '/', 2) = auth.uid()::text)
    or (
      split_part(name, '/', 1) = 'org'
      and split_part(name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
      and public.is_org_member((split_part(name, '/', 2))::uuid, auth.uid())
    )
  )
)
with check (
  bucket_id = 'note-videos'
  and (
    (split_part(name, '/', 1) = 'user' and split_part(name, '/', 2) = auth.uid()::text)
    or (
      split_part(name, '/', 1) = 'org'
      and split_part(name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
      and public.is_org_member((split_part(name, '/', 2))::uuid, auth.uid())
    )
  )
);

drop policy if exists "Users can delete note videos" on storage.objects;
create policy "Users can delete note videos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'note-videos'
  and (
    (split_part(name, '/', 1) = 'user' and split_part(name, '/', 2) = auth.uid()::text)
    or (
      split_part(name, '/', 1) = 'org'
      and split_part(name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
      and public.is_org_member((split_part(name, '/', 2))::uuid, auth.uid())
    )
  )
);
