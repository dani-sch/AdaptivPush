/** Loopback in an iPhone bundle targets the phone, never the development PC. */
export function backendConfigurationIssue(url: string, platform: string): string | null {
  try {
    const host = new URL(url).hostname;
    if (platform !== 'web' && /^(localhost|127(?:\.\d+){3}|\[?::1\]?)$/i.test(host)) {
      return 'This test build points to a backend on this phone. Open the hosted Expo server on port 8081, or use a verified LAN test server. Your saved account and drafts have not been deleted.';
    }
    return null;
  } catch { return 'The app server address is invalid. Open a build with a verified server configuration.'; }
}
