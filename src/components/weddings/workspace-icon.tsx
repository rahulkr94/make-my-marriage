const paths = {
  arrow: "M5 12h14m-5-5 5 5-5 5",
  arrowLeft: "M19 12H5m5 5-5-5 5-5",
  badge: "M8 4h8v4a4 4 0 0 1-8 0V4Zm-3 17v-3a7 7 0 0 1 14 0v3",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4",
  calendar: "M5 6h14v14H5zM8 3v5m8-5v5M5 10h14",
  check: "m6 12 4 4 8-9",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2",
  close: "m6 6 12 12M18 6 6 18",
  copy: "M9 9h10v10H9zM5 15H4V4h11v1",
  dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  gallery: "M4 5h16v14H4zM7 15l3-3 2 2 2-3 3 4M8 9h.01",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  location: "M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  mail: "M3 5h18v14H3zM3 7l9 6 9-6",
  payments: "M3 6h18v12H3zM3 10h18m-4 4h1",
  refresh: "M20 7v5h-5M4 17v-5h5m9.5-3A7 7 0 0 0 6 7l-2 5m2 3a7 7 0 0 0 12.5 2l1.5-5",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-7 1 2.5 2.2.9 2.5-1 2 2-1 2.5.9 2.2 2.5 1v2.8l-2.5 1-.9 2.2 1 2.5-2 2-2.5-1-2.2.9-1 2.5H9.2l-1-2.5-2.2-.9-2.5 1-2-2 1-2.5-.9-2.2-2.5-1V9.2l2.5-1 .9-2.2-1-2.5 2-2 2.5 1 2.2-.9 1-2.5H12Z",
  shield: "M12 3 4 6v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6l-8-3Zm-3 9 2 2 4-5",
  sparkle: "M12 2c.8 5.4 3.6 8.2 9 9-5.4.8-8.2 3.6-9 9-.8-5.4-3.6-8.2-9-9 5.4-.8 8.2-3.6 9-9Z",
  userPlus: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 21v-3a6 6 0 0 1 12 0v3m4-10v6m-3-3h6",
  users: "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 21v-3a6 6 0 0 1 12 0v3m2-8a5 5 0 0 1 6 5v3",
} as const;

export function WorkspaceIcon({ name, className = "" }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`h-[1em] w-[1em] shrink-0 ${className}`}>
      <path d={paths[name]} />
    </svg>
  );
}
