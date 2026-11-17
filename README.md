# MovieNight

A private movie-night platform built with Next.js 16, React, TypeScript, Tailwind CSS, Supabase and TMDB.

## Application pages

### Guest experience
- `/` — cinematic landing page and upcoming screening
- `/movies` — searchable movie catalogue and genre filters
- `/vote` — invitation-based movie voting
- `/seats` — cinema seating plan and reservations
- `/invite/[token]` — personal guest invitation

### Host workspace
- `/host` — overview and activity summary
- `/host/event` — screening details and seat layout
- `/host/invitations` — create and copy guest invitation links
- `/host/votes` — vote tally
- `/host/settings` — workspace information and demo data controls

## Demo mode (no Supabase required)

The interface can be explored before connecting Supabase:
1. Run `npm install`.
2. Run `npm run dev`.
3. Open http://localhost:3000.
4. Open **Host** and select **Enter demo mode**.
5. Create a screening, add guest names and generate local demo invitations.
6. Open an invitation link in the same browser to test voting and seat selection.

Demo event data, guest invitations, votes and reservations are stored in that browser's local storage. They are not shared across devices or browsers and are not production-secure. Demo mode is for UI and workflow testing only.

## Production setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and configure the required environment variables.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Configure a TMDB API key if live movie discovery is required.
5. Run `npm run build` and then `npm start`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Yes for production data | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Yes for production data | Server-only database access |
| ADMIN_PASSWORD | Yes for production host access | Host dashboard password |
| ADMIN_SESSION_SECRET | Yes for production host access | Signs the HTTP-only admin session cookie |
| TMDB_API_KEY | No | Live movie discovery and posters |

Never commit `.env.local` or expose the Supabase service-role key in client-side code.

## Production functionality

- Private guest invitations with cryptographically random tokens and SHA-256 token hashes
- One vote per invitation, with the ability to update a vote
- Standard cinema seating and server-side seat validation
- Atomic seat reservations to prevent concurrent double-booking
- Password-protected host operations
- Server-only Supabase service-role access
- Responsive guest and host interfaces

## Deploy to Vercel

Import this repository into Vercel, configure the environment variables above for the Production and Preview environments, deploy, and run the SQL schema against the Supabase project.

## Movie data attribution

When configured, movie metadata and posters are provided by The Movie Database (TMDB). This product is not endorsed or certified by TMDB.
