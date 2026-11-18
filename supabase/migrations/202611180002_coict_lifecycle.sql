-- Additive CoICT MovieNight lifecycle. Existing invitations, votes and bookings remain intact.
alter table public.events add column if not exists phase text not null default 'suggestions'
 check (phase in ('suggestions','voting','invitation_requests','reservations','completed'));
alter table public.events add column if not exists winning_movie_title text;
alter table public.events add column if not exists winning_movie_poster text;
alter table public.invitations add column if not exists approval_status text not null default 'approved'
 check (approval_status in ('pending','approved','rejected'));
alter table public.invitations add column if not exists invitation_requested boolean not null default false;
create table if not exists public.movie_suggestions (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 invitation_id uuid not null references public.invitations(id) on delete cascade,
 movie_id bigint not null,
 movie_title text not null,
 poster_path text,
 created_at timestamptz not null default now(),
 unique(event_id,movie_id),
 unique(event_id,invitation_id,movie_id)
);
create table if not exists public.snack_products (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 name text not null,
 description text not null default '',
 price_tzs integer not null check(price_tzs>=0),
 stock integer not null default 0 check(stock>=0),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.snack_orders (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 invitation_id uuid not null references public.invitations(id) on delete cascade,
 product_id uuid not null references public.snack_products(id) on delete cascade,
 quantity integer not null check(quantity between 1 and 20),
 total_tzs integer not null check(total_tzs>=0),
 status text not null default 'pending' check(status in ('pending','confirmed','fulfilled','cancelled')),
 created_at timestamptz not null default now()
);
create index if not exists movie_suggestions_event_idx on public.movie_suggestions(event_id);
create index if not exists snack_orders_event_idx on public.snack_orders(event_id);
create index if not exists snack_orders_invitation_idx on public.snack_orders(invitation_id);
alter table public.movie_suggestions enable row level security;
alter table public.snack_products enable row level security;
alter table public.snack_orders enable row level security;
revoke all on public.movie_suggestions,public.snack_products,public.snack_orders from anon,authenticated;
grant all on public.movie_suggestions,public.snack_products,public.snack_orders to service_role;
-- Existing screenings retain their prior permissions and bookings; new screenings begin in suggestions.
update public.events set phase='reservations' where status='published' and
 (exists(select 1 from public.bookings b where b.event_id=events.id) or
  exists(select 1 from public.votes v where v.event_id=events.id));
-- A legacy booking is already an approved invitation; preserve that state.
update public.invitations set invitation_requested=true
where exists(select 1 from public.bookings where bookings.invitation_id=invitations.id and bookings.status='confirmed');
-- Support two seats per guest without dropping the unique constraint on invitation:
-- each invitation may own one booking row per seat, with a partial unique index on active seats.
alter table public.bookings drop constraint if exists bookings_event_id_invitation_id_key;
create unique index if not exists bookings_one_active_guest_seat
 on public.bookings(event_id,invitation_id,seat_code) where status='confirmed';
create or replace function public.reserve_event_seats(p_event_id uuid,p_invitation_id uuid,p_seat_codes text[])
returns jsonb language plpgsql security invoker set search_path=public as $$
declare ev public.events%rowtype; seat text; normalized text[]; n integer; booked jsonb;
begin
 select * into ev from public.events where id=p_event_id and status='published' for update;
 if not found or ev.phase <> 'reservations' then raise exception 'Seat reservations are not open.'; end if;
 if not exists(select 1 from public.invitations where id=p_invitation_id and event_id=p_event_id and approval_status='approved') then
 raise exception 'Your invitation must be approved before booking.'; end if;
 select array_agg(distinct upper(trim(x))) into normalized from unnest(p_seat_codes) x;
 n:=coalesce(array_length(normalized,1),0);
 if n<1 or n>2 or n<>coalesce(array_length(p_seat_codes,1),0) then raise exception 'Select one or two different seats.'; end if;
 if (select count(*) from public.bookings where event_id=p_event_id and invitation_id=p_invitation_id and status='confirmed')+n>2 then
 raise exception 'Each guest can reserve a maximum of two seats.'; end if;
 foreach seat in array normalized loop
  if seat !~ '^[A-L]-(1[0-6]|[1-9])$' or ascii(split_part(seat,'-',1))-64>ev.seat_rows
    or split_part(seat,'-',2)::int>ev.seats_per_row then raise exception 'Invalid seat: %',seat; end if;
 end loop;
 if exists(select 1 from public.bookings where event_id=p_event_id and seat_code=any(normalized) and status='confirmed') then
 raise exception 'One of those seats has already been reserved.'; end if;
 insert into public.bookings(event_id,invitation_id,seat_code)
 select p_event_id,p_invitation_id,x from unnest(normalized) x;
 select jsonb_agg(jsonb_build_object('seat_code',seat_code,'status',status)) into booked
 from public.bookings where event_id=p_event_id and invitation_id=p_invitation_id and status='confirmed';
 return coalesce(booked,'[]'::jsonb);
exception when unique_violation then raise exception 'One of those seats was just reserved. Choose another.';
end $$;
revoke all on function public.reserve_event_seats(uuid,uuid,text[]) from public,anon,authenticated;
grant execute on function public.reserve_event_seats(uuid,uuid,text[]) to service_role;
create or replace function public.place_snack_order(p_event_id uuid,p_invitation_id uuid,p_product_id uuid,p_quantity integer)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare product public.snack_products%rowtype; order_row public.snack_orders%rowtype;
begin
 if p_quantity not between 1 and 20 then raise exception 'Quantity must be between 1 and 20.'; end if;
 if not exists(select 1 from public.bookings where event_id=p_event_id and invitation_id=p_invitation_id and status='confirmed') then
 raise exception 'Reserve a seat before ordering snacks.'; end if;
 select * into product from public.snack_products where id=p_product_id and event_id=p_event_id and active for update;
 if not found or product.stock<p_quantity then raise exception 'This snack is unavailable or out of stock.'; end if;
 update public.snack_products set stock=stock-p_quantity where id=product.id;
 insert into public.snack_orders(event_id,invitation_id,product_id,quantity,total_tzs)
 values(p_event_id,p_invitation_id,p_product_id,p_quantity,product.price_tzs*p_quantity) returning * into order_row;
 return jsonb_build_object('id',order_row.id,'total_tzs',order_row.total_tzs,'status',order_row.status);
end $$;
revoke all on function public.place_snack_order(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.place_snack_order(uuid,uuid,uuid,integer) to service_role;