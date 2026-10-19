# PRD — PH Jobs: Realtime Job Portal for Programming Hero

| | |
|---|---|
| Owner | Programming Hero |
| Status | Draft v1 — 2026-10-18 |
| Stack | Next.js (App Router, TypeScript) · MongoDB · Apify · Claude (optional) · Tailwind |

---

## 1. Problem

Programming Hero students and alumni hunt for web-development jobs across LinkedIn, BDJobs,
Indeed and dozens of Facebook groups. Posts are scattered, duplicated, often spammy, and
the good ones disappear fast. Students waste hours scrolling and miss fresh openings.

## 2. Goal

One portal that shows **today's intern / fresher / junior web & software jobs in Bangladesh or
remote**, picked up from BDJobs, LinkedIn and Facebook groups **as soon as they're posted** by an
always-on scraper per platform — and nothing else (no senior roles, no non-dev jobs, no old posts).

### Success metrics (first 90 days)

| Metric | Target |
|---|---|
| Time from source post → portal (p50) | BDJobs ≤ 5 min, LinkedIn ≤ 30 min |
| Precision (published jobs that are junior dev roles in BD/remote, posted today) | ≥ 95% |
| Duplicate rate on portal | ≤ 5% |
| Weekly active students | 5,000+ |
| Apply-link click-through | ≥ 25% of job views |
| Scraping cost | ≤ $50 / month |

### Non-goals (v1)

- Hosting applications / ATS features (we link out to the original post).
- Scraping private Facebook groups or anything that requires logging in with a personal account.
- Recruiter self-service posting (Phase 3).

## 3. Users

| User | Needs |
|---|---|
| **Student / job seeker** | Fresh relevant jobs, filters (remote, level, location, skill), instant alerts |
| **PH admin / moderator** | Approve/reject low-confidence posts (FB), manage sources & keywords, see scraper health |
| **Recruiter** (Phase 3) | Post jobs directly to PH community for free |

## 4. Sources

| Source | How | Checks every | Cost |
|---|---|---|---|
| BDJobs | BDJobs' public JSON feed (`api.bdjobs.com`, IT category + "developer"/"programmer"), minute-precise publish time | 3 min | Free |
| LinkedIn Jobs | Apify `curious_coder/linkedin-jobs-scraper`, Bangladesh searches, window = since last check + 30 min | 15 min | ~$0.002 / job, only new jobs |
| Facebook public groups | Apify `apify/facebook-groups-scraper`, exact "newer than" timestamp | 10 min | ~$0.007 / post (off until groups are added) |
| Indeed (remote) | Apify `borderline/indeed-scraper` | 60 min | ~$0.005 / job (off: no BD site, results mostly US senior) |

Each source is an **adapter** (`src/lib/sources/*`) with `fetchNew({ since })` and `normalize()`.
New platform = new adapter, nothing else changes.

## 5. Functional requirements

### 5.1 Ingestion (always-on)
- **F1** A long-running worker (`npm run worker`) runs one independent loop per enabled platform.
- **F2** Each check asks the platform only for posts published since the last successful check
  (first check of the day starts at midnight Bangladesh time).
- **F3** Settings (on/off, interval, keywords, groups) are edited live in Admin; no restart needed.
- **F4** Raw payloads kept 14 days (for `npm run rescore` after rule changes).
- **F5** Every check is logged: fetched, published, sent to review, duplicate, filtered, not-today, error.

### 5.2 Gate (what gets published)
`raw → normalize → today? → dev role? → junior? → BD or remote? → dedup → store → broadcast`

- **F6 Today only**: post date must be today (Asia/Dhaka); older posts are skipped.
- **F7 Role**: software / web development titles only (developer, programmer, software engineer,
  frontend, MERN, SQA, DevOps…); sales, HR, civil engineering, teaching etc. are filtered out.
- **F8 Level**: intern / junior / fresher from title, board label ("Entry level") or experience
  requirement ≤ 2 years (`JUNIOR_MAX_YEARS`). Senior / lead / manager / mid-level are filtered out.
  Level not stated → Admin review queue (or Claude decides when `ANTHROPIC_API_KEY` is set).
