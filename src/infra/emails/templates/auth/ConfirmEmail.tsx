import { CodeBox } from '@infra/emails/components/CodeBox';
import { EmailLayout } from '@infra/emails/components/EmailLayout';

export const confirmEmailSubject = 'Confirme seu e-mail no Coursary';

export function ConfirmEmail({ code }: { code: string }) {
  return (
    <EmailLayout
      preview="Seu código de confirmação do Coursary"
      title="Confirme seu e-mail"
      subtitle="Use o código abaixo para ativar sua conta."
      footer="Se você não criou uma conta no Coursary, ignore este e-mail."
    >
      <CodeBox code={code} />
    </EmailLayout>
  );
}

ConfirmEmail.PreviewProps = { code: '123456' };
