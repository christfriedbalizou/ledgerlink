import js from "@eslint/js";
import pluginImport from "eslint-plugin-import";
import pluginNode from "eslint-plugin-node";
import pluginSecurity from "eslint-plugin-security";
import pluginSonar from "eslint-plugin-sonarjs";

export default [
  js.configs.recommended,
  {
    plugins: {
      import: pluginImport,
      security: pluginSecurity,
      node: pluginNode,
      sonarjs: pluginSonar,
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js"],
        },
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      // Disallow console except warn/error; info/debug should go through logger util
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Basic security plugin rules (select few to avoid noise)
      "security/detect-object-injection": "off",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-eval-with-expression": "error",
      "node/no-unsupported-features/es-syntax": "off",
      "node/no-missing-import": "off",
      // SonarJS maintainability rules (light touch to start)
      "sonarjs/no-all-duplicated-branches": "warn",
      "sonarjs/no-identical-functions": "warn",
      // security-node sample rule
    },
  },
];
