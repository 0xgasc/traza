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

interface DocumentCompletedProps {
  recipientName: string;
  documentTitle: string;
  completedAt: Date;
  totalSigners: number;
  downloadUrl: string;
  locale?: string;
}

const translations = {
  en: {
    preview: (documentTitle: string) => `"${documentTitle}" has been fully signed`,
    statusBadge: 'COMPLETED',
    heading: 'Document fully signed',
    greeting: (recipientName: string) => `Hi ${recipientName},`,
    body: (totalSigners: number, documentTitle: string) =>
      `All ${totalSigners} signer${totalSigners > 1 ? 's have' : ' has'} signed "${documentTitle}". The document is now complete.`,
    document: 'Document:',
    completed: 'Completed:',
    signers: 'Signers:',
    button: 'DOWNLOAD SIGNED DOCUMENT',
    note: 'A cryptographic proof of signing has been generated. You can verify document integrity at any time from your dashboard.',
    footer: 'Powered by Traza — Contracts, signed with proof.',
  },
  es: {
    preview: (documentTitle: string) => `"${documentTitle}" ha sido firmado completamente`,
    statusBadge: 'COMPLETADO',
    heading: 'Documento firmado completamente',
    greeting: (recipientName: string) => `Hola ${recipientName},`,
    body: (totalSigners: number, documentTitle: string) =>
      `${totalSigners > 1 ? 'Todos los' : 'El'} ${totalSigners} firmante${totalSigners > 1 ? 's han' : ' ha'} firmado "${documentTitle}". El documento está ahora completo.`,
    document: 'Documento:',
    completed: 'Completado:',
    signers: 'Firmantes:',
    button: 'DESCARGAR DOCUMENTO FIRMADO',
    note: 'Se ha generado una prueba criptográfica de la firma. Puedes verificar la integridad del documento en cualquier momento desde tu panel.',
    footer: 'Desarrollado por Traza — Contratos firmados con prueba.',
  },
};

export function DocumentCompleted({
  recipientName,
  documentTitle,
  completedAt,
  totalSigners,
  downloadUrl,
  locale = 'en',
}: DocumentCompletedProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const formattedDate = completedAt.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
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
      <Preview>{t.preview(documentTitle)}</Preview>
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

            <Text style={styles.text}>{t.body(totalSigners, documentTitle)}</Text>

            <Section style={styles.detailsBox}>
              <Text style={styles.detailRow}>
                <strong>{t.document}</strong> {documentTitle}
              </Text>
              <Text style={styles.detailRow}>
                <strong>{t.completed}</strong> {formattedDate}
              </Text>
              <Text style={styles.detailRow}>
                <strong>{t.signers}</strong> {totalSigners}
              </Text>
            </Section>

            <Section style={styles.buttonSection}>
              <Button href={downloadUrl} style={styles.button}>
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
    backgroundColor: '#000000',
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
