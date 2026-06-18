# Porto NM

Prototype community app for Porto NM.

## Local development

```bash
npm install
npm run dev
```

## Shared collaboration mode

The app works without a backend by using browser storage. The deployed version uses Supabase Auth, invite-only onboarding, row-level security, and normalized community tables.

Then set these variables locally in `.env.local` and in Vercel:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

The current hosted backend uses these main tables:

- `profiles`
- `invite_codes`
- `groups`
- `group_members`
- `events`
- `event_attendees`
- `docs`
- `messages`

First use: create an account in the live app. If there are no profiles yet, the app shows the founder setup screen and creates the first `guardia`. After that, entries happen through invite codes, and each accepted invite links the new profile to its sponsor.

### Supabase CLI path

1. Create a Supabase access token:
   <https://supabase.com/dashboard/account/tokens>

2. Log in from this project:

```bash
npx supabase login --token YOUR_SUPABASE_ACCESS_TOKEN
```

3. Link the hosted project:

```bash
npm run supabase:link -- --project-ref YOUR_PROJECT_REF
```

4. Push the migrations:

```bash
npm run supabase:push
```

5. Add the public app keys to Vercel:

```bash
printf "https://YOUR_PROJECT_REF.supabase.co" | npx vercel env add VITE_SUPABASE_URL production
printf "YOUR_SUPABASE_ANON_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel --prod --yes
```

The current schema lives in `supabase/migrations/`.
