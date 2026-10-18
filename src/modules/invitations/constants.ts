export const GUEST_INVITATION_STATUSES = ["NOT_CREATED", "READY", "SENT", "DELIVERY_FAILED", "REVOKED"] as const;
export type GuestInvitationStatus = (typeof GUEST_INVITATION_STATUSES)[number];

export const GUEST_INVITATION_STATUS_LABELS: Record<GuestInvitationStatus, string> = {
  NOT_CREATED: "Not created",
  READY: "Ready",
  SENT: "Sent",
  DELIVERY_FAILED: "Delivery failed",
  REVOKED: "Revoked",
};

export const GUEST_INVITATIONS_PAGE_SIZE = 20;
export const GUEST_INVITATION_AFTER_WEDDING_DAYS = 30;
