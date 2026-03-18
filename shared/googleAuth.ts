export const DEFAULT_GOOGLE_CLIENT_ID = "590762717274-h8n7o27oq81nls1e76db72svq3hefreh.apps.googleusercontent.com";

export function getGoogleClientId(override?: string | null): string {
  return override?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
}
