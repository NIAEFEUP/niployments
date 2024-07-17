// @ts-check

import "eslint-plugin-only-warn";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  {
    extends: tseslint.configs.recommendedTypeChecked,
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    ignores: ["eslint.config.mjs"],
  },
  {
    ignores: ["node_modules", "crds", "assets"],
  },
);
