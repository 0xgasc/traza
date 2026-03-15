import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components';

interface PasswordResetProps {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
  locale?: string;
}

const translations = {
  en: {
    preview: 'Reset your password',
    heading: 'Reset your password',
    greeting: (recipientName: string) => `Hi ${recipientName},`,
    body: 'We received a request to reset your password. Click the button below to choose a new one.',
    button: 'RESET PASSWORD',
    expires: (minutes: number) =>
      `This link expires in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    ignore: "If you didn't request this, you can safely ignore this email. Your password will remain unchanged.",
    footer: 'Powered by Traza — Contracts, signed with proof.',
  },
  es: {
    preview: 'Restablecer tu contraseña',
    heading: 'Restablecer tu contraseña',
    greeting: (recipientName: string) => `Hola ${recipientName},`,
    body: 'Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para elegir una nueva.',
    button: 'RESTABLECER CONTRASEÑA',
    expires: (minutes: number) =>
      `Este enlace expira en ${minutes} minuto${minutes === 1 ? '' : 's'}.`,
    ignore: 'Si no solicitaste esto, puedes ignorar este correo con seguridad. Tu contraseña no será modificada.',
    footer: 'Desarrollado por Traza — Contratos firmados con prueba.',
  },
};

export function PasswordReset({
  recipientName,
  resetUrl,
  expiresInMinutes,
  locale = 'en',
}: PasswordResetProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
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
              <strong>{t.body}</strong>
            </Text>

            <Section style={styles.buttonSection}>
              <Button href={resetUrl} style={styles.button}>
                {t.button}
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.details}>{t.expires(expiresInMinutes)}</Text>

            <Text style={styles.details}>{t.ignore}</Text>
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
  buttonSection: {
    margin: '24px 0',
    textAlign: 'center' as const,
  },
  button: {
    backgroundColor: '#000000',
    border: '3px solid #000000',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '700' as const,
    letterSpacing: '0.05em',
    padding: '14px 32px',
    textDecoration: 'none',
    textTransform: 'uppercase' as const,
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
