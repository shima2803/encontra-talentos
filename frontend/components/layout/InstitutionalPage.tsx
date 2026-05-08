import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

type Section = {
  title: string;
  content: string;
  bullets?: string[];
};

type InstitutionalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
  ctaTitle?: string;
  ctaText?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function InstitutionalPage({
  eyebrow,
  title,
  description,
  sections,
  ctaTitle = 'Pronto para continuar?',
  ctaText = 'Acesse a área de candidatura e mantenha seus dados atualizados.',
  ctaLabel = 'Enviar candidatura',
  ctaHref = '/candidatura',
}: InstitutionalPageProps) {
  return (
    <main className="bg-slate-50/70">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-10">
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm">
              {eyebrow}
            </span>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {title}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              {description}
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-10">
            {sections.map((section) => (
              <div
                key={section.title}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6"
              >
                <h2 className="text-lg font-semibold text-slate-900">
                  {section.title}
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {section.content}
                </p>

                {section.bullets?.length ? (
                  <ul className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 leading-6">
                        <CheckCircle2
                          size={17}
                          className="mt-0.5 shrink-0 text-brand-600"
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}

            <div className="rounded-3xl bg-slate-900 p-6 text-white sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{ctaTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {ctaText}
                </p>
              </div>

              <Link
                href={ctaHref}
                className="mt-5 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 sm:mt-0"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}