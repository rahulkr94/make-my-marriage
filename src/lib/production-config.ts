const REQUIRED = [
  "APP_URL",
  "MONGODB_URI",
  "MONGODB_DB",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "CRON_SECRET",
] as const;

export type ProductionConfigIssue = { variable: (typeof REQUIRED)[number]; message: string };

export function validateProductionConfig(env: Record<string, string | undefined>) {
  const issues: ProductionConfigIssue[] = [];
  for (const variable of REQUIRED) {
    const value = env[variable]?.trim();
    if (!value || /replace|example|username:password/i.test(value)) issues.push({ variable, message: "Set a production value." });
  }
  const appUrl = env.APP_URL?.trim();
  if (appUrl && !/replace|example/i.test(appUrl)) {
    try {
      const parsed = new URL(appUrl);
      if (parsed.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(parsed.hostname)) issues.push({ variable: "APP_URL", message: "Use the public HTTPS production origin." });
      if (parsed.pathname !== "/" || parsed.search || parsed.hash) issues.push({ variable: "APP_URL", message: "Use an origin without a path, query, or fragment." });
    } catch { issues.push({ variable: "APP_URL", message: "Use a valid absolute URL." }); }
  }
  if (env.MONGODB_URI && !/^mongodb(?:\+srv)?:\/\//.test(env.MONGODB_URI)) issues.push({ variable: "MONGODB_URI", message: "Use a MongoDB connection URI." });
  if (env.MONGODB_DB && !/^[A-Za-z0-9_-]{1,64}$/.test(env.MONGODB_DB)) issues.push({ variable: "MONGODB_DB", message: "Use a simple database name with letters, numbers, hyphens, or underscores." });
  if (env.RESEND_API_KEY && !/^re_[A-Za-z0-9_]+$/.test(env.RESEND_API_KEY)) issues.push({ variable: "RESEND_API_KEY", message: "Use a Resend API key beginning with re_." });
  if (env.RESEND_FROM_EMAIL && !/^.{1,120}<[^<>\s]+@[^<>\s]+>$|^[^<>\s]+@[^<>\s]+$/.test(env.RESEND_FROM_EMAIL)) issues.push({ variable: "RESEND_FROM_EMAIL", message: "Use an email address or Name <email@example.com>." });
  if (env.R2_ACCOUNT_ID && !/^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID)) issues.push({ variable: "R2_ACCOUNT_ID", message: "Use the 32-character Cloudflare account ID." });
  if (env.CRON_SECRET && env.CRON_SECRET.length < 16) issues.push({ variable: "CRON_SECRET", message: "Use at least 16 random characters." });
  return { valid: issues.length === 0, issues, checked: [...REQUIRED] };
}
