const paths = {
  arrow: "M5 12h14m-5-5 5 5-5 5",
  arrowLeft: "M19 12H5m5 5-5-5 5-5",
  badge: "M8 4h8v4a4 4 0 0 1-8 0V4Zm-3 17v-3a7 7 0 0 1 14 0v3",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4",
  building: "M4 21h16M6 21V8l6-4 6 4v13M9 21v-5h6v5M9 10h.01M15 10h.01M9 13h.01M15 13h.01",
  calendar: "M5 6h14v14H5zM8 3v5m8-5v5M5 10h14",
  camera: "M5 7h3l2-3h4l2 3h3a2 2 0 0 1 2 2v10H3V9a2 2 0 0 1 2-2Zm11 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  car: "M5 17h14l-1-6-2-4H8l-2 4-1 6Zm1-6h12M7 17v2m10-2v2M8 14h.01M16 14h.01",
  check: "m6 12 4 4 8-9",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2",
  close: "m6 6 12 12M18 6 6 18",
  copy: "M9 9h10v10H9zM5 15H4V4h11v1",
  cutlery: "M6 3v7m3-7v7M4 3v4a4 4 0 0 0 4 4v10M16 3v18m0-18c3 2 4 5 4 8h-4",
  dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  external: "M14 4h6v6m0-6-9 9M19 13v7H4V5h7",
  download: "M12 3v12m-5-5 5 5 5-5M5 21h14",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  expand: "M8 3H3v5M3 3l6 6m7-6h5v5m0-5-6 6M8 21H3v-5m0 5 6-6m7 6h5v-5m0 5-6-6",
  file: "M6 2h8l4 4v16H6zM14 2v5h5M9 12h6m-6 4h6",
  flower: "M12 10c-3-4-7-2-6 2 1 3 4 3 6 1-2 2-2 6 1 7 4 1 6-3 3-6 3 0 6-3 5-6-1-4-5-4-6 0-1-4-5-4-6 0-1 3 1 5 3 6Zm0 0v11",
  gallery: "M4 5h16v14H4zM7 15l3-3 2 2 2-3 3 4M8 9h.01",
  gift: "M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6H8.5A2.5 2.5 0 1 1 11 3.5V6m1 0h3.5A2.5 2.5 0 1 0 13 3.5V6",
  hanger: "M12 8a2 2 0 1 0-2-2m2 2v2L3 17h18l-9-7",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  location: "M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  mail: "M3 5h18v14H3zM3 7l9 6 9-6",
  music: "M9 18V5l10-2v13M9 8l10-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  payments: "M3 6h18v12H3zM3 10h18m-4 4h1",
  phone: "M6 3h4l2 5-3 2a15 15 0 0 0 5 5l2-3 5 2v4c0 1.7-1.3 3-3 3A15 15 0 0 1 3 6c0-1.7 1.3-3 3-3Z",
  refresh: "M20 7v5h-5M4 17v-5h5m9.5-3A7 7 0 0 0 6 7l-2 5m2 3a7 7 0 0 0 12.5 2l1.5-5",
  trash: "M4 7h16m-10 4v6m4-6v6M8 7l1-3h6l1 3m2 0-1 14H7L6 7",
  undo: "M9 7 4 12l5 5m-5-5h9a7 7 0 0 1 7 7",
  upload: "M12 16V4m-5 5 5-5 5 5M5 20h14",
  plus: "M12 5v14M5 12h14",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-7 1 2.5 2.2.9 2.5-1 2 2-1 2.5.9 2.2 2.5 1v2.8l-2.5 1-.9 2.2 1 2.5-2 2-2.5-1-2.2.9-1 2.5H9.2l-1-2.5-2.2-.9-2.5 1-2-2 1-2.5-.9-2.2-2.5-1V9.2l2.5-1 .9-2.2-1-2.5 2-2 2.5 1 2.2-.9 1-2.5H12Z",
  search: "m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  shield: "M12 3 4 6v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6l-8-3Zm-3 9 2 2 4-5",
  sparkle: "M12 2c.8 5.4 3.6 8.2 9 9-5.4.8-8.2 3.6-9 9-.8-5.4-3.6-8.2-9-9 5.4-.8 8.2-3.6 9-9Z",
  userPlus: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 21v-3a6 6 0 0 1 12 0v3m4-10v6m-3-3h6",
  users: "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 21v-3a6 6 0 0 1 12 0v3m2-8a5 5 0 0 1 6 5v3",
  video: "M3 6h13v12H3zM16 10l5-3v10l-5-3",
} as const;

export function WorkspaceIcon({ name, className = "" }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`h-[1em] w-[1em] shrink-0 ${className}`}>
      <path d={paths[name]} />
    </svg>
  );
}
