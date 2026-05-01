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

export default nextConfig;
