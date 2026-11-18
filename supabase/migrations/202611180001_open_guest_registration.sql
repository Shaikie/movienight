alter table public.events add column if not exists registration_open boolean not null default true;
create table if not exists public.guest_registrations (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 invitation_id uuid not null unique references public.invitations(id) on delete cascade,
 full_name text not null,
 email text not null,
 phone text not null,
 created_at timestamptz not null default now(),
 unique(event_id,email),
 unique(event_id,phone)
);
alter table public.guest_registrations enable row level security;
revoke all on public.guest_registrations from anon,authenticated;
grant all on public.guest_registrations to service_role;
create or replace function public.register_movie_night_guest(p_event_id uuid,p_name text,p_email text,p_phone text,p_token_hash text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare ev public.events%rowtype; inv_id uuid;
begin
 select * into ev from public.events where id=p_event_id and status='published' and registration_open=true for update;
 if not found then raise exception 'Registration is closed.'; end if;
 if length(trim(p_name)) not between 2 and 80 or length(trim(p_email)) not between 5 and 254 or length(trim(p_phone)) not between 7 and 30 then
  raise exception 'Valid name, email and phone are required.';
 end if;
 if (select count(*) from public.invitations where event_id=p_event_id) >= ev.seat_rows*ev.seats_per_row then
  raise exception 'The guest list is full.';
 end if;
 insert into public.invitations(event_id,guest_name,token_hash) values(p_event_id,trim(p_name),p_token_hash) returning id into inv_id;
 insert into public.guest_registrations(event_id,invitation_id,full_name,email,phone)
 values(p_event_id,inv_id,trim(p_name),lower(trim(p_email)),trim(p_phone));
 return jsonb_build_object('invitation_id',inv_id);
exception when unique_violation then raise exception 'This name, email or phone is already registered for this event.';
end; $$;
revoke all on function public.register_movie_night_guest(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.register_movie_night_guest(uuid,text,text,text,text) to service_role;
