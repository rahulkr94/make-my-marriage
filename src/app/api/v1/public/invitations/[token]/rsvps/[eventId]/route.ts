import { errorResponse, readJson } from "@/modules/auth/api";
import { hashToken } from "@/modules/auth/crypto";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, getClientKey } from "@/modules/auth/request-security";
import { publicRsvpSchema } from "@/modules/rsvp/schemas";
import { submitPublicRsvp } from "@/modules/rsvp/service";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ token: string; eventId: string }> }) {
  try {
    assertSameOrigin(request);
    const { token, eventId } = await params;
    await enforceRateLimit(getClientKey(request, `public-rsvp:${hashToken(token)}`), 30, 60 * 60 * 1000);
    const input = publicRsvpSchema.parse(await readJson(request));
    const data = await submitPublicRsvp(token, eventId, input);
    return Response.json({ data }, { headers: credentialHeaders });
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
