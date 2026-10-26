import { z } from "zod";

export const createMemberInvitationSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"], { message: "Choose Admin, Manager, or Member." }),
}).strict();

export const acceptMemberInvitationSchema = z.object({
  token: z.string().min(32, "This invitation link is invalid.").max(512),
}).strict();

export type CreateMemberInvitationInput = z.infer<typeof createMemberInvitationSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"], { message: "Choose Admin, Manager, or Member." }),
  grants: z.array(z.enum(["CAN_MODERATE_GALLERY"])).max(1).optional(),
}).strict().superRefine((value, context) => {
  if (value.role !== "MANAGER" && value.grants?.length) context.addIssue({ code: "custom", path: ["grants"], message: "Only Managers can receive gallery moderation access." });
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
