const paths: Record<string, string> = {
    arrow_forward: "M4 12h16m-6-6 6 6-6 6",
    calendar_today: "M5 5h14v16H5zM8 3v4m8-4v4M5 10h14",
    event_repeat: "M5 5h14v16H5zM8 3v4m8-4v4M5 10h14M9 14h6m-6 3h4",
    checklist: "m3 6 2 2 3-4m3 2h10M3 13l2 2 3-4m3 2h10M3 20l2 2 3-4m3 2h10",
    check_circle: "M9 12l2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    verified: "m9 12 2 2 4-4M12 2l3 2 4 1 1 4 2 3-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-3 1-4 4-1z",
    hourglass_top: "M6 3h12M6 21h12M7 3v4l10 10v4M17 3v4L7 17v4",
    radio_button_unchecked: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    account_balance_wallet: "M3 6h17v15H3zM3 6V3h14v3m3 7h-6v4h6",
    payments: "M2 5h20v14H2zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 9v6m14-6v6",
    map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16",
    explore: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0m-6-4-3 7-5 1 3-7z",
    pin_drop: "M12 22s8-8 8-14a8 8 0 0 0-16 0c0 6 8 14 8 14m3-14a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    photo_library: "M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M16 7h.01",
    mark_email_read: "M3 5h18v14H3zM3 5l9 8 9-8",
    mark_email_unread: "M3 5h18v14H3zM3 5l9 8 9-8",
    diversity_3: "M9 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0M6 22v-5a6 6 0 0 1 12 0v5M2 8v5m20-5v5M1 21v-5m22 0v5",
    admin_panel_settings: "m12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6zM8 12l3 3 5-6",
    restaurant: "M5 2v7m-3-7v5a3 3 0 0 0 6 0V2M5 10v12M18 2v20m0-20c-5 2-5 11 0 11",
    celebration: "m3 21 4-14 10 10zM14 3v3m5-1-2 3m5 3h-4",
    check_box: "M3 3h18v18H3zM7 12l3 3 7-7",
    filter_alt: "M3 3h18l-7 8v9l-4-2v-7z",
    styler: "M12 3a2 2 0 0 1 0 4v3L2 17v3h20v-3l-10-7",
    signal_cellular_alt: "M4 20v-4m8 4V10m8 10V4",
    wifi: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0m-4 4h.01",
    battery_full: "M2 6h18v12H2zM23 10v4M5 9h12v6H5z",
};
export function Icon({ name, className = "" }: {
    name: string;
    className?: string;
}) {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`inline-block h-[1em] w-[1em] shrink-0 ${className}`}><path d={paths[name] ?? paths.check_circle}/></svg>;
}
export function Brand() {
    return <Link href="/" aria-label="Make My Marriage home" className="inline-flex items-center gap-3 shrink-0">
    <svg aria-hidden="true" width="38" height="38" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="#7e6348"/><path d="M24 10C24 18 16 24 16 24s8 2 8 14c0-12 8-14 8-14s-8-6-8-14Z" fill="#7e6348"/><circle cx="24" cy="24" r="2.5" fill="#fff8f3"/></svg>
    <span><span className="block font-serif text-lg sm:text-xl leading-tight">Make My <span className="text-primary">Marriage</span></span><span className="block text-[8px] tracking-[0.24em] mt-1 text-on-surface-variant uppercase">Wedding atelier</span></span>
  </Link>;
}
import Link from "next/link";
