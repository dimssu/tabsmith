module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true, webextensions: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  ignorePatterns: ["dist", "node_modules"],
};
