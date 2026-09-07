/** Keep local frontend/API cookies on the same site without changing remote API origins. */
export function resolveBackendUrl(configuredUrl: string, pageHostname: string): string {
  const url = new URL(configuredUrl);
  const loopbackNames = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (loopbackNames.has(url.hostname) && loopbackNames.has(pageHostname)) {
    url.hostname = pageHostname;
  }
  return url.toString();
}
