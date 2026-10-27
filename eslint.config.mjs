// Next 16 移除了 `next lint`,改用 ESLint 9 的 flat config;规则仍是 next/core-web-vitals。
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  // prototype/ 是生成产物(gitignored),next-env.d.ts 由 Next 生成
  globalIgnores([".next/**", "out/**", "prototype/**", "next-env.d.ts"]),
]);
