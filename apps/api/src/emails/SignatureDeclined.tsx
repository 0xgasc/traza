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

interface SignatureDeclinedProps {
  recipientName: string;
  documentTitle: string;
  signerName: string;
  signerEmail: string;
  declinedAt: Date;
  reason?: string;
  documentUrl: string;
  locale?: string;
}

const translations = {
  en: {
    preview: (signerName: string, documentTitle: string) =>
      `${signerName} declined to sign "${documentTitle}"`,
    statusBadge: 'DECLINED',
    heading: 'A signer declined',
    greeting: (recipientName: string) => `Hi ${recipientName},`,
    body: (signerName: string, signerEmail: string, documentTitle: string) =>
      `${signerName} (${signerEmail}) has declined to sign "${documentTitle}". The document remains in pending status but this signer will not complete their signature.`,
    reasonLabel: 'REASON PROVIDED',
    document: 'Document:',
    declinedBy: 'Declined by:',
    declinedAt: 'Declined at:',
    button: 'VIEW DOCUMENT',
    note: 'You may void this document and start over, or reach out to the signer directly to resolve any concerns.',
    footer: 'Powered by Traza — Contracts, signed with proof.',
  },
  es: {
    preview: (signerName: string, documentTitle: string) =>
      `${signerName} rechazó firmar "${documentTitle}"`,
    statusBadge: 'RECHAZADO',
    heading: 'Un firmante rechazó',
    greeting: (recipientName: string) => `Hola ${recipientName},`,
    body: (signerName: string, signerEmail: string, documentTitle: string) =>
      `${signerName} (${signerEmail}) ha rechazado firmar "${documentTitle}". El documento permanece en estado pendiente pero este firmante no completará su firma.`,
    reasonLabel: 'RAZÓN PROPORCIONADA',
    document: 'Documento:',
    declinedBy: 'Rechazado por:',
    declinedAt: 'Rechazado en:',
    button: 'VER DOCUMENTO',
    note: 'Puedes anular este documento y comenzar de nuevo, o contactar directamente al firmante para resolver cualquier inquietud.',
    footer: 'Desarrollado por Traza — Contratos firmados con prueba.',
  },
};

export function SignatureDeclined({
  recipientName,
  documentTitle,
  signerName,
  signerEmail,
  declinedAt,
  reason,
  documentUrl,
  locale = 'en',
}: SignatureDeclinedProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const formattedDate = declinedAt.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <Html>
      <Head />
      <Preview>{t.preview(signerName, documentTitle)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.logo}>traza</Heading>
          </Section>

          <Section style={styles.content}>
            <Section style={styles.statusBadge}>
              <Text style={styles.statusText}>{t.statusBadge}</Text>
            </Section>

            <Heading as="h2" style={styles.heading}>
              {t.heading}
            </Heading>

            <Text style={styles.text}>{t.greeting(recipientName)}</Text>

            <Text style={styles.text}>
              <strong>{t.body(signerName, signerEmail, documentTitle)}</strong>
            </Text>

            {reason && (
              <Section style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>{t.reasonLabel}</Text>
                <Text style={styles.reasonText}>&ldquo;{reason}&rdquo;</Text>
              </Section>
            )}

            <Section style={styles.detailsBox}>
              <Text style={styles.detailRow}>
                <strong>{t.document}</strong> {documentTitle}
              </Text>
              <Text style={styles.detailRow}>
                <strong>{t.declinedBy}</strong> {signerName} &lt;{signerEmail}&gt;
              </Text>
              <Text style={styles.detailRow}>
                <strong>{t.declinedAt}</strong> {formattedDate}
              </Text>
            </Section>

            <Section style={styles.buttonSection}>
              <Button href={documentUrl} style={styles.button}>
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
  statusBadge: {
    backgroundColor: '#dc2626',
    display: 'inline-block' as const,
    marginBottom: '16px',
    padding: '4px 12px',
  },
  statusText: {
    color: '#ffffff',
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
  reasonBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #dc2626',
    margin: '0 0 24px 0',
    padding: '16px',
  },
  reasonLabel: {
    color: '#dc2626',
    fontSize: '11px',
    fontWeight: '700' as const,
    letterSpacing: '0.1em',
    margin: '0 0 8px 0',
  },
  reasonText: {
    color: '#292524',
    fontSize: '14px',
    fontStyle: 'italic' as const,
    lineHeight: '22px',
    margin: '0',
  },
  detailsBox: {
    backgroundColor: '#f5f5f4',
    border: '2px solid #000000',
    margin: '24px 0',
    padding: '16px',
  },
  detailRow: {
    color: '#292524',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0 0 4px 0',
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
    color: '#78716c',
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
