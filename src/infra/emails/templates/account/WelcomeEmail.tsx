import { Text } from 'react-email';

import { EmailLayout } from '@infra/emails/components/EmailLayout';

export const welcomeEmailSubject = 'Boas-vindas ao Coursary';

// No link yet: there is no front end until phase 6 (Q353).
export function WelcomeEmail({ name }: { name: string }) {
  return (
    <EmailLayout
      preview="Sua conta no Coursary está pronta"
      title={`Olá, ${name}!`}
      subtitle="Sua conta no Coursary está confirmada."
      footer="Você recebeu este e-mail porque confirmou uma conta no Coursary."
    >
      <Text className="text-base text-zinc-900">
        Explore o catálogo, encontre um curso que combine com você e faça a sua
        matrícula.
      </Text>
      <Text className="text-base text-zinc-900">Bons estudos!</Text>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = { name: 'Ana' };
