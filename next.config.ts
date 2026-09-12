import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Origins allowed to reach the dev server, beyond the default localhost.
   *
   * Beacon Box has to be checked on the real 9:16 panel, not just in a desktop
   * browser, so `next dev` gets opened from other devices on the LAN. Next
   * blocks cross-origin requests to dev-only assets by default, which shows up
   * as the page loading but HMR and dev assets failing.
   *
   * Only the Origin (or, for no-cors requests, Referer) *hostname* is matched —
   * scheme, port, path and query are ignored, so entries carry no `https://`
   * and no port. `*` matches exactly one label, `**` one or more.
   *
   * Dev only; has no effect on `next build` or `next start`.
   */
  allowedDevOrigins: [
    // Tailscale CGNAT range (100.64.0.0/10). This is the one actually needed:
    // the dev log showed `/_next/hmr` blocked from 100.87.169.2.
    "100.*.*.*",
    // Private LAN ranges, for loading the kiosk on panel hardware or a phone.
    "192.168.*.*",
    "10.*.*.*",
    // 172.16.0.0/12 is 172.16-172.31; `*` matches one label, so the range
    // cannot be written as a single entry. These cover the common cases.
    "172.16.*.*",
    "172.17.*.*",
    // Add a tunnel hostname here when sharing a dev build, e.g.:
    // "*.trycloudflare.com",
  ],
};

export default nextConfig;
