import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-2xl py-10 text-center">
      <p aria-hidden="true" className="mb-3 text-5xl">🧭</p>
      <h1 className="page-title mb-2">We couldn&apos;t find that page</h1>
      <p className="mb-6 text-muted">No worries. Let&apos;s get you back to your plan.</p>
      <Link href="/" className="btn btn-primary">Back to home</Link>
    </section>
  );
}
