/**
 * Placeholder root route so the app builds. Real feature pages are Codex's lane
 * (see CONVENTIONS.md / AGENTS.md ownership). Kept intentionally minimal and
 * token-driven — not a feature UI.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <span className="inline-flex w-fit items-center rounded-full bg-wb-yellow px-3 py-1 text-sm font-semibold text-wb-yellow-ink">
        Workshop Buddy
      </span>
      <h1 className="text-3xl font-bold">Backend foundation is live.</h1>
      <p className="text-wb-ink-muted">
        The schema, pricing engine, and wishlist API are ready. Feature UI is built by Codex
        against the contract in <code>CONVENTIONS.md</code>.
      </p>
    </main>
  );
}
