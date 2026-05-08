import Link from 'next/link';
import { Mail, MapPin, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

const contactEmail = 'pontetalentos@gmail.com';

function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr,1fr,1fr,1fr]">
          <div>
            <Logo iconSize={52} />

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
              Conectamos profissionais e empresas com vagas, currículos e banco
              de talentos.
            </p>

            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-2 transition hover:text-brand-600"
              >
                <Mail size={16} />
                {contactEmail}
              </a>

              <div className="flex items-center gap-2">
                <MapPin size={16} />
                Atendimento online no Brasil
              </div>

              <div className="flex items-center gap-2">
                <ShieldCheck size={16} />
                Dados usados em recrutamento
              </div>
            </div>
          </div>

          <FooterColumn
            title="Para candidatos"
            description="Encontre vagas e atualize seu perfil."
            items={[
              { label: 'Buscar vagas abertas', href: '/vagas' },
              { label: 'Enviar candidatura completa', href: '/candidatura' },
              {
                label: 'Entrar no banco de talentos',
                href: '/banco-de-talentos',
              },
            ]}
          />

          <FooterColumn
            title="Empresa"
            description="Canais institucionais e parcerias."
            items={[
              { label: 'Sobre o Encontra Talentos', href: '/sobre-nos' },
              { label: 'Contato comercial e suporte', href: '/contato' },
              { label: 'Trabalhe conosco', href: '/trabalhe-conosco' },
            ]}
          />

          <FooterColumn
            title="Legal e privacidade"
            description="Regras, privacidade e dados."
            items={[
              {
                label: 'Termos de uso da plataforma',
                href: '/termos-de-uso',
              },
              {
                label: 'Política de privacidade',
                href: '/politica-de-privacidade',
              },
              { label: 'LGPD e direitos do titular', href: '/lgpd' },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-slate-100 pt-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} Encontra Talentos. Portal de
            recrutamento integrado à API.
          </span>

          <span>
            Processos seletivos, banco de talentos e contato com candidatos.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="font-semibold text-slate-900">{title}</h4>

      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-sm text-slate-600 transition hover:text-brand-600"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { Footer };
export default Footer;