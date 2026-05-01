/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "./index.js",
    "next/core-web-vitals",
    "next/typescript",
    "prettier",
  ],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
  },
};
