export default function LoadingScreen() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-screen items-center justify-center bg-[#f6f8f5] px-6"
    >
      <div className="w-full max-w-sm" role="status">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
            >
              <path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-7 8-16Z" />
              <path d="M4 21c2-5 6-9 12-12" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            AgriCore
          </span>
        </div>
        <div className="space-y-3 motion-safe:animate-pulse">
          <div className="h-7 w-2/3 rounded-lg bg-slate-200" />
          <div className="h-4 w-full rounded-md bg-slate-200" />
          <div className="h-4 w-4/5 rounded-md bg-slate-200" />
        </div>
        <p className="mt-5 text-sm text-slate-500">Loading AgriCore…</p>
      </div>
    </main>
  );
}
