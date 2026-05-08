import { InstitutionalPage } from '@/components/layout/InstitutionalPage';

export default function BancoDeTalentosPage() {
  return (
    <InstitutionalPage
      eyebrow="Para candidatos"
      title="Banco de talentos"
      description="Cadastre seu currículo para participar de futuras oportunidades compatíveis com seu perfil profissional, mesmo quando não houver uma vaga aberta exatamente para sua área no momento."
      sections={[
        {
          title: 'Como funciona',
          content:
            'Ao optar pelo banco de talentos, suas informações ficam disponíveis para análise da equipe de recrutamento quando surgirem vagas alinhadas ao seu perfil, nível profissional, localidade, habilidades e objetivos de carreira.',
          bullets: [
            'Você pode indicar área, nível profissional, pretensão salarial e habilidades.',
            'O currículo anexado complementa as informações do formulário de candidatura.',
          ],
        },
        {
          title: 'Por que manter o perfil completo',
          content:
            'Perfis com dados atualizados facilitam a triagem e aumentam a chance de serem encontrados em futuras buscas. Informações claras ajudam a equipe a entender sua experiência e direcionar oportunidades mais adequadas.',
          bullets: [
            'Revise contatos para não perder comunicações importantes.',
            'Atualize habilidades, ferramentas e experiências recentes.',
          ],
        },
        {
          title: 'Privacidade no banco de talentos',
          content:
            'A permanência no banco de talentos depende da sua autorização no formulário. Você pode solicitar atualização ou remoção dos seus dados conforme as orientações de privacidade e LGPD disponíveis na plataforma.',
        },
      ]}
      ctaLabel="Cadastrar currículo"
      ctaHref="/candidatura"
    />
  );
}