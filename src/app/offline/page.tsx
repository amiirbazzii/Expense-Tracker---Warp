import Link from "next/link";

/**
 * Offline fallback document.
 *
 * The service worker serves this page when the user is offline and navigates
 * to a route whose HTML is not in the cache (see `fallbacks.document` in
 * next.config.js). It must stay static, auth-free and dependency-light — it is
 * precached at install time and has to render with no network at all.
 *
 * It deliberately links to /add: the app shell warm-up caches that route on
 * first launch, so the link works offline even when the current route didn't.
 */
export const metadata = {
  title: "Offline — Spendly",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      {/* Plain <img>, deliberately: next/image serves via /_next/image, a
          server endpoint that may be uncached in exactly the situation this
          page exists for. /logo.webp itself is precached. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.webp"
        alt="Spendly"
        width={64}
        height={64}
        className="mb-6 rounded-xl"
      />
      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        You&apos;re offline
      </h1>
      <p className="text-sm text-gray-600 mb-6 max-w-xs">
        This screen hasn&apos;t been saved for offline use yet. Your data is
        safe on this device — head back to a saved screen to keep working.
      </p>
      <Link
        href="/add"
        className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white"
      >
        Go to the app
      </Link>
    </div>
  );
}
