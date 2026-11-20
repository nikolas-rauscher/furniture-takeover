import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "data",
      "node_modules*",
      ".dist-icloud-old.nosync",
      ".node_modules-icloud-old.nosync",
      "src/components/ui",
      "src/components/animate-ui",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Leaving out a field by destructuring the rest is how the code omits keys.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    // The classic hook rules. The app is not built with the React Compiler, so
    // the compiler's own rules (refs, set-state-in-effect, purity…) do not apply.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Stream validation rejects control characters on purpose.
    files: ["src/api/runs.ts"],
    rules: { "no-control-regex": "off" },
  },
  {
    files: [
      "server/**/*.ts",
      "scripts/**/*.{ts,mjs}",
      "shared/**/*.ts",
      "*.ts",
      "*.js",
    ],
    languageOptions: { globals: globals.node },
  },
);
