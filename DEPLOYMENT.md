# Deployment Guide: GitLab Pages and Firebase Hosting

This project's frontend is a React + Vite SPA. Both GitLab Pages and Firebase Hosting serve static files.

---

## Option 1: GitLab Pages

### Prerequisites

- GitLab.com account
- Project pushed to GitLab (e.g. `gitlab.com/your-username/fantasy-polymarket`)

### Steps

1. **Add `.gitlab-ci.yml`** (already created at project root)

2. **Base path (only for project sites)**  
   If your site will be at `https://username.gitlab.io/fantasy-polymarket`, set the base in `frontend/vite.config.ts`:

   ```ts
   export default defineConfig({
     base: '/fantasy-polymarket/',
     plugins: [react()],
     // ...
   })
   ```

   If you use a user/group site at `https://username.gitlab.io`, leave `base` unset.

3. **Push to `main`**:

   ```bash
   git add .gitlab-ci.yml
   git commit -m "Add GitLab Pages deployment"
   git push origin main
   ```

4. **Check the pipeline**  
   Go to **CI/CD > Pipelines** in GitLab. After the pipeline succeeds, the site is live.

5. **URLs**
   - Project site: `https://username.gitlab.io/fantasy-polymarket`
   - User site: `https://username.gitlab.io` (if configured as user/group Pages)

---

## Option 2: Firebase Hosting

### Prerequisites

- Node.js and npm
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project (create at [Firebase Console](https://console.firebase.google.com))

### Steps

1. **Login**:

   ```bash
   firebase login
   ```

2. **Set project ID**  
   Edit `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID` with your project ID, or run:

   ```bash
   firebase use --add
   ```

3. **Build the frontend**:

   ```bash
   cd frontend && npm ci && npm run build && cd ..
   ```

4. **Deploy**:

   ```bash
   firebase deploy
   ```

5. **URL**  
   Your app will be at `https://YOUR_PROJECT_ID.web.app` or `https://YOUR_PROJECT_ID.firebaseapp.com`.

### Custom domain

In Firebase Console: **Hosting > Add custom domain** and follow the DNS instructions.

---

## Fixing "Failed to fetch" on GitLab Pages

The frontend calls the backend API. By default it uses `http://127.0.0.1:8001`, which fails when the site is served from GitLab Pages. Do the following:

### 1. Deploy the backend

Deploy the FastAPI backend to a public URL (Railway, Render, Fly.io, Cloud Run, etc.).

### 2. Set VITE_API_BASE in GitLab CI

1. Go to your project on GitLab: **Settings > CI/CD**
2. Expand **Variables**
3. Add variable:
   - **Key**: `VITE_API_BASE`
   - **Value**: your backend URL (e.g. `https://your-app.railway.app`)
   - **Flags**: uncheck "Protect variable" if you want it for all branches
4. Save and re-run the pipeline (or push a new commit)

### 3. Configure backend CORS

The backend must allow requests from your GitLab Pages origin. Set the `CORS_ORIGINS` environment variable when deploying:

```
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://gurevichpe.gitlab.io
```

The default in `backend/app/config.py` already includes `https://gurevichpe.gitlab.io`. If your GitLab username differs, override `CORS_ORIGINS` with your Pages URL.

---

## Environment variables

- **GitLab CI**: add `VITE_API_BASE` in **Settings > CI/CD > Variables** so the frontend build uses your deployed backend URL.
- **Firebase**: set `VITE_API_BASE` in your build environment before `npm run build`.

---

## Backend deployment

Both GitLab Pages and Firebase Hosting serve static files only. The backend (FastAPI) must be deployed separately:

- Railway, Render, Fly.io, or similar for the API
- Cloud Run, AWS Lambda, etc.

Point the frontend to the deployed API URL via `VITE_API_BASE`.

---

## Backend phase 1 guardrails (teams)

Phase 1 introduces backend-managed teams and off-chain metadata, with no smart-contract changes. Keep the following behavior explicit in release notes and API docs:

- Team creation, roles, and player metadata (including avatar URL) are stored off-chain in backend persistence.
- Contest entry can be prepared from a saved `team_id`, but the on-chain transaction still calls `enterContest(contestId, players[])`.
- On-chain callers can still submit arbitrary valid `players[]` directly to contracts without backend checks.
- Contest scoring and payouts remain contract-authoritative (`contestEntries[].score` from chain). Team roles do not affect settlement in Phase 1.
