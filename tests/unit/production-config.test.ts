import { describe, expect, it } from "vitest";
import { validateProductionConfig } from "@/lib/production-config";

const valid = {
  APP_URL: "https://wedding.myshaadi.in",
  MONGODB_URI: "mongodb+srv://account:secret@cluster.mongodb.net/",
  MONGODB_DB: "make_my_marriage",
  RESEND_API_KEY: "re_abcdefghijklmnopqrstuvwxyz",
  RESEND_FROM_EMAIL: "Make My Marriage <hello@wedding.myshaadi.in>",
  R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  R2_ACCESS_KEY_ID: "access-key",
  R2_SECRET_ACCESS_KEY: "secret-key",
  R2_BUCKET_NAME: "private-wedding-files",
  CRON_SECRET: "a-long-random-cron-secret",
};

describe("production configuration", () => {
  it("accepts a complete production configuration without returning values", () => {
    const result = validateProductionConfig(valid);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(valid.R2_SECRET_ACCESS_KEY);
  });

  it("reports actionable variable names for unsafe launch values", () => {
    const result = validateProductionConfig({ ...valid, APP_URL: "http://localhost:3000", CRON_SECRET: "short", R2_ACCOUNT_ID: "replace_me" });
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ variable: "APP_URL" }),
      expect.objectContaining({ variable: "CRON_SECRET" }),
      expect.objectContaining({ variable: "R2_ACCOUNT_ID" }),
    ]));
  });
});
