import { InstitutionalPage } from '@/components/layout/InstitutionalPage';

export default function TermosDeUsoPage() {
  return (
    <InstitutionalPage
      eyebrow="Legal"
      title="Termos de uso"
      description="Estes termos apresentam as regras gerais para utilização do Encontra Talentos por candidatos, empresas e demais usuários da plataforma."
      sections={[
        {
          title: 'Uso da plataforma',
          content:
            'O usuário deve utilizar a plataforma de forma responsável, fornecendo informações verdadeiras, atualizadas e compatíveis com a finalidade de recrutamento. O envio de dados falsos, documentos de terceiros ou informações que prejudiquem outros usuários pode resultar em remoção da candidatura.',
          bullets: [
            'Preencha formulários com dados próprios e atualizados.',
            'Anexe currículos e documentos relacionados somente ao seu perfil profissional.',
          ],
        },
        {
          title: 'Candidaturas e banco de talentos',
          content:
            'A candidatura não garante contratação, entrevista ou retorno imediato. As informações enviadas serão avaliadas conforme aderência às vagas disponíveis, critérios definidos pelas empresas e necessidades internas de recrutamento.',
          bullets: [
            'O banco de talentos pode ser consultado para oportunidades futuras.',
            'Manter currículo e habilidades atualizados aumenta a qualidade da análise.',
          ],
        },
        {
          title: 'Disponibilidade e melhorias',
          content:
            'A plataforma poderá passar por ajustes, manutenções, mudanças de layout, melhorias de segurança ou indisponibilidades temporárias. Sempre que possível, buscamos preservar a estabilidade do serviço e a integridade das informações cadastradas.',
        },
        {
          title: 'Responsabilidades',
          content:
            'O Encontra Talentos atua como portal de apoio à divulgação de vagas, organização de candidaturas e triagem inicial. Empresas e recrutadores podem definir critérios específicos de seleção, etapas adicionais e comunicações relacionadas aos processos seletivos.',
        },
      ]}
      ctaLabel="Ver vagas"
      ctaHref="/vagas"
    />
  );
}