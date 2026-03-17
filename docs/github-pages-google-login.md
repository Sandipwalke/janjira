# Google Login on GitHub Pages

For GitHub Pages deployments, Google Sign-In is built with a public client ID at build time.

## 1) Configure repository variable

In your GitHub repository:

- Go to **Settings → Secrets and variables → Actions → Variables**
- Add:
  - `VITE_GOOGLE_CLIENT_ID=590762717274-h8n7o27oq81nls1e76db72svq3hefreh.apps.googleusercontent.com`

The Pages workflow injects this variable into the Vite build.

## 2) Keep Google Cloud origin list in sync

In Google Cloud Console OAuth client:

- Add your Pages origin (for example `https://<username>.github.io`)
- If using a project path, also allow `https://<username>.github.io/<repo>` where required by your flow

## 3) Optional backend verification

If you run the Express server (non-Pages), set `GOOGLE_CLIENT_ID` on that server too so `/api/auth/google` can verify tokens.

When deployed to GitHub Pages (static), the app falls back to client-side profile extraction from the Google credential if the API is unavailable.
