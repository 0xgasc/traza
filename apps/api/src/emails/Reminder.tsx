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

interface ReminderProps {
  recipientName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt: Date;
  locale?: string;
}

const translations = {
  en: {
    preview: (documentTitle: string) => `Reminder: "${documentTitle}" is waiting for your signature`,
    expiresTomorrow: 'EXPIRES TOMORROW',
    daysLeft: (days: number) => `${days} DAYS LEFT`,
    heading: 'Friendly reminder',
    greeting: (recipientName: string) => `Hi ${recipientName},`,
    body: (senderName: string, documentTitle: string) =>
      `${senderName} is still waiting for your signature on "${documentTitle}".`,
    expires: (date: string) => `This signing link expires on ${date}. Please sign at your earliest convenience.`,
    button: 'SIGN NOW',
    note: "If you've already signed or this doesn't apply to you, please ignore this email.",
    footer: 'Powered by Traza — Contracts, signed with proof.',
  },
  es: {
    preview: (documentTitle: string) => `Recordatorio: "${documentTitle}" espera tu firma`,
    expiresTomorrow: 'EXPIRA MAÑANA',
    daysLeft: (days: number) => `${days} DÍAS RESTANTES`,
    heading: 'Recordatorio amistoso',
    greeting: (recipientName: string) => `Hola ${recipientName},`,
    body: (senderName: string, documentTitle: string) =>
      `${senderName} aún espera tu firma en "${documentTitle}".`,
    expires: (date: string) => `Este enlace de firma expira el ${date}. Por favor firma a tu mayor conveniencia.`,
    button: 'FIRMAR AHORA',
    note: 'Si ya firmaste o esto no aplica para ti, puedes ignorar este correo.',
    footer: 'Desarrollado por Traza — Contratos firmados con prueba.',
  },
};

export function Reminder({
  recipientName,
  senderName,
  documentTitle,
  signingUrl,
  expiresAt,
  locale = 'en',
}: ReminderProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const daysLeft = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const formattedDate = expiresAt.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Html>
      <Head />
      <Preview>{t.preview(documentTitle)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.logo}>traza</Heading>
          </Section>

          <Section style={styles.content}>
            <Section style={styles.urgencyBadge}>
              <Text style={styles.urgencyText}>
                {daysLeft <= 1 ? t.expiresTomorrow : t.daysLeft(daysLeft)}
              </Text>
            </Section>

            <Heading as="h2" style={styles.heading}>
              {t.heading}
            </Heading>

            <Text style={styles.text}>{t.greeting(recipientName)}</Text>

            <Text style={styles.text}>
              <strong>{t.body(senderName, documentTitle)}</strong>
            </Text>

            <Text style={styles.text}>{t.expires(formattedDate)}</Text>

            <Section style={styles.buttonSection}>
              <Button href={signingUrl} style={styles.button}>
                {t.button}
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.note}>{t.note}</Text>
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
  urgencyBadge: {
    border: '2px solid #000000',
    display: 'inline-block' as const,
    marginBottom: '16px',
    padding: '4px 12px',
  },
  urgencyText: {
    color: '#000000',
    fontSize: '11px',
    fontWeight: '700' as const,
    letterSpacing: '0.1em',
    margin: '0',
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
  note: {
    color: '#44403c',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0',
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
