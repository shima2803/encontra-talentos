import { InstitutionalPage } from '@/components/layout/InstitutionalPage';

export default function ContatoPage() {
  return (
    <InstitutionalPage
      eyebrow="Atendimento"
      title="Contato"
      description="Fale com nossa equipe para dúvidas sobre vagas, candidaturas, banco de talentos, parcerias comerciais ou tratamento de dados. Nosso atendimento é realizado por e-mail para manter o histórico da solicitação organizado."
      sections={[
        {
          title: 'E-mail de atendimento',
          content:
            'Envie sua mensagem para pontetalentos@gmail.com informando nome completo, telefone, motivo do contato e, se já tiver enviado candidatura, a vaga de interesse. Assim conseguimos direcionar sua solicitação com mais agilidade.',
          bullets: [
            'Candidatos: dúvidas sobre currículo, candidatura, banco de talentos e atualização de informações.',
            'Empresas: divulgação de vagas, parcerias, soluções de recrutamento e contato comercial.',
          ],
        },
        {
          title: 'Prazo e organização do atendimento',
          content:
            'As mensagens são analisadas conforme a ordem de recebimento e a complexidade do assunto. Para assuntos relacionados a dados pessoais, identifique claramente a solicitação para que a equipe aplique o fluxo de privacidade adequado.',
          bullets: [
            'Use um assunto objetivo no e-mail, como “Dúvida sobre candidatura” ou “Solicitação LGPD”.',
            'Evite enviar documentos sensíveis que não sejam necessários para o atendimento.',
          ],
        },
        {
          title: 'Antes de entrar em contato',
          content:
            'Confira se seus dados de candidatura estão completos e se o currículo anexado está atualizado. Essas informações ajudam a equipe a entender melhor seu perfil e reduzem retrabalho durante a triagem.',
        },
      ]}
      ctaLabel="Enviar candidatura"
      ctaHref="/candidatura"
    />
  );
}