- **F9 Location**: Bangladesh, or remote only when the post itself says Remote/Worldwide/Anywhere.
- **F10 Dedup**: fingerprint = normalized company + title; repeats add a source link to the existing job.
  LinkedIn relists of BDJobs jobs are unwrapped to the real company.
- **F11 Expiry**: hidden after the deadline or 7 days.

### 5.3 Portal (students)
- **F12** "Today's junior dev jobs" feed, newest first, with **live updates** (SSE, ~5 s).
- **F13** Filters: posted (today / 3 days / 7 days), source, Bangladesh / remote, intern / junior, role, search.
- **F14** Job detail: experience, salary, deadline, skills, all source links, "Apply on {source}".
- **F15** (next) Alerts: Telegram channel / Discord webhook for each newly published job.

### 5.4 Admin
- **F15** Protected by `ADMIN_TOKEN` (v1); PH SSO later.
- **F16** Review queue: publish / reject; filtered jobs listed with their reason.
- **F17** Platforms: live status per platform (Active / Checking / Error / Off), last & next check,
  published today, "Check now", settings; warning when the worker isn't running.

## 6. Data model (MongoDB)

```
jobs {
  _id, fingerprint (unique), title, company, location, isRemote, jobType, level,
  salary, description, summary, skills[], applyUrl,
  sources: [{ source, url, externalId, postedAt }],
  postedAt, deadline, relevance, category,
  status: approved|pending|rejected|expired,
  createdAt, updatedAt
}
sources  { key, name, actorId, enabled, input{}, scheduleMinutes, lastRunAt, lastSuccessAt, consecutiveFailures }
runs     { source, apifyRunId, status, startedAt, finishedAt, fetched, created, merged, rejected, error }
raw_items{ source, externalId, payload, runId, createdAt (TTL 14d) }
```

## 7. Non-functional

- **Latency**: source post → portal ≤ 30 min p50.
- **Reliability**: one broken source must never block others; retries with backoff.
- **Cost guardrails**: per-run `maxItems` caps; date filters always on.
- **Compliance**: show summary + link back to original; never republish personal phone numbers
  or emails from FB posts; public data only; honor takedown requests within 48h.
- **Security**: secrets only in env vars; webhook verified with shared secret; admin token.

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Third-party actor breaks (site change / anti-bot) | Source goes dark | Health monitor (F18), swap actor via config, own scraper as fallback |
| FB posts unstructured, Bangla/Banglish | Poor relevance | LLM extraction + moderation queue |
| FB cost (pay per post, most posts not jobs) | Budget overrun | Few high-signal groups, date filter, Phase 2 only |
| ToS / legal pushback | Takedown | Link-out model, no full copy, takedown process |
| Same job across sources | Cluttered feed | Fingerprint dedup + merge sources |
| Spam / fake / MLM jobs | Trust loss | Exclude keywords, moderation, report button |

## 9. Rollout plan

| Phase | Scope | Exit criteria |
|---|---|---|
| **1 — MVP** | LinkedIn + BDJobs + Indeed, keyword classifier, dedup, live feed, admin moderation, cron | Real jobs flowing every 30 min for 1 week, ≥ 90% precision |
| **2** | Facebook public groups, Claude extraction, Telegram/Discord alerts, source health alerts | FB precision ≥ 85% with moderation |
| **3** | Recruiter posting, student accounts + saved jobs, PH SSO, analytics | — |

## 10. Build steps (goal-wise)

1. **Foundation** — Next.js + Tailwind + MongoDB connection, env config, models.
2. **Ingestion** — Apify client, per-source adapters, run logging, `/api/ingest/run` + webhook.
3. **Intelligence** — keyword classifier, optional Claude classifier/extractor, dedup/merge.
4. **Portal** — job feed, filters, detail view, SSE live updates.
5. **Admin** — moderation queue, sources page, run-now, health.
6. **Scheduling** — local scheduler script / Vercel cron / Apify Schedules.
7. **Verify** — seed + real Apify run, end-to-end check in browser.
