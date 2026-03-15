import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Preview,
} from '@react-email/components';

interface AccountSuspensionProps {
  recipientName: string;
  organizationName: string;
  reason: string;
  supportEmail?: string;
  locale?: string;
}

const translations = {
  en: {
    preview: (organizationName: string) =>
      `Your organization "${organizationName}" has been suspended`,
    heading: 'Account suspended',
    greeting: (recipientName: string) => `Hi ${recipientName},`,
    body: (organizationName: string) =>
      `The organization "${organizationName}" has been suspended.`,
    reasonLabel: 'REASON',
    support: (supportEmail: string) =>
      `If you believe this is an error, please contact our support team at ${supportEmail}.`,
    supportDefault:
      'If you believe this is an error, please contact our support team.',
    footer: 'Powered by Traza — Contracts, signed with proof.',
  },
  es: {
    preview: (organizationName: string) =>
      `Tu organización "${organizationName}" ha sido suspendida`,
    heading: 'Cuenta suspendida',
    greeting: (recipientName: string) => `Hola ${recipientName},`,
    body: (organizationName: string) =>
      `La organización "${organizationName}" ha sido suspendida.`,
    reasonLabel: 'MOTIVO',
    support: (supportEmail: string) =>
      `Si crees que esto es un error, comunícate con nuestro equipo de soporte a ${supportEmail}.`,
    supportDefault:
      'Si crees que esto es un error, comunícate con nuestro equipo de soporte.',
    footer: 'Desarrollado por Traza — Contratos firmados con prueba.',
  },
};

export function AccountSuspension({
  recipientName,
  organizationName,
  reason,
  supportEmail,
  locale = 'en',
}: AccountSuspensionProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;

  return (
    <Html>
      <Head />
      <Preview>{t.preview(organizationName)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.logo}>traza</Heading>
          </Section>

          <Section style={styles.content}>
            <Heading as="h2" style={styles.heading}>
              {t.heading}
            </Heading>

            <Text style={styles.text}>{t.greeting(recipientName)}</Text>

            <Text style={styles.text}>
              <strong>{t.body(organizationName)}</strong>
            </Text>

            <Section style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>{t.reasonLabel}</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.details}>
              {supportEmail ? t.support(supportEmail) : t.supportDefault}
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>{t.footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#f5f5f4',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    margin: '0',
    padding: '40px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    border: '3px solid #000000',
    margin: '0 auto',
    maxWidth: '560px',
  },
  header: {
    borderBottom: '3px solid #000000',
    padding: '24px 32px',
  },
  logo: {
    color: '#000000',
    fontSize: '24px',
    fontWeight: '800' as const,
    letterSpacing: '-0.02em',
    margin: '0',
    textTransform: 'uppercase' as const,
  },
  content: {
    padding: '32px',
  },
  heading: {
    color: '#000000',
    fontSize: '22px',
    fontWeight: '700' as const,
    letterSpacing: '-0.01em',
    margin: '0 0 24px 0',
  },
  text: {
    color: '#1c1917',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 16px 0',
  },
  reasonBox: {
    backgroundColor: '#f5f5f4',
    border: '2px solid #d6d3d1',
    margin: '16px 0 24px 0',
    padding: '16px',
  },
  reasonLabel: {
    color: '#78716c',
    fontSize: '12px',
    fontWeight: '600' as const,
    letterSpacing: '0.05em',
    margin: '0 0 8px 0',
    textTransform: 'uppercase' as const,
  },
  reasonText: {
    color: '#292524',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
  },
  hr: {
    borderColor: '#e7e5e4',
    borderTop: '1px solid #e7e5e4',
    margin: '24px 0',
  },
  details: {
    color: '#78716c',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0 0 8px 0',
  },
  footer: {
    borderTop: '3px solid #000000',
    padding: '16px 32px',
  },
  footerText: {
    color: '#a8a29e',
    fontSize: '12px',
    margin: '0',
    textAlign: 'center' as const,
  },
};
