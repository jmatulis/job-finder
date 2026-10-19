# Job Finder

A local web app that:

1. **Searches widely for jobs** matching your keywords and experience, using JSearch (Google for Jobs data, which includes Indeed, LinkedIn, Glassdoor, Jobsora, JobLeads, ZipRecruiter and employer sites), Adzuna, and the public Greenhouse, Lever and Ashby boards of companies on your watchlist.
2. **Finds each posting's link on the company's own career site**, and labels how direct it is:
   - **Company ATS**: the employer's applicant tracking system (Workday, Greenhouse, Lever, iCIMS…)
   - **Company site**: the employer's own domain
   - **Job board**: no direct link found. A guess at the company's careers page is shown too.
3. **Scores every job against your profile** (skills, titles, years of experience, location, recency).
4. **Tailors your resume to a posting with Claude**, without inventing anything, and exports it as **PDF or Word**.
5. **Exports the application-link list as CSV**.

Run locally, it needs no login and stores data in `data/jobfinder.db` (SQLite). Deployed on Firebase App Hosting, it requires Google sign-in (restricted to the emails in `ALLOWED_EMAILS`) and stores each user's data in Firestore, so saved and applied jobs persist across sessions and devices.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the keys
npm run dev                         # http://localhost:3000
```

### API keys

| Key | Used for | Where to get it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Reading your resume, tailoring | https://console.anthropic.com/settings/keys |
| `RAPIDAPI_KEY` | JSearch: Indeed, LinkedIn, Glassdoor, Jobsora, JobLeads… | https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch (free tier available) |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Adzuna listings | https://developer.adzuna.com/signup (free) |

Every source is optional. A source without a key is skipped and shown as such. The company watchlist needs no key.

`CLAUDE_MODEL` defaults to `claude-sonnet-5-5` (about $0.04–0.08 per tailored resume). Set it to `claude-opus-5-5` for the stronger model at about twice the cost.

## How to use it

1. **Profile**: upload your resume (PDF, DOCX or TXT), review what Claude extracted, set your keywords, target titles and locations, then save.
2. **Watchlist** (optional): paste career-board URLs of companies you like (`jobs.lever.co/acme`, `job-boards.greenhouse.io/acme`, `jobs.ashbyhq.com/acme`).
3. **Search**: set keywords, a location and a radius (5 to 100 miles). Results are merged across sources, deduplicated and ranked by match score. You can filter to direct company links, or by the site a job was listed on. The radius applies to JSearch and Adzuna; watchlist boards are filtered by location name.
4. **Job page**: mark a job as **Applied** (the date is saved), or tailor a resume. Use your saved profile resume or upload a current one. Claude makes small, factual edits: it reorders bullets and skills and adjusts wording only where you already have the experience. The result is shown as a finished resume, with a list of what changed. You can edit it, then download a PDF or Word file. Some sources (Adzuna) only give a snippet of the description; in that case, paste the full posting before tailoring.
5. **Export**: download the list of application links as CSV, either all of them or only direct company links.

## Notes

- Indeed, Jobsora and JobLeads are reached through JSearch's aggregated data rather than by scraping. Their terms forbid scraping, and they actively block it.
- To find a direct link, the app checks the apply options each API returns. If none is direct, it follows the job-board link's redirects (for up to 40 jobs per search) to see whether it ends on the employer's site.

## Deploying (Firebase App Hosting)

Config lives in `firebase.json`, `apphosting.yaml` and `firestore.rules` (project `jonas-job-finder`). The Firebase project must be on the Blaze plan.

```bash
# API keys are stored in Cloud Secret Manager (you'll be prompted for each value):
npx firebase-tools apphosting:secrets:set ANTHROPIC_API_KEY --force
npx firebase-tools apphosting:secrets:set RAPIDAPI_KEY --force
npx firebase-tools apphosting:secrets:set ADZUNA_APP_ID --force
npx firebase-tools apphosting:secrets:set ADZUNA_APP_KEY --force

npx firebase-tools deploy --only apphosting   # build and roll out from local source
```

`--force` adds each secret to `apphosting.yaml` and grants the backend access to it. Commit that change so the next deploy picks it up.

## Development

```bash
npm test           # unit tests (career-link resolution, dedupe, matching)
npm run typecheck
npm run build
```
