# MovieNight

A private movie-night platform built with Next.js 16, React, TypeScript, Tailwind CSS, Supabase and TMDB.

## Features

- Cinematic, responsive guest experience
- Movie discovery through TMDB (curated sample titles work without a TMDB key)
- Private, unique invitation links with hashed tokens
- One vote per invitation, with the ability to update a vote
- Standard cinema seating with server-side seat validation
- Atomic seat reservations to prevent two guests booking the same seat
- Host dashboard with password-protected event publishing and invitation generation
- Server-only Supabase service-role access; no database credentials are exposed to the browser

## Requirements

- Node.js 20.9+
- A Supabase project
- Optional TMDB API key for live movie search

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in the required values.
3. In Supabase SQL Editor, run the complete `supabase/schema.sql` script.
4. Start the app: `npm run dev`
5. Open http://localhost:3000 and select **Host** to sign in and publish your screening.
6. Add guest names in the host dashboard. Send each generated invitation URL privately.

Generate a strong session secret with:

```bash
openssl rand -base64 48
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Server-only database access |
| ADMIN_PASSWORD | Yes | Host dashboard password |
| ADMIN_SESSION_SECRET | Yes | Signs the HTTP-only admin session cookie |
| TMDB_API_KEY | No | Live movie discovery and posters |

Never commit `.env.local` or expose the Supabase service-role key in client-side code.

## Deploy to Vercel

Import this repository into Vercel, configure the environment variables above for the Production and Preview environments, deploy, and run the SQL schema against the Supabase project. The app uses Next.js route handlers and is compatible with Vercel's Node.js runtime.

## Security notes

- Guest invitation tokens are generated with cryptographically secure randomness. Only SHA-256 hashes are stored in the database.
- Guest requests are validated on the server against the invitation and event.
- Database tables have RLS enabled and deny direct anon/authenticated access. Server routes use the service-role key.
- Seat reservations are performed through a database function and a unique partial index, so concurrent requests cannot reserve the same seat.
- The admin session is an HTTP-only, SameSite=Lax cookie with an HMAC signature and 12-hour expiry.

## Movie data attribution

When configured, movie metadata and posters are provided by The Movie Database (TMDB). This product is not endorsed or certified by TMDB.
