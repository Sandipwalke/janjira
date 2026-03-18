# Google Login on GitHub Pages

For GitHub Pages deployments, Google Sign-In is built with a public client ID at build time.

## 1) Default client ID (automatic)

Google Sign-In now automatically uses this default client ID when no env var is provided:

- `590762717274-h8n7o27oq81nls1e76db72svq3hefreh.apps.googleusercontent.com`

You can still override it by setting `VITE_GOOGLE_CLIENT_ID` in your build environment.

## 2) Keep Google Cloud origin list in sync

In Google Cloud Console OAuth client:

- Add your Pages origin (for example `https://<username>.github.io`)
- If using a project path, also allow `https://<username>.github.io/<repo>` where required by your flow

## 3) Optional backend override

The Express server also uses the same default client ID automatically.

If you need a different OAuth app, set `GOOGLE_CLIENT_ID` on the server to override the default.

When deployed to GitHub Pages (static), the app falls back to client-side profile extraction from the Google credential if the API is unavailable.
