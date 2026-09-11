# Deploy Orbit Apply

## Render free web service

This project includes `render.yaml`. After the repository is on GitHub, open Render, choose **New → Blueprint**, select the repository, and approve the `orbit-apply` service. Render uses `npm start` and the `/health` check automatically.

Use a **Web Service**, not a Static Site—the job API is served by `server.js`.

Render’s free web service sleeps after 15 minutes without traffic, so the first visit after idle can take about a minute. Do not store résumés or user profiles on its local filesystem; it is erased on restarts and sleep cycles.

## GitHub + Vercel (recommended)

1. Create a new empty GitHub repository.
2. From this folder, run:

   ```powershell
   git init
   git add .
   git commit -m "Initial Orbit Apply dashboard"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

3. In Vercel, select **Add New → Project**, import the repository, and deploy. No environment variables are required for the current Remotive adapter.
4. Open the deployed site and select **Search now**. It calls `/api/jobs`, which keeps the public feed off the browser and caches results for one hour.

## Before exposing it publicly

- Add authentication before storing user profiles, résumés, or application answers.
- Add a database and encrypted file storage before supporting multiple users.
- Keep each job-board adapter official or authorised; do not scrape or automate pages that forbid it.
- Require user approval immediately before each application is submitted.
