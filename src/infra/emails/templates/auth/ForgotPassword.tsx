import { CodeBox } from '@infra/emails/components/CodeBox';
import { EmailLayout } from '@infra/emails/components/EmailLayout';

export const forgotPasswordSubject = 'Redefinição de senha do Coursary';

export function ForgotPassword({ code }: { code: string }) {
  return (
    <EmailLayout
      preview="Seu código para redefinir a senha do Coursary"
      title="Redefina sua senha"
      subtitle="Use o código abaixo para criar uma senha nova."
      footer="Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma."
    >
      <CodeBox code={code} />
    </EmailLayout>
  );
}

ForgotPassword.PreviewProps = { code: '123456' };
