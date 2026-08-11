-- ============================================================================
--  Charakterbilder – Supabase Storage
--  Einspielen: Dashboard -> SQL Editor -> New query -> Run
--
--  Danach im Dashboard unter Storage -> characters alle Portraits hochladen –
--  unter ihren Original-Dateinamen aus dem Spiel, ohne Unterordner:
--    K01_TheTrapper_Portrait.png, S09_FengMin_Portrait.png, empty.png, ...
--
--  Welche Datei zu welchem Charakter gehört, steht als `file` in
--  assets/js/data.js; die Liste als Übersicht in supabase/bilder-dateinamen.txt.
-- ============================================================================

-- Öffentlicher Bucket: die App liest die Bilder ohne Login über
-- <SUPABASE_URL>/storage/v1/object/public/characters/killers/<id>.png
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'characters',
  'characters',
  true,
  2097152,                                            -- 2 MB pro Datei
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lesen darf jede:r (der Bucket ist ohnehin öffentlich).
drop policy if exists "characters_public_read" on storage.objects;
create policy "characters_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'characters');

-- Hochladen/Ersetzen/Löschen nur für angemeldete Benutzer.
-- (Der Upload über das Dashboard funktioniert auch ohne diese Policies.)
drop policy if exists "characters_auth_insert" on storage.objects;
create policy "characters_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'characters');

drop policy if exists "characters_auth_update" on storage.objects;
create policy "characters_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'characters')
  with check (bucket_id = 'characters');

drop policy if exists "characters_auth_delete" on storage.objects;
create policy "characters_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'characters');

-- ============================================================================
--  Ausrüstung: Items/Kräfte, Add-ons und Opfergaben
--
--  Die Dateien heißen nach der Spiel-ID mit .png, so wie Behaviour sie selbst
--  ablegt – z. B. Item_Camper_Flashlight.png, Addon_Flashlight_001.png,
--  EscapeCake.png. Welche ID zu welchem Teil gehört, steht in
--  assets/js/loadout.js. Solange ein Bucket leer ist, zeigt die App das
--  Namenskürzel statt des Bildes; hochladen kann man jederzeit nachträglich.
-- ============================================================================
do $$
declare
  bucket text;
begin
  foreach bucket in array array['items', 'powers', 'addons', 'offerings', 'classes'] loop
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (bucket, bucket, true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do update
      set public             = excluded.public,
          file_size_limit    = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

    execute format('drop policy if exists %I on storage.objects', bucket || '_public_read');
    execute format(
      'create policy %I on storage.objects for select to public using (bucket_id = %L)',
      bucket || '_public_read', bucket);

    execute format('drop policy if exists %I on storage.objects', bucket || '_auth_insert');
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L)',
      bucket || '_auth_insert', bucket);

    execute format('drop policy if exists %I on storage.objects', bucket || '_auth_update');
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id = %L) with check (bucket_id = %L)',
      bucket || '_auth_update', bucket, bucket);

    execute format('drop policy if exists %I on storage.objects', bucket || '_auth_delete');
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L)',
      bucket || '_auth_delete', bucket);
  end loop;
end $$;
