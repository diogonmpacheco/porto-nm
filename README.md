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
