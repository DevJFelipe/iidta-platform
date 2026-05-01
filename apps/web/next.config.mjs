import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@iidta/core",
    "@iidta/ui",
    "@iidta/games-primaria",
    "@iidta/games-secundaria",
    "@iidta/games-media",
  ],
};

export default withPWA(nextConfig);
