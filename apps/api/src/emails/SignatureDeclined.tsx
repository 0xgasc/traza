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
}

export function SignatureDeclined({
  recipientName,
  documentTitle,
  signerName,
  signerEmail,
  declinedAt,
  reason,
  documentUrl,
}: SignatureDeclinedProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {signerName} declined to sign &ldquo;{documentTitle}&rdquo;
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.logo}>traza</Heading>
          </Section>

          <Section style={styles.content}>
            <Section style={styles.statusBadge}>
              <Text style={styles.statusText}>DECLINED</Text>
            </Section>

            <Heading as="h2" style={styles.heading}>
              A signer declined
            </Heading>

            <Text style={styles.text}>Hi {recipientName},</Text>

            <Text style={styles.text}>
              <strong>{signerName}</strong> ({signerEmail}) has declined to sign
              &ldquo;{documentTitle}&rdquo;. The document remains in pending status
              but this signer will not complete their signature.
            </Text>

            {reason && (
              <Section style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>REASON PROVIDED</Text>
                <Text style={styles.reasonText}>&ldquo;{reason}&rdquo;</Text>
              </Section>
            )}

            <Section style={styles.detailsBox}>
              <Text style={styles.detailRow}>
                <strong>Document:</strong> {documentTitle}
              </Text>
              <Text style={styles.detailRow}>
                <strong>Declined by:</strong> {signerName} &lt;{signerEmail}&gt;
              </Text>
              <Text style={styles.detailRow}>
                <strong>Declined at:</strong>{' '}
                {declinedAt.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Section>

            <Section style={styles.buttonSection}>
              <Button href={documentUrl} style={styles.button}>
                VIEW DOCUMENT
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.note}>
              You may void this document and start over, or reach out to the signer
              directly to resolve any concerns.
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
