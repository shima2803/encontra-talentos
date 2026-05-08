import { InstitutionalPage } from '@/components/layout/InstitutionalPage';

export default function SobreNosPage() {
  return (
    <InstitutionalPage
      eyebrow="Empresa"
      title="Sobre nós"
      description="O Encontra Talentos conecta profissionais a oportunidades de forma simples, organizada e segura, apoiando empresas na divulgação de vagas e candidatos no envio de informações completas para análise."
      sections={[
        {
          title: 'Nossa missão',
          content:
            'Facilitar o encontro entre empresas e candidatos por meio de processos claros, informações bem estruturadas e uma experiência profissional desde a busca por vagas até o envio da candidatura.',
          bullets: [
            'Reduzir barreiras para candidatos encontrarem oportunidades compatíveis.',
            'Apoiar empresas com cadastros mais completos e fáceis de analisar.',
          ],
        },
        {
          title: 'Nossa atuação',
          content:
            'Trabalhamos com divulgação de vagas, cadastro de currículos, formação de banco de talentos, organização de habilidades e apoio à triagem inicial. A plataforma centraliza dados importantes para melhorar a comunicação entre candidatos e equipes de recrutamento.',
          bullets: [
            'Cadastro de perfil profissional com currículo e competências.',
            'Páginas institucionais, termos e políticas para orientar o uso do portal.',
          ],
        },
        {
          title: 'Compromisso com a experiência',
          content:
            'Buscamos uma jornada objetiva, acessível e confiável. Por isso, valorizamos formulários organizados, linguagem clara, segurança das informações e páginas com conteúdo suficiente para orientar o usuário em cada etapa.',
        },
      ]}
      ctaLabel="Enviar candidatura"
      ctaHref="/candidatura"
    />
  );
}