import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['172.30.214.24'],
  async redirects() {
    return [
      // The feature was renamed Smart Taaruf Card; emails already sent still use the old address.
      { source: '/my-taaruf-card', destination: '/smart-taaruf-card', permanent: true },
    ];
  },
};

export default nextConfig;
