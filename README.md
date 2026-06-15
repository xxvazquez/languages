# Sakura Study

Sakura Study is a React + TypeScript Japanese learning app focused on active recall through typed answers. It uses a calm Japanese notebook aesthetic, adaptive review, XP, streaks, challenge mode, search, and mistake analytics.

## Stack

- React, TypeScript, Vite
- Tailwind CSS
- Supabase Auth and database schema
- PDF parser/importer for the starter curriculum
- Deployable to Vercel or GitHub Pages

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Set Supabase credentials in `.env`:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without those variables, the app runs in local mode with `localStorage` so the learning flow still works.

## Supabase

Run the migration in `supabase/migrations/20260615193000_initial_sakura_study.sql`. It creates:

- `users`
- `cards`
- `attempts`
- `streaks`
- `mastery`

Row-level security is enabled so users can only access their own profile, attempts, streaks, and mastery rows. Cards are readable by authenticated users.

## Curriculum Import

The starter data was parsed from:

`/Users/home/Downloads/bee74c73-4597-4636-a94f-20048f58c566_Basic_Tables.pdf`

Regenerate the seed JSON:

```bash
python3 scripts/parse_pdf.py /path/to/Basic_Tables.pdf
```

Generated data lives at `src/data/curriculum.json` and includes vocabulary, grammar examples, and self-introduction prompts.

## Learning Modes

- Vocabulary typing: English to kana, kana to English, kana to romaji, English to Japanese
- Grammar fill-in and sentence completion
- Self-introduction practice
- Adaptive review for missed, weak, and overdue cards
- Challenge mode with 10 questions, score, timer-style flow, and streak multiplier
- Analytics with accuracy, XP, streaks, difficult cards/categories, progress bars, and recurring mistake analysis
- Search across Japanese, kana, romaji, and English

## Build

```bash
pnpm build
```

## Deploy

### Vercel

Import the repository, set the two `VITE_SUPABASE_*` environment variables, and use:

- Build command: `pnpm build`
- Output directory: `dist`

### GitHub Pages

The Vite config supports the `/languages/` base path when `GITHUB_PAGES=true`.

```bash
GITHUB_PAGES=true pnpm build
```

Deploy the `dist` directory with your preferred Pages workflow.
