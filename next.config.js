/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // The v4 route /levels is kept alive as a real HTTP redirect so old links and bookmarks still work.
  async redirects() {
    return [{ source: '/levels', destination: '/explore', permanent: false }];
  },
};
module.exports = nextConfig;
