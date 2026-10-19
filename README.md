# PH Jobs — live junior dev job portal

Picks up **intern / fresher / junior web & software jobs** in **Bangladesh or remote** the moment
they're posted on 13 platforms. Every published job stays on the portal (newest first, paginated);
"Today" and other dates are filters.
Product spec: [docs/PRD.md](docs/PRD.md).

```
always-on worker (npm run worker) — one loop per platform
        │
        ▼  last 3 days (Dhaka) → gate: dev role? junior? BD, or remote open to BD? → dedup → Postgres (Supabase)
Portal ◄── SSE /api/jobs/stream (new jobs appear within ~5 s)      Admin ◄── live platform status
```

| Platform | How | Every | Cost |
|---|---|---|---|
| BDJobs | public JSON feed (IT category + keywords) | 3 min | free |
| atB Jobs | public JSON API | 5 min | free |
| NextJobz | job list + each new job page (JSON-LD) | 5 min | free |
| Himalayas | public API (says which countries a remote job is open to) | 10 min | free |
| Remote Rocketship | page data, entry-level filter | 30 min | free |
| Arc.dev | page data (`requiredCountries`) | 30 min | free |
| Wellfound | page data | 30 min | free |
| Jobright AI | search page data (sometimes bot-checked; retries) | 30 min | free |
| LinkedIn jobs | Apify `curious_coder/linkedin-jobs-scraper`, Bangladesh | 15 min | ~$0.002/job |
| LinkedIn company pages | Apify `harvestapi/linkedin-company-posts` (Talent Mesh Tech) | 30 min | ~$0.002/post |
| Facebook groups (59) | Apify `memo23/facebook-public-group-posts-scraper` | 60 min | ~$0.0037/post (measured) |
| Reddit | Apify `harshmaur/reddit-scraper`, "[Hiring]" posts | 6 h | ~$0.12/run |
| Indeed | Apify, remote only — **off** (mostly US senior roles) | 60 min | ~$0.005/job |

Not added: **LinkedIn groups** (readable only when logged in; scraping with an account risks a ban),
**Remote OK / Remote.co** (Remote OK's free API runs about a day behind, so nothing is ever "today";
Remote.co blocks automated requests). Facebook: 36 of the 59 groups returned posts in testing; the
other 23 look private or inactive. Apify spend with everything on is roughly $1.5–2.5/day
($45–75/month), mostly Facebook — the free Apify plan (~$5/month) is not enough.

