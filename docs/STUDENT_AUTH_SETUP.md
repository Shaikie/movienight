# MovieNight student authentication setup

## Environment
Set in `.env.local`:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://otcgrmynmtnzqvbnnkqk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
# existing server-only SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY remains unchanged
```
Never expose the service-role key in `NEXT_PUBLIC_*` variables.

## Supabase Auth
1. In Supabase Dashboard > Authentication > Providers > Email, enable email/password signup and require email confirmation.
2. In Authentication > URL Configuration, set the Site URL to your deployed app URL (or `http://localhost:3000` for local testing). Add `http://localhost:3000/auth/callback` and the deployed `https://YOUR_DOMAIN/auth/callback` to allowed Redirect URLs.
3. Under Authentication > Providers > Google, enable Google and enter the OAuth client ID and client secret from Google Cloud.
4. In Google Cloud Console > Google Auth Platform > Clients, create a Web application OAuth client. Add the Supabase callback as an **Authorized redirect URI**:
`https://otcgrmynmtnzqvbnnkqk.supabase.co/auth/v1/callback`.
   Add your app origins (e.g. `http://localhost:3000`) as **Authorized JavaScript origins** if required.
5. Configure Google OAuth consent screen / test users as required by Google.

## Smoke test
1. `npm run build`, then `npm run dev`.
2. Open `/signup`, register with a new email, verify it, then sign in at `/login`.
3. Open `/dashboard`, enter full name and phone, and click **Join screening** while phase is suggestions or voting.
4. Suggest, vote, request invitation, have host approve, and reserve seats without pasting a token.
5. Test Google sign-in with a Google account. Verify callback returns to `/dashboard`.
6. For a previous guest, log in with the **same verified email** and check that their registration appears on `/dashboard`.

## Compatibility and safety
- Existing invitations, guest registrations, votes, bookings and snack orders are retained.
- The `invitations.user_id` column is nullable, and legacy tokens still work.
- No client-side access to privileged tables is granted; API routes validate the Supabase access token on the server and use the existing service-role client.
- A verified email is required before linking a historical registration. The user must still have host approval to book.
- Do not share the service-role key, Google OAuth secret or admin session secret.

## Known limitations
- Google provider setup must be completed manually in Supabase and Google Cloud.
- This branch has not been locally compiled or end-to-end tested by the assistant. Run the build before merging.
- Legacy token registration remains available at `/register/legacy` during migration.
