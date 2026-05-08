import { InstitutionalPage } from '@/components/layout/InstitutionalPage';

export default function LgpdPage() {
  return (
    <InstitutionalPage
      eyebrow="LGPD"
      title="Lei Geral de Proteção de Dados"
      description="Tratamos dados pessoais de candidatos e usuários com foco em transparência, segurança, necessidade e finalidade ligada a recrutamento, seleção e formação de banco de talentos."
      sections={[
        {
          title: 'Quais dados podem ser tratados',
          content:
            'Durante a candidatura, podemos tratar dados de identificação, contato, localização, pretensão salarial, informações profissionais, habilidades, currículo anexado e preferências relacionadas às vagas. Coletamos somente o que é necessário para avaliar compatibilidade com oportunidades e manter comunicação com o candidato.',
          bullets: [
            'Dados cadastrais: nome, e-mail, telefone, estado, cidade e data de nascimento.',
            'Dados profissionais: currículo, habilidades, nível profissional, área de interesse e vaga desejada.',
          ],
        },
        {
          title: 'Finalidades do tratamento',
          content:
            'As informações são utilizadas para receber candidaturas, organizar o banco de talentos, apoiar triagens, entrar em contato sobre etapas seletivas e melhorar a qualidade da experiência na plataforma. Não utilizamos dados para finalidades incompatíveis com o contexto informado ao candidato.',
          bullets: [
            'Análise de aderência entre perfil, habilidades e requisitos das vagas.',
            'Comunicação sobre oportunidades, andamento de candidatura e solicitações feitas pelo usuário.',
          ],
        },
        {
          title: 'Base, consentimento e retenção',
          content:
            'Ao enviar a candidatura, o usuário confirma ciência sobre o tratamento dos dados para fins de recrutamento. Os dados podem permanecer armazenados enquanto houver interesse legítimo relacionado ao processo seletivo ou banco de talentos, respeitando pedidos de atualização, correção ou exclusão quando aplicáveis.',
          bullets: [
            'O candidato pode atualizar informações para manter o perfil correto e completo.',
            'A permanência no banco de talentos depende da autorização indicada no formulário.',
          ],
        },
        {
          title: 'Direitos do titular',
          content:
            'O titular pode solicitar confirmação de tratamento, acesso, correção, atualização, anonimização, eliminação, informações sobre uso compartilhado e revogação de consentimento, conforme aplicável. Solicitações devem ser encaminhadas pelo e-mail de contato com identificação suficiente para validação segura.',
          bullets: [
            'Canal sugerido: pontetalentos@gmail.com com o assunto “Solicitação LGPD”.',
            'A validação de identidade protege o titular contra acesso indevido por terceiros.',
          ],
        },
        {
          title: 'Segurança e acesso interno',
          content:
            'Adotamos controles para limitar o acesso aos dados a pessoas e sistemas autorizados, com finalidade profissional e necessidade operacional. Também orientamos que candidatos não enviem informações sensíveis desnecessárias no currículo ou no campo de descrição pessoal.',
          bullets: [
            'Acesso restrito a rotinas de recrutamento, seleção, suporte e administração da plataforma.',
            'Arquivos e dados devem ser utilizados apenas para a finalidade informada ao candidato.',
          ],
        },
      ]}
      ctaTitle="Quer exercer seus direitos?"
      ctaText="Envie sua solicitação para pontetalentos@gmail.com com identificação do titular e descrição objetiva do pedido."
      ctaLabel="Ir para contato"
      ctaHref="/contato"
    />
  );
}