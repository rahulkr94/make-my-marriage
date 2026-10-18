import { errorResponse } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { AuthError, getClientKey } from "@/modules/auth/request-security";
import { getPublicGuestInvitation } from "@/modules/invitations/service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await enforceRateLimit(getClientKey(request, "public-guest-invitation"), 120, 15 * 60 * 1000);
    const { token } = await params;
    const invitation = await getPublicGuestInvitation(token);
    if (!invitation) throw new AuthError("INVITATION_UNAVAILABLE", "This invitation link is no longer available.", 404);
    return Response.json({ data: invitation }, { headers: credentialHeaders });
  } catch (error) {
    const response = errorResponse(error);
    for (const [key, value] of Object.entries(credentialHeaders)) response.headers.set(key, value);
    return response;
  }
}

const credentialHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};
