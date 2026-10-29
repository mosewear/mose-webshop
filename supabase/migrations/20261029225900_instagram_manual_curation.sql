-- Keep editorial visibility separate from automatic hiding of missing Graph media.
alter table public.instagram_posts
  add column if not exists is_manually_hidden boolean not null default false;

create or replace function public.preserve_instagram_manual_visibility()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- An upsert may reactivate an automatically pruned post, but never one hidden by an editor.
  new.is_hidden := new.is_hidden or new.is_manually_hidden;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'instagram_manual_visibility'
      and tgrelid = 'public.instagram_posts'::regclass
  ) then
    create trigger instagram_manual_visibility
      before insert or update on public.instagram_posts
      for each row execute function public.preserve_instagram_manual_visibility();
  end if;
end;
$$;
