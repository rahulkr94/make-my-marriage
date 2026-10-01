"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Brand, Icon } from "./brand";
export function LaunchButton({ children, className = "", href = "/signup" }: {
    children: ReactNode;
    className?: string;
    href?: string;
}) {
    return <Link href={href} className={className}>{children}</Link>;
}
const links = [["Features", "features"], ["How it works", "how-it-works"], ["FAQ", "faq"]];
export function Navigation({ workspaceHref, workspaceLabel, userName }: { workspaceHref?: string; workspaceLabel?: string; userName?: string }) {
    const [open, setOpen] = useState(false);
    return <header className="sticky top-0 z-40 border-b border-outline-variant/25 bg-surface/95 backdrop-blur-xl">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin h-20 flex items-center justify-between gap-4">
      <Brand />
      <nav aria-label="Main navigation" className="hidden lg:flex gap-7 text-body-sm">{links.map(([label, id]) => <a key={id} href={`#${id}`} className="hover:text-primary">{label}</a>)}</nav>
      <div className="hidden md:flex items-center gap-5">
        {workspaceHref ? <><span className="flex items-center gap-2 text-body-sm font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-label-md text-tertiary">{userName?.trim().charAt(0).toUpperCase()}</span><span className="max-w-36 truncate">{userName}</span></span><LaunchButton href={workspaceHref} className="rounded bg-primary text-on-primary px-5 py-3 text-body-sm hover:bg-primary-container">{workspaceLabel}</LaunchButton></> : <><LaunchButton href="/login" className="text-body-sm px-3 py-3">Log in</LaunchButton><LaunchButton className="rounded bg-primary text-on-primary px-5 py-3 text-body-sm hover:bg-primary-container">Create your wedding</LaunchButton></>}
      </div>
      <button type="button" className="lg:hidden h-11 w-11 flex items-center justify-center rounded border border-outline-variant" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={open ? "m6 6 12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"}/></svg>
      </button>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="lg:hidden border-t border-outline-variant/30 px-5 py-4 flex flex-col gap-1" onKeyDown={(event) => { if (event.key === "Escape")
            setOpen(false); }}>
      {links.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="py-3">{label}</a>)}
      {workspaceHref ? <div className="md:hidden mt-2 border-t border-outline-variant/30 pt-4"><p className="mb-3 flex items-center gap-2 text-body-sm font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-label-md text-tertiary">{userName?.trim().charAt(0).toUpperCase()}</span><span>{userName}</span></p><LaunchButton href={workspaceHref} className="block rounded bg-primary text-on-primary px-5 py-3 text-center">{workspaceLabel}</LaunchButton></div> : <><LaunchButton href="/login" className="md:hidden py-3 text-left">Log in</LaunchButton><LaunchButton className="md:hidden rounded bg-primary text-on-primary px-5 py-3 mt-2">Create your wedding</LaunchButton></>}
    </nav>}
  </header>;
}
export function GuestRsvpDemo() {
    const [response, setResponse] = useState("yes");
    const [count, setCount] = useState(2);
    const [saved, setSaved] = useState(false);
    return <form className="bg-surface-container-high rounded-lg p-4" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
    <fieldset><legend className="text-body-sm font-semibold">Try a sample RSVP</legend><p className="text-label-sm text-on-surface-variant mt-1 mb-3">Demo only. No response is sent or saved.</p>
      <div className="flex flex-wrap gap-4 text-body-sm">{[["yes", "Joyfully accept"], ["no", "Unable to attend"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 py-2 cursor-pointer"><input type="radio" name="demo-rsvp" value={value} checked={response === value} onChange={() => { setResponse(value); setSaved(false); }}/>{label}</label>)}</div>
      {response === "yes" && <label className="flex justify-between items-center gap-3 mt-3 text-body-sm">Attendees, including you<select value={count} onChange={(event) => { setCount(Number(event.target.value)); setSaved(false); }} className="bg-surface rounded border border-outline-variant px-3 py-2">{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
      <button type="submit" className="mt-4 w-full rounded bg-primary text-on-primary px-4 py-3 text-body-sm">Preview response <Icon name="arrow_forward"/></button>
      <p role="status" className="mt-3 text-body-sm text-secondary min-h-5">{saved ? response === "yes" ? `Sample response: attending with ${count} ${count === 1 ? "attendee" : "attendees"}.` : "Sample response: unable to attend, 0 attendees." : ""}</p>
    </fieldset>
  </form>;
}
const faqs = [
    ["Can I create an account today?", "Yes. You can create an account, set up your wedding workspace, and update its foundational details. Events, expenses, and photos shown on this page remain illustrative examples while those features are developed."],
    ["Will guests need an app or an account?", "No. Guests will open their invitation link or scan its QR code in a mobile browser to see invited events, get directions, and respond."],
    ["Can we invite guests to some events and not others?", "Yes. Each guest will have a personal invitation showing only their assigned events. Responses and attendee counts will be recorded separately for each event."],
    ["How will parents and siblings collaborate?", "Admins will manage wedding settings and membership. Managers will help with events, guests, tasks, vendors, and expenses. Members will view shared details and update the status of tasks assigned to them."],
    ["How will invitations and photos stay private?", "Guest links will be revocable and limited to the invited events. Gallery link holders will see only approved photos. Expenses and private documents will require an authorized member account. Anyone holding a guest link can use it, so share it carefully."],
    ["Can both partners manage the same wedding?", "Yes. Both partners can be admins of the same wedding workspace. Each account can belong to one active wedding at a time."],
];
export function Faq() {
    return <div className="max-w-3xl mx-auto space-y-3">{faqs.map(([question, answer], i) => <details key={question} className="faq-item bg-surface-container-low rounded-lg px-5 sm:px-6" open={i === 0}>
    <summary className="py-5 flex justify-between items-center gap-5 cursor-pointer text-body-md font-semibold">{question}<span aria-hidden="true" className="faq-plus text-primary text-xl font-normal">+</span></summary>
    <p className="pb-6 text-body-md text-on-surface-variant leading-7">{answer}</p>
  </details>)}</div>;
}
