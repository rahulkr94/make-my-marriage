import { Brand } from "@/components/marketing/brand";

const navigationRows = Array.from({ length: 10 }, (_, index) => index);
const metricRows = Array.from({ length: 4 }, (_, index) => index);

export default function WorkspaceLoading() {
  return (
    <div aria-busy="true" aria-label="Loading wedding workspace" className="min-h-svh bg-surface text-on-surface">
      <span className="sr-only">Loading wedding workspace…</span>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col gap-4 overflow-hidden bg-surface-container-low px-5 py-6 shadow-sm xl:flex">
        <div className="min-h-0 flex-1 overflow-hidden">
          <Brand />
          <div className="mt-7 space-y-2 motion-safe:animate-pulse">
            {navigationRows.map((item) => <div key={item} className={`h-11 rounded-lg ${item === 0 ? "bg-surface-container-high" : "bg-surface-container/75"}`} />)}
          </div>
        </div>
        <div className="h-24 shrink-0 rounded-xl bg-surface shadow-sm motion-safe:animate-pulse" />
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-30 border-b border-outline-variant/25 bg-surface/95 px-5 py-3 backdrop-blur xl:hidden">
          <div className="flex items-center justify-between"><Brand /><span className="size-9 rounded-full bg-surface-container-high motion-safe:animate-pulse" /></div>
          <div className="mt-3 flex gap-2 overflow-hidden">{[0, 1, 2, 3].map((item) => <span key={item} className="h-7 w-20 shrink-0 rounded-full bg-surface-container motion-safe:animate-pulse" />)}</div>
        </header>
        <header className="hidden h-16 items-center justify-between border-b border-outline-variant/20 bg-surface/90 px-8 xl:flex">
          <div className="h-4 w-48 rounded-full bg-surface-container-high motion-safe:animate-pulse" />
          <div className="h-7 w-20 rounded-full bg-surface-container motion-safe:animate-pulse" />
        </header>

        <main className="mx-auto max-w-[1320px] px-5 pb-20 pt-8 sm:px-8 xl:px-12">
          <div className="motion-safe:animate-pulse">
            <div className="h-3 w-40 rounded-full bg-primary-fixed" />
            <div className="mt-4 h-11 w-full max-w-xl rounded-lg bg-surface-container-high" />
            <div className="mt-3 h-5 w-full max-w-2xl rounded-lg bg-surface-container" />
            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metricRows.map((item) => <div key={item} className="h-32 rounded-xl border-b-4 border-outline-variant bg-surface-container-low shadow-sm" />)}
            </div>
            <div className="mt-8 h-24 rounded-xl bg-surface-container-low shadow-sm" />
            <div className="mt-6 h-72 rounded-xl bg-surface-container-low shadow-sm" />
          </div>
        </main>
      </div>
    </div>
  );
}
