-- MovieNight database schema. Run once in Supabase SQL Editor or as a migration.
create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  venue text not null default 'Private screening room',
  starts_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','completed','cancelled')),
  seat_rows int not null default 5 check (seat_rows between 1 and 12),
  seats_per_row int not null default 8 check (seats_per_row between 1 and 16),
  selected_movie_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  unique(event_id, guest_name)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  movie_id bigint not null,
  created_at timestamptz not null default now(),
  unique(event_id, invitation_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  seat_code text not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now(),
  unique(event_id, invitation_id)
);

create unique index if not exists bookings_one_active_seat
  on public.bookings(event_id, seat_code)
  where status = 'confirmed';

create index if not exists bookings_invitation_id_idx
  on public.bookings(invitation_id);
create index if not exists votes_invitation_id_idx
  on public.votes(invitation_id);

-- All application access goes through trusted Next.js API routes using the
-- Supabase secret key. Browser roles receive no direct table privileges.
alter table public.events enable row level security;
alter table public.invitations enable row level security;
alter table public.votes enable row level security;
alter table public.bookings enable row level security;

revoke all on public.events, public.invitations, public.votes, public.bookings
  from anon, authenticated;
grant all on public.events, public.invitations, public.votes, public.bookings
  to service_role;

-- SECURITY INVOKER is sufficient because the API calls this as service_role.
-- Explicitly revoke PUBLIC because PostgreSQL grants EXECUTE to PUBLIC by default.
create or replace function public.reserve_event_seat(
  p_event_id uuid,
  p_invitation_id uuid,
  p_seat_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  ev public.events%rowtype;
  existing public.bookings%rowtype;
  created public.bookings%rowtype;
  row_letter text;
  seat_number int;
  normalized_seat text := upper(p_seat_code);
begin
  select * into ev
  from public.events
  where id = p_event_id and status = 'published'
  for update;

  if not found then
    raise exception 'This event is not accepting reservations.';
  end if;

  if not exists (
    select 1 from public.invitations
    where id = p_invitation_id and event_id = p_event_id
  ) then
    raise exception 'Invalid invitation.';
  end if;

  if normalized_seat !~ '^[A-L]-(1[0-6]|[1-9])$' then
    raise exception 'Invalid seat code.';
  end if;

  row_letter := split_part(normalized_seat, '-', 1);
  seat_number := split_part(normalized_seat, '-', 2)::int;

  if ascii(row_letter) - 64 not between 1 and ev.seat_rows
     or seat_number not between 1 and ev.seats_per_row then
    raise exception 'That seat does not exist.';
  end if;

  select * into existing
  from public.bookings
  where event_id = p_event_id
    and invitation_id = p_invitation_id
    and status = 'confirmed';

  if found then
    raise exception 'This invitation already has a reserved seat.';
  end if;

  insert into public.bookings(event_id, invitation_id, seat_code)
  values (p_event_id, p_invitation_id, normalized_seat)
  returning * into created;

  return jsonb_build_object(
    'id', created.id,
    'seat_code', created.seat_code,
    'status', created.status
  );
exception
  when unique_violation then
    raise exception 'That seat has just been reserved by someone else. Please choose another seat.';
end;
$$;

revoke all on function public.reserve_event_seat(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.reserve_event_seat(uuid, uuid, text)
  to service_role;