Several Apify tokens can be set (`APIFY_TOKENS=a,b,c`): runs use the first token with credit and
switch automatically when one runs out (Admin → Platforms shows each token's remaining credit).

## Run locally

```bash
npm install
npm run db        # terminal 1 — local Postgres (no install needed)
npm run db:push   # once (and after schema changes) — creates the tables
npm run dev       # terminal 2 — website at http://localhost:3000
npm run worker    # terminal 3 — the always-on scraper (keep it running)
```

`.env.local` needs `APIFY_TOKEN` (LinkedIn / Facebook / Indeed). BDJobs works without it.
Admin: `/admin`, password = `ADMIN_TOKEN`. One-off check without the worker: `npm run check -- bdjobs`.

## Database (Supabase)

Tables are defined in `prisma/schema.prisma` (Prisma + Postgres). To use Supabase:

1. Create a project at [supabase.com](https://supabase.com) (region: Singapore or Mumbai).
2. **Connect → ORMs → Prisma** gives two URLs. In `.env.local` (and in Vercel / your host):
   - `DATABASE_URL` = the **Transaction pooler** URL (port 6543, ends in `?pgbouncer=true`)
   - `DIRECT_URL` = the **Session pooler** / direct URL (port 5432)
3. `npm run db:push` creates the tables in Supabase. If the database is shared with another app,
   add `schema=ph_jobs` to both URLs first so this project gets its own schema.
4. Optional: copy existing data — `npm run copy-db -- <old postgres url>` (e.g. the local one) or
   `npm run migrate:mongo` (from the old MongoDB). Both are safe to re-run.
5. Deploy the site close to the database (Vercel region = the Supabase region): every page makes a
   few queries, and a far-away database adds ~0.3–3 s to each.

The app only talks to Postgres through Prisma, so any Postgres host works the same way.

## What gets published

A job is **published** only if all of these hold (`src/lib/pipeline/rules.ts`):

1. **Recent**: posted within the last `INGEST_DAYS` days (default 3, Bangladesh time) when first picked
   up, so a worker that was off catches up. Once published, a job is never hidden automatically.
2. **Software / web dev role**: developer, programmer, software engineer, frontend, MERN, SQA, DevOps…
   Sales, HR, civil engineering, teaching, etc. are filtered out.
3. **Intern / junior / fresher**: from the title ("Intern", "Junior", "Trainee"), the board's level
   label ("Entry level"), or the experience line (≤ `JUNIOR_MAX_YEARS`, default 2 years).
   Senior / lead / manager / mid-level are filtered out.
4. **Bangladesh, or remote**: remote only when the post itself says Remote/Worldwide/Anywhere.

If the level isn't stated, the job goes to **Admin → Review** instead of the portal. With
`ANTHROPIC_API_KEY` set, Claude reads those posts (and Facebook posts) and decides automatically.
Every filtered job keeps its reason (Admin → Review → Filtered out).

## Notes from testing (Oct 2026)

- Real volume is small: on a typical day BDJobs has ~7 new IT jobs (2–3 dev roles) and LinkedIn
  Bangladesh a handful of junior dev roles. Junior **remote-worldwide** jobs are rare everywhere.
- LinkedIn's public search ignores its remote filter and returns onsite jobs worldwide (~100 per
  30 min), so worldwide LinkedIn searches are off by default (`remote: []` in its settings) —
  they'd cost ~$20/day for about one genuine remote job.
- RemoteOK / WeWorkRemotely feeds were checked for remote jobs: both had no posts from the last
  24 h, so they don't fit a "today only" portal.

Only one worker can run at a time (a heartbeat lock in the `Lock` table): a second
`npm run worker` exits with "Another worker is already running", so checks — and Apify bills —
are never doubled. If a worker is killed, the next one can start after ~90 seconds.

## Maintenance

```bash
npm run check -- linkedin   # run one check now
npm run rescore             # re-apply the rules to stored raw data (no Apify cost)
npm run replay -- <source> <apifyDatasetId|file.json>
```

Platform settings (keywords, interval, groups) are edited live in Admin → Platforms; the worker
picks up changes on its next round.

## Deploy

The website and the worker can live in different places — both only talk to the database.

### Website on Vercel (free Hobby plan)

1. [vercel.com](https://vercel.com) → **Add New → Project** → import this GitHub repo (Next.js is detected;
   the build runs `prisma generate && next build`).
2. **Environment Variables** (Settings → Environment Variables), copied from `.env.local`:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase transaction pooler (port 6543) URL, ending in `?pgbouncer=true&schema=ph_jobs&connection_limit=1` |
   | `DIRECT_URL` | Supabase session pooler (port 5432) URL, ending in `?schema=ph_jobs` |
   | `APIFY_TOKENS` | as in `.env.local` (used by Admin → "Check now") |
   | `ADMIN_TOKEN` | the `/admin` password |
   | `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | optional, as in `.env.local` |

   `connection_limit=1` keeps each serverless function to one database connection.
3. **Deploy.** `vercel.json` pins the functions to Sydney (`syd1`), next to the Supabase project —
   change it if the database is in another region.

Vercel doesn't run long-lived processes, so the worker runs elsewhere (next section). The free plan
allows only daily crons, so `vercel.json` has none. On a Pro plan you can let Vercel do the checking
instead of a worker: add `"crons": [{ "path": "/api/ingest/tick", "schedule": "*/10 * * * *" }]` and
set `CRON_SECRET`.

### Worker

Run `npm run worker` anywhere with `.env.local` pointing at the same Supabase database:

- **This computer** (free): new jobs appear on the Vercel site within seconds, while it's on.
- **VPS / Oracle Cloud Always Free VM** (24/7): `pm2 start ecosystem.config.cjs --only ph-jobs-worker && pm2 save`.
- **Everything on one VPS**: `npm run build && pm2 start ecosystem.config.cjs && pm2 save` (website + worker).

Run only one worker — a second one exits by itself (see above).
