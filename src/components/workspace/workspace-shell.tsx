import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/marketing/brand";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";

type User = { name: string; email: string };
type Wedding = { brideName: string; groomName: string; weddingDate: string };
type Section = "events" | "guests" | "invitations";

export function WorkspaceShell({ user, wedding, role, active, title, children }: { user: User; wedding: Wedding; role: string; active: Section; title: string; children: ReactNode }) {
  const planner = role === "ADMIN" || role === "MANAGER";
  return <div className="min-h-svh bg-surface text-on-surface">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col justify-between bg-surface-container-low px-5 py-6 shadow-sm xl:flex">
      <div><Brand /><div className="mt-7 rounded-xl bg-surface p-4 shadow-sm"><p className="font-serif text-headline-sm">{wedding.brideName} &amp; {wedding.groomName}</p><p className="mt-1 text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">{formatDate(wedding.weddingDate)}</p></div><nav aria-label="Workspace sections" className="mt-6 space-y-1"><Nav href="/dashboard" icon="dashboard">Overview</Nav><Nav href="/events" icon="calendar" active={active === "events"}>Events</Nav>{planner && <Nav href="/guests" icon="users" active={active === "guests"}>Guests</Nav>}{planner && <Nav href="/guests/invitations" icon="mail" active={active === "invitations"}>Invitations</Nav>}{role === "ADMIN" && <Nav href="/members" icon="badge">Members</Nav>}<Nav icon="check">Tasks</Nav><Nav icon="payments">Expenses</Nav><Nav icon="gallery">Gallery</Nav>{role === "ADMIN" && <Nav href="/settings/wedding" icon="settings">Settings</Nav>}</nav></div>
      <div className="rounded-xl bg-surface p-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-label-md font-semibold text-on-primary">{initials(user.name)}</span><div className="min-w-0"><p className="truncate text-body-sm font-semibold">{user.name}</p><p className="truncate text-label-sm text-on-surface-variant">{roleLabel(role)}</p></div></div><div className="mt-3"><LogoutButton compact /></div></div>
    </aside>
    <div className="xl:pl-72">
      <header className="sticky top-0 z-30 border-b border-outline-variant/25 bg-surface/95 px-5 py-3 backdrop-blur xl:hidden"><div className="flex items-center justify-between"><Brand /><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-label-sm font-semibold text-on-primary">{initials(user.name)}</span></div><nav aria-label="Mobile workspace sections" className="mt-3 flex gap-2 overflow-x-auto pb-1"><MobileNav href="/dashboard">Overview</MobileNav><MobileNav href="/events" active={active === "events"}>Events</MobileNav>{planner && <MobileNav href="/guests" active={active === "guests"}>Guests</MobileNav>}{planner && <MobileNav href="/guests/invitations" active={active === "invitations"}>Invitations</MobileNav>}{role === "ADMIN" && <MobileNav href="/members">Members</MobileNav>}{role === "ADMIN" && <MobileNav href="/settings/wedding">Settings</MobileNav>}</nav></header>
      <header className="hidden h-16 items-center justify-between border-b border-outline-variant/20 bg-surface/90 px-8 backdrop-blur xl:flex"><div className="flex items-center gap-3 text-body-sm text-on-surface-variant"><Link href="/dashboard" className="hover:text-primary">Wedding workspace</Link><span>/</span><span className="font-semibold text-on-surface">{title}</span></div><span className="rounded-full bg-surface-container px-3 py-1 text-label-sm font-semibold">{roleLabel(role)}</span></header>
      {children}
    </div>
  </div>;
}

function Nav({ href, icon, active = false, children }: { href?: string; icon: Parameters<typeof WorkspaceIcon>[0]["name"]; active?: boolean; children: ReactNode }) { const classes = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md ${active ? "bg-primary text-on-primary" : href ? "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" : "cursor-default text-outline"}`; const body = <><WorkspaceIcon name={icon} className="text-xl" /><span>{children}</span>{!href && <span className="ml-auto text-[9px] font-semibold uppercase tracking-[0.1em]">Soon</span>}</>; return href ? <Link className={classes} href={href} aria-current={active ? "page" : undefined}>{body}</Link> : <span className={classes}>{body}</span>; }
function MobileNav({ href, active = false, children }: { href: string; active?: boolean; children: ReactNode }) { return <Link href={href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-full px-3 py-1.5 text-label-md font-semibold ${active ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>{children}</Link>; }
function initials(value: string) { return value.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?"; }
function roleLabel(role: string) { return role === "ADMIN" ? "Admin" : role === "MANAGER" ? "Manager" : "Member"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
