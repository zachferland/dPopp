/** @type {import('next').NextConfig} */
module.exports = {
  exportPathMap: function () {
    return {
      "/": { page: "/" },
      "/dashboard": { page: "/Dashboard" },
    };
  },
  async rewrites() {
    return [
      {
        source: "/",
        destination: "https://#/",
        basePath: false,
      },
      {
        source: "/Dashboard",
        destination: "https://#/Dashboard",
        basePath: false,
      },
    ];
  },
  reactStrictMode: true,
};
