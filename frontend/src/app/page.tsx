const featureCards = [
  'Create Room',
  'Join Room',
  'Public Rooms',
  'How To Play'
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-text">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            MariTycoon
          </p>
          <h1 className="text-4xl font-bold">Monopoli Indonesia Online</h1>
          <p className="max-w-2xl text-base text-slate-600">
            Fondasi aplikasi multiplayer realtime untuk membuat room, berbagi
            kode, dan bermain Monopoli Indonesia dari browser.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => (
            <article
              className="rounded-lg border border-slate-200 bg-surface p-5 shadow-sm"
              key={feature}
            >
              <h2 className="text-lg font-semibold">{feature}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Akan dihubungkan ke flow MVP pada phase implementasi berikutnya.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
