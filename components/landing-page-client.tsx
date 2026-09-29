"use client";

import { useLanguage } from "@/lib/i18n";
import { Header } from "@/components/layout/header";
import {
  Wallet,
  ScanLine,
  ArrowDownUp,
  Scale,
  BarChart3,
  FileDown,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function LandingPageClient() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Wallet,
      title: t.landing.features.balancesTitle,
      desc: t.landing.features.balancesDesc,
    },
    {
      icon: ScanLine,
      title: t.landing.features.aiScanTitle,
      desc: t.landing.features.aiScanDesc,
    },
    {
      icon: ArrowDownUp,
      title: t.landing.features.incomeExpenseTitle,
      desc: t.landing.features.incomeExpenseDesc,
    },
    {
      icon: Scale,
      title: t.landing.features.debtsTitle,
      desc: t.landing.features.debtsDesc,
    },
    {
      icon: BarChart3,
      title: t.landing.features.reportsTitle,
      desc: t.landing.features.reportsDesc,
    },
    {
      icon: FileDown,
      title: t.landing.features.exportTitle,
      desc: t.landing.features.exportDesc,
    },
  ];

  const steps = [
    { title: t.landing.step1Title, desc: t.landing.step1Desc },
    { title: t.landing.step2Title, desc: t.landing.step2Desc },
    { title: t.landing.step3Title, desc: t.landing.step3Desc },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 text-center sm:pt-24">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
            <Sparkles className="size-3.5" /> {t.landing.heroBadge}
          </div>
          <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t.landing.heroTitle}{" "}
            <span className="text-brand">{t.landing.heroTitleHighlight}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
            {t.landing.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/demo"
              className="w-full rounded-xl bg-amber-500 px-7 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-amber-600 sm:w-auto"
            >
              {t.landing.tryDemoBtn}
            </a>
            <a
              href="/register"
              className="w-full rounded-xl bg-brand px-7 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-brand/90 sm:w-auto"
            >
              {t.landing.startTrialBtn}
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">
            {t.landing.footerText}
          </p>
        </section>

        {/* Features */}
        <section className="border-t border-line bg-muted/30 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              {t.landing.featuresTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted sm:text-base">
              {t.landing.featuresSubtitle}
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-line bg-card p-5 shadow-sm">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              {t.landing.howItWorksTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted">
              {t.landing.howItWorksSubtitle}
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.title} className="text-center">
                  <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-line bg-muted/30 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t.landing.pricingTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted sm:text-base">
              {t.landing.pricingSubtitle}
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-card p-6 text-left shadow-sm">
                <p className="text-sm font-semibold text-muted">{t.landing.monthlyPlan}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{t.landing.monthlyPrice}</span>
                  <span className="text-xs text-muted">{t.landing.monthlyPeriod}</span>
                </div>
                <ul className="mt-5 space-y-2 text-xs text-muted">
                  {t.landing.planFeatures.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="/register"
                  className="mt-6 block w-full rounded-xl border border-line bg-background py-2.5 text-center text-xs font-semibold hover:bg-muted"
                >
                  {t.landing.startTrialBtn}
                </a>
              </div>

              <div className="relative rounded-2xl border-2 border-brand bg-card p-6 text-left shadow-sm">
                <div className="absolute -top-3 right-4 rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold text-white">
                  {t.landing.yearlyBadge}
                </div>
                <p className="text-sm font-semibold text-brand">{t.landing.yearlyPlan}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{t.landing.yearlyPrice}</span>
                  <span className="text-xs text-muted">{t.landing.yearlyPeriod}</span>
                </div>
                <ul className="mt-5 space-y-2 text-xs text-muted">
                  {t.landing.planFeatures.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="/register"
                  className="mt-6 block w-full rounded-xl bg-brand py-2.5 text-center text-xs font-semibold text-white hover:bg-brand/90"
                >
                  {t.landing.startTrialBtn}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              {t.landing.faqTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted">
              {t.landing.faqSubtitle}
            </p>
            <div className="mt-8 space-y-4">
              {t.landing.faqs.map((f) => (
                <div key={f.q} className="rounded-2xl border border-line bg-card p-5">
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="mt-1.5 text-sm text-muted">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-line py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">{t.landing.ctaTitle}</h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              {t.landing.ctaSubtitle}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/register"
                className="w-full rounded-xl bg-brand px-8 py-3.5 text-center font-semibold text-white transition hover:bg-brand/90 sm:w-auto"
              >
                {t.landing.ctaBtn}
              </a>
              <a
                href="/demo"
                className="w-full rounded-xl bg-amber-500 px-8 py-3.5 text-center font-semibold text-white transition hover:bg-amber-600 sm:w-auto"
              >
                {t.landing.tryDemoBtn}
              </a>
            </div>
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: t.landing.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
