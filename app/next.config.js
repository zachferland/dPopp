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
        source: "/*",
        destination: "/#/*",
        basePath: false,
      },
    ];
  },
  reactStrictMode: true,
};
