import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat config (ESLint 9). eslint-config-next 16 ships native flat-config
 * arrays, so we spread them directly rather than going through FlatCompat.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "src/lib/supabase/database.types.ts",
    ],
  },
  {
    // The React 19 eslint plugin ships new advisory rules (set-state-in-effect,
    // static-components, refs-in-render) that flag several intentional,
    // working patterns in the existing codebase — e.g. loading persisted state
    // on mount, toast-on-phase-change effects, and locally-defined <Header>
    // components. Refactoring those belongs in a dedicated change, not this
    // tooling PR, so they are warnings (visible, non-blocking) for now and
    // tracked for follow-up in the README roadmap.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/refs": "warn",
    },
  },
];

export default eslintConfig;
