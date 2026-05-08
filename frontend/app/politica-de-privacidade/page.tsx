import { InstitutionalPage } from '@/components/layout/InstitutionalPage';

export default function PoliticaDePrivacidadePage() {
  return (
    <InstitutionalPage
      eyebrow="Privacidade"
      title="Política de privacidade"
      description="Esta política explica, de forma clara, como o Encontra Talentos utiliza informações fornecidas por candidatos, usuários e empresas dentro da plataforma de recrutamento."
      sections={[
        {
          title: 'Dados coletados',
          content:
            'Podemos coletar informações fornecidas diretamente pelo usuário, como nome, e-mail, telefone, localidade, currículo, experiências, habilidades, pretensão salarial, vaga desejada e aceite de termos. Esses dados são necessários para estruturar candidaturas e possibilitar contato durante processos seletivos.',
          bullets: [
            'Informações de identificação e contato para comunicação com o candidato.',
            'Informações profissionais para avaliação de perfil e compatibilidade com vagas.',
          ],
        },
        {
          title: 'Uso das informações',
          content:
            'Os dados são utilizados para cadastro, análise de perfil, triagem inicial, comunicação com candidatos, organização do banco de talentos, indicação de oportunidades e melhoria contínua da experiência do portal.',
          bullets: [
            'Facilitar a candidatura em vagas abertas e futuras oportunidades.',
            'Apoiar a equipe de recrutamento na visualização de informações relevantes.',
          ],
        },
        {
          title: 'Compartilhamento e acesso',
          content:
            'As informações podem ser acessadas por profissionais autorizados envolvidos em recrutamento, suporte e operação da plataforma. O compartilhamento deve ocorrer apenas quando necessário para condução de processos seletivos ou cumprimento de obrigações aplicáveis.',
          bullets: [
            'Não solicitamos dados que não sejam úteis para o processo de recrutamento.',
            'Recomendamos que o candidato não inclua informações sensíveis desnecessárias no currículo.',
          ],
        },
        {
          title: 'Segurança e atualização',
          content:
            'Buscamos proteger as informações contra acessos não autorizados e manter os dados atualizados conforme informado pelo usuário. O candidato é responsável por fornecer dados corretos e pode solicitar ajustes quando identificar inconsistências.',
        },
      ]}
      ctaLabel="Ver LGPD"
      ctaHref="/lgpd"
    />
  );
}