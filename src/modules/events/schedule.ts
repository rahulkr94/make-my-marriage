import { Temporal } from "@js-temporal/polyfill";
import { AuthError } from "@/modules/auth/request-security";

type ScheduleInput = { localDate: string; startLocalTime: string; endLocalTime?: string | null; endsNextDay?: boolean };
export function resolveEventSchedule(input: ScheduleInput, timeZone: string) {
  const date = Temporal.PlainDate.from(input.localDate);
  function instant(localDate: Temporal.PlainDate, time: string, path: string) {
    try {
      const zoned = localDate.toPlainDateTime(Temporal.PlainTime.from(time)).toZonedDateTime(timeZone, { disambiguation: "reject" });
      return new Date(zoned.epochMilliseconds);
    } catch {
      throw new AuthError("VALIDATION_ERROR", "Check the ceremony time in the wedding time zone.", 400, [{ path, message: `This local time is skipped or repeated by a clock change in ${timeZone}. Choose an unambiguous time.` }]);
    }
  }
  const startsAtUtc = instant(date, input.startLocalTime, "startLocalTime");
  const endDate = input.endsNextDay ? date.add({ days: 1 }) : date;
  const endsAtUtc = input.endLocalTime ? instant(endDate, input.endLocalTime, "endLocalTime") : null;
  if (endsAtUtc && endsAtUtc <= startsAtUtc) throw new AuthError("VALIDATION_ERROR", "The event must end after it starts.", 400, [{ path: "endLocalTime", message: "Choose a later end time." }]);
  return { startsAtUtc, endsAtUtc, timeZone };
}
export function getDirectionsUrl(address: string, mapUrl?: string | null) {
  return mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
