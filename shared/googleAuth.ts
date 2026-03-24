export const DEFAULT_GOOGLE_CLIENT_ID = "590762717274-h8n7o27oq81nls1e76db72svq3hefreh.apps.googleusercontent.com";
export const DEFAULT_GOOGLE_CLIENT_SECRET = "janjira-google-client-secret";

export function getGoogleClientId(override?: string | null): string {
  return override?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
}

export function getGoogleClientSecret(override?: string | null): string {
  return override?.trim() || DEFAULT_GOOGLE_CLIENT_SECRET;
}
