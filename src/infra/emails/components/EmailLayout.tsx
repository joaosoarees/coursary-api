import type { ReactNode } from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';

interface EmailLayoutProps {
  preview: string;
  title: string;
  subtitle: string;
  footer: string;
  children: ReactNode;
}

export function EmailLayout({
  preview,
  title,
  subtitle,
  footer,
  children,
}: EmailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: { brand: '#4F46E5', muted: '#71717A' },
            },
          },
        }}
      >
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[480px] px-6 py-10 text-center">
            <Text className="m-0 text-lg font-bold text-brand">Coursary</Text>
            <Heading as="h1" className="mt-8 text-2xl text-zinc-900">
              {title}
            </Heading>
            <Text className="text-base text-muted">{subtitle}</Text>
            <Section className="pt-6">{children}</Section>
            <Text className="pt-8 text-sm text-muted">{footer}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
