-- MovieNight database schema. Run once in Supabase SQL Editor.
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
create unique index if not exists bookings_one_active_seat on public.bookings(event_id, seat_code) where status = 'confirmed';

create or replace function public.reserve_event_seat(p_event_id uuid, p_invitation_id uuid, p_seat_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ev public.events%rowtype; existing public.bookings%rowtype; created public.bookings%rowtype;
declare row_letter text; seat_number int;
begin
  select * into ev from public.events where id = p_event_id and status = 'published' for update;
  if not found then raise exception 'This event is not accepting reservations.'; end if;
  if not exists(select 1 from public.invitations where id=p_invitation_id and event_id=p_event_id) then raise exception 'Invalid invitation.'; end if;
  row_letter := split_part(p_seat_code, '-', 1);
  seat_number := split_part(p_seat_code, '-', 2)::int;
  if length(row_letter) <> 1 or ascii(upper(row_letter)) - 64 not between 1 and ev.seat_rows or seat_number not between 1 and ev.seats_per_row then
    raise exception 'That seat does not exist.';
  end if;
  select * into existing from public.bookings where event_id=p_event_id and invitation_id=p_invitation_id and status='confirmed';
  if found then raise exception 'This invitation already has a reserved seat.'; end if;
  insert into public.bookings(event_id, invitation_id, seat_code) values(p_event_id,p_invitation_id,upper(p_seat_code)) returning * into created;
  return jsonb_build_object('id',created.id,'seat_code',created.seat_code,'status',created.status);
exception when unique_violation then raise exception 'That seat has just been reserved by someone else. Please choose another seat.';
end; $$;

alter table public.events enable row level security;
alter table public.invitations enable row level security;
alter table public.votes enable row level security;
alter table public.bookings enable row level security;
revoke all on public.events, public.invitations, public.votes, public.bookings from anon, authenticated;
grant all on public.events, public.invitations, public.votes, public.bookings to service_role;
grant execute on function public.reserve_event_seat(uuid,uuid,text) to service_role;

-- Create your first screening event after running this schema:
-- insert into public.events(title,description,venue,starts_at,status,seat_rows,seats_per_row)
-- values ('MovieNight Premiere','One night. One screen. Endless memories.','Your venue',now() + interval '7 days','published',5,8);
