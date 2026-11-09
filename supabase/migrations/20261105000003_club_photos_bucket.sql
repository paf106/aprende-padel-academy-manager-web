-- Public bucket for club photos. Files live under "<organization_id>/", and only admins of that organization can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-photos', 'club-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy club_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'club-photos'
    and (storage.foldername(name))[1] = private.current_org()::text
    and private.is_admin()
  );
create policy club_photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'club-photos'
    and (storage.foldername(name))[1] = private.current_org()::text
    and private.is_admin()
  );
create policy club_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'club-photos'
    and (storage.foldername(name))[1] = private.current_org()::text
    and private.is_admin()
  );
