import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.").max(254);
const password = z.string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use no more than 128 characters.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email,
  password,
  confirmPassword: z.string(),
}).strict().refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
}).strict();

export const passwordResetRequestSchema = z.object({ email }).strict();

export const passwordResetSchema = z.object({
  token: z.string().min(32).max(512),
  password,
  confirmPassword: z.string(),
}).strict().refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
