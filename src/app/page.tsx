import Link from "next/link";
import { getAllClients } from "@/lib/clients";
import { formatPrice } from "@/lib/format";
import { resolveLocalizedText } from "@/lib/i18n";

export default function HomePage() {
  const clients = getAllClients();

  return (
    <main className="mx-auto flex min-h-screen-safe max-w-[480px] flex-col justify-between bg-[var(--bg-surface)] px-4 py-8 shadow-sm sm:px-5">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
          <span>OrderPage Template</span>
          <span>•</span>
          <span>Stage 1 UI Demo</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          বাংলাদেশি ফেসবুক সেলারদের জন্য সিঙ্গেল-প্রোডাক্ট অর্ডার পেজ
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Select a configured storefront below to preview the 360px-first product page and Cash on Delivery checkout flow.
        </p>

        <div className="mt-6 space-y-3">
          {clients.map((client) => {
            const brandName = resolveLocalizedText(client.brand.name, "bn");
            const productTitle = resolveLocalizedText(client.product.title, "bn");
            return (
              <Link
                key={client.slug}
                href={`/${client.slug}`}
                className="group block rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 transition hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      /{client.slug} • {client.orderPrefix}
                    </span>
                    <h2 className="mt-0.5 text-lg font-bold text-[var(--text-primary)] group-hover:underline">
                      {brandName}: {productTitle}
                    </h2>
                  </div>
                  <span
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold text-white"
                    style={{ backgroundColor: client.brand.primaryColor }}
                  >
                    {formatPrice(client.product.price, "bn")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <footer className="mt-10 border-t border-[var(--border-subtle)] pt-4 text-center text-xs text-[var(--text-muted)]">
        OrderPage: Portable Next.js App Router Storefront
      </footer>
    </main>
  );
}
