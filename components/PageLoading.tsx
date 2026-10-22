export default function PageLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-8" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-zinc-200" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-zinc-200" />
      <div className="h-48 w-full animate-pulse rounded-2xl bg-zinc-100" />
      <div className="h-32 w-full animate-pulse rounded-2xl bg-zinc-100" />
    </main>
  );
}
