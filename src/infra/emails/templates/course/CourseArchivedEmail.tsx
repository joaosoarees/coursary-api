import { Text } from 'react-email';

import { EmailLayout } from '@infra/emails/components/EmailLayout';

export const courseArchivedSubject = (title: string) =>
  `O curso ${title} foi arquivado`;

// No link yet: there is no front end until phase 6 (Q362).
export function CourseArchivedEmail({
  name,
  title,
}: {
  name: string;
  title: string;
}) {
  return (
    <EmailLayout
      preview={`O curso ${title} foi arquivado`}
      title={`Olá, ${name}.`}
      subtitle={`O instrutor arquivou o curso ${title}.`}
      footer="Você recebeu este e-mail porque está matriculado neste curso."
    >
      <Text className="text-base text-zinc-900">
        Você continua com acesso às aulas e ao seu progresso, mas o curso não
        aparece mais no catálogo e não aceita novas matrículas.
      </Text>
    </EmailLayout>
  );
}

CourseArchivedEmail.PreviewProps = {
  name: 'Ana',
  title: 'DynamoDB na prática',
};
