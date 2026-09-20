const eslint = require("@eslint/js");
const importPlugin = require("eslint-plugin-import");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: ["lib/**", "generated/**", "eslint.config.js"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      ...importPlugin.flatConfigs.typescript.rules,
      "import/no-unresolved": "off",
    },
  },
);
