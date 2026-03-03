-- Create private bucket for classroom shared files
insert into storage.buckets (id, name, public)
values ('shared-files', 'shared-files', false)
on conflict (id) do nothing;

-- Allow classroom members (teacher + joined students) to read files in their classroom folder
create policy "Classroom members can read shared files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'shared-files'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.can_access_classroom(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- Allow only classroom teachers to upload files into their classroom folder
create policy "Classroom teachers can upload shared files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'shared-files'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_classroom_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- Allow only classroom teachers to update files in their classroom folder
create policy "Classroom teachers can update shared files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'shared-files'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_classroom_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'shared-files'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_classroom_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- Allow only classroom teachers to delete files in their classroom folder
create policy "Classroom teachers can delete shared files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'shared-files'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_classroom_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
);