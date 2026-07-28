module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module", project: "./tsconfig.app.json" },
  plugins: ["react-hooks", "react-refresh", "@typescript-eslint"],
  ignorePatterns: ["dist", "supabase/functions"],
  rules: {
    ...require("eslint-plugin-react-hooks").configs.recommended.rules,
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};
