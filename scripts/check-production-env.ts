import { loadEnvConfig } from "@next/env";
import { validateProductionConfig } from "../src/lib/production-config";

loadEnvConfig(process.cwd());
const result = validateProductionConfig(process.env);

if (!result.valid) {
  console.error("Production environment validation failed:");
  for (const issue of result.issues) console.error(`- ${issue.variable}: ${issue.message}`);
  process.exitCode = 1;
} else {
  console.log(`Production environment validation passed for ${result.checked.length} required settings. Secret values were not printed.`);
}
