# ARC Winter Challenge

Tracks two winter challenges, **most training time** and **most consistent attendance**, with a shared leaderboard showing each athlete's total time, sessions attended and current streak.

- `public/` is the app athletes see (installable to a phone home screen).
- `netlify/functions/api.mjs` is the backend; data is saved in Netlify Blobs, built into every Netlify site.
- Dates use Eastern time (America/New_York). Change `TZ` at the top of `api.mjs` if needed.

## Deploy (pick one)

Netlify's drag-and-drop deploy does **not** run functions, so use one of these.

### Option A: GitHub (recommended, updates auto-deploy)
1. Create a new GitHub repository and upload everything in this folder (keep the folder structure).
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo.
3. Leave the build settings as detected (publish `public`, functions `netlify/functions`) and click **Deploy**.

### Option B: Netlify CLI (from your computer)
```
npm install
npx netlify-cli login
npx netlify-cli deploy --prod
```
Choose "Create & configure a new site" when asked.

## After deploying
- Rename the site under **Site configuration → Change site name** (e.g. `arc-winter.netlify.app`).
- Send athletes the link. On iPhone: Safari → Share → **Add to Home Screen**. On Android: Chrome → ⋮ → **Add to Home screen** / **Install app**.

## Seeing or fixing the data
Netlify dashboard → your site → **Blobs**. Store `arc-athletes` holds the roster; store `arc-logs` holds one entry per athlete with each day's minutes (`m`) and attendance (`p`).

## Notes
- No logins: anyone with the link can check in for any name (honor system).
- Streaks count consecutive calendar days marked present, ending today (or yesterday if not yet checked in today).
