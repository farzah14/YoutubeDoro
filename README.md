# YoutubeDoro

YoutubeDoro is an online anime focus room with account-owned learning tasks,
subtasks, timed sessions, session notes, and History.

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in the project URL and
   publishable key. Never add a service-role key to the browser app.
3. Run `supabase/migrations/20260828000000_learning_tracker.sql` in the
   Supabase SQL editor.
4. In Supabase Auth, disable email confirmation because this app does not use
   mandatory email verification.
5. Enable Google under Auth providers. Set the provider callback URL to the
   Supabase callback URL, and add
   `http://127.0.0.1:3000/auth/callback` (or the deployed site equivalent) to
   the Supabase Auth redirect allow list.

## Development

```bash
npm install
npm run dev
```

Validation commands:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Tracker data is stored in Supabase after sign-in. Themes, music, and other
presentation preferences remain local to this browser. The first signed-in
visit can optionally migrate browser tracker data; it never reads Notion data
and keeps the original browser copy as a backup.
