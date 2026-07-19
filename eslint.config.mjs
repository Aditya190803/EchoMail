import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next already registers the "@typescript-eslint" plugin
// (via the combined `typescript-eslint` package) and its parser for
// **/*.ts(x) files, so we only add rules here rather than re-registering
// the plugin (flat config forbids redefining a plugin under the same key).
const config = [
  ...nextCoreWebVitals,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Import ordering
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: "react",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["react", "next"],
        },
      ],

      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
        },
      ],

      // React specific rules
      "react/jsx-no-useless-fragment": "warn",
      "react/self-closing-comp": "error",
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // eslint-plugin-react-hooks v7 (pulled in by eslint-config-next ^16)
      // adds the React Compiler "Rules of React" ruleset, which flags a
      // large number of pre-existing, working patterns across the codebase
      // (imperative setState-in-effect data fetching, ref reads during
      // render in virtualization code, manual memoization, etc). Fixing
      // these requires non-mechanical refactors of hook logic, so they are
      // disabled here rather than mass-edited as part of a lint tooling
      // upgrade. Revisit individually if adopting the React Compiler.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",

      // General code quality
      "no-console": "off",
      "no-debugger": "error",
      "no-duplicate-imports": "off",
      "no-unused-expressions": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "all"],

      // Accessibility (jsx-a11y)
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",

      // React best practices
      "react/jsx-pascal-case": "error",
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // Enforce structured logging (apiLogger/clientLogger) over raw console
    // calls in application source. Tests, scripts, and the logger modules
    // themselves are exempt below.
    files: [
      "app/**/*.ts",
      "app/**/*.tsx",
      "lib/**/*.ts",
      "lib/**/*.tsx",
      "components/**/*.ts",
      "components/**/*.tsx",
      "hooks/**/*.ts",
      "hooks/**/*.tsx",
    ],
    rules: {
      "no-console": "error",
    },
  },
  {
    files: [
      "lib/logger.ts",
      "lib/client-logger.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "tests/**",
      "scripts/**",
    ],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "storybook-static/**",
    ],
  },
];

export default config;
