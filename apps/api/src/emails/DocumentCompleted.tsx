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
}

export function DocumentCompleted({
  recipientName,
  documentTitle,
  completedAt,
  totalSigners,
  downloadUrl,
}: DocumentCompletedProps) {
  return (
    <Html>
      <Head />
      <Preview>
        &ldquo;{documentTitle}&rdquo; has been fully signed
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.logo}>traza</Heading>
          </Section>

          <Section style={styles.content}>
            <Section style={styles.statusBadge}>
              <Text style={styles.statusText}>COMPLETED</Text>
            </Section>

            <Heading as="h2" style={styles.heading}>
              Document fully signed
            </Heading>

            <Text style={styles.text}>Hi {recipientName},</Text>

            <Text style={styles.text}>
              All {totalSigners} signer{totalSigners > 1 ? 's have' : ' has'}{' '}
              signed &ldquo;{documentTitle}&rdquo;. The document is now complete.
            </Text>

            <Section style={styles.detailsBox}>
              <Text style={styles.detailRow}>
                <strong>Document:</strong> {documentTitle}
              </Text>
              <Text style={styles.detailRow}>
                <strong>Completed:</strong>{' '}
                {completedAt.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.detailRow}>
                <strong>Signers:</strong> {totalSigners}
              </Text>
            </Section>

            <Section style={styles.buttonSection}>
              <Button href={downloadUrl} style={styles.button}>
                DOWNLOAD SIGNED DOCUMENT
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.note}>
              A cryptographic proof of signing has been generated. You can verify
              document integrity at any time from your dashboard.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Powered by Traza &mdash; Contracts, signed with proof.
            </Text>
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
