
create extension if not exists pgcrypto with schema extensions;

do $$
declare existing uuid;
begin
  select id into existing from vault.secrets where name = 'pii_master_key';
  if existing is null then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'pii_master_key', 'Master key for profile PII encryption');
  end if;
end$$;

alter table public.profiles
  add column if not exists full_name_enc bytea,
  add column if not exists phone_enc bytea,
  add column if not exists country_enc bytea,
  add column if not exists data_category text not null default 'pii_protected';

create or replace function public.encrypt_profile_pii()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'pii_master_key' limit 1;
  if k is null then return new; end if;
  if new.full_name is not null then new.full_name_enc := extensions.pgp_sym_encrypt(new.full_name, k); end if;
  if new.phone_number is not null then new.phone_enc := extensions.pgp_sym_encrypt(new.phone_number, k); end if;
  if new.country is not null then new.country_enc := extensions.pgp_sym_encrypt(new.country, k); end if;
  return new;
end;
$$;

drop trigger if exists trg_encrypt_profile_pii on public.profiles;
create trigger trg_encrypt_profile_pii
  before insert or update of full_name, phone_number, country
  on public.profiles
  for each row execute function public.encrypt_profile_pii();

update public.profiles set full_name = full_name where full_name is not null or phone_number is not null or country is not null;

create or replace function public.get_my_profile_pii()
returns table(full_name text, phone_number text, country text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'pii_master_key' limit 1;
  return query
    select
      case when p.full_name_enc is not null then extensions.pgp_sym_decrypt(p.full_name_enc, k) else p.full_name end,
      case when p.phone_enc is not null then extensions.pgp_sym_decrypt(p.phone_enc, k) else p.phone_number end,
      case when p.country_enc is not null then extensions.pgp_sym_decrypt(p.country_enc, k) else p.country end
    from public.profiles p
    where p.id = auth.uid();
end;
$$;

update public.premium_subscriptions
  set status = 'cancelled', expires_at = now()
  where user_id = '0481c13b-e2b5-42fb-9ad6-81fce4a17fcd' and status = 'active';

insert into public.premium_subscriptions (user_id, status, payment_reference, expires_at, plan)
select u.id, 'active', 'manual_grant_lifetime', now() + interval '100 years', 'premium'
from auth.users u
where lower(u.email) = lower('gibrilimwene@gmail.com')
on conflict do nothing;
