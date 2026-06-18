# Porto NM

Prototype community app for Porto NM.

## Local development

```bash
npm install
npm run dev
```

## Shared collaboration mode

The app works without a backend by using browser storage. To make it collaborative across devices, create a Supabase project and run `supabase/schema.sql` in the Supabase SQL editor.

Then set these variables locally in `.env.local` and in Vercel:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

This first collaboration layer stores the prototype state in one shared row and syncs changes in realtime. It is intentionally simple for validation. Before using it with a real sensitive community, replace the open prototype policies with authenticated access rules and split the data into dedicated tables.

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

4. Push the migration:

```bash
npm run supabase:push
```

5. Add the public app keys to Vercel:

```bash
printf "https://YOUR_PROJECT_REF.supabase.co" | npx vercel env add VITE_SUPABASE_URL production
printf "YOUR_SUPABASE_ANON_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel --prod --yes
```

The SQL source lives in `supabase/migrations/20260618103500_create_community_state.sql`. `supabase/schema.sql` is kept as a copy that is easy to paste into the Supabase SQL editor if you prefer doing it manually.
