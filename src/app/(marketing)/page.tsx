export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16 sm:px-10">
      <div className="w-full max-w-3xl text-center">
        <div aria-hidden="true" className="mx-auto mb-10 h-px w-16 bg-accent" />
        <h1 className="font-serif text-5xl leading-tight tracking-tight text-balance sm:text-7xl">
          Make My Marriage
        </h1>
        <p className="mt-6 font-serif text-2xl leading-relaxed text-balance sm:text-3xl">
          Every celebration, beautifully organized.
        </p>
        <p className="mx-auto mt-8 max-w-sm text-base leading-7 text-muted text-pretty">
          We’re building your wedding planning workspace.
        </p>
      </div>
    </main>
  );
}
