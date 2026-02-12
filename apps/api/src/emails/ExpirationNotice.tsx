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

interface ExpirationNoticeProps {
  recipientName: string;
  documentTitle: string;
  expiredAt: Date;
  senderEmail: string;
}

export function ExpirationNotice({
  recipientName,
  documentTitle,
  expiredAt,
  senderEmail,
}: ExpirationNoticeProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Signing link for &ldquo;{documentTitle}&rdquo; has expired
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.logo}>traza</Heading>
          </Section>

          <Section style={styles.content}>
            <Section style={styles.statusBadge}>
              <Text style={styles.statusText}>EXPIRED</Text>
            </Section>

            <Heading as="h2" style={styles.heading}>
              Signing link expired
            </Heading>

            <Text style={styles.text}>Hi {recipientName},</Text>

            <Text style={styles.text}>
              The signing link for &ldquo;{documentTitle}&rdquo; expired on{' '}
              {expiredAt.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              .
            </Text>

            <Text style={styles.text}>
              If you still need to sign this document, please contact the sender
              at <strong>{senderEmail}</strong> to request a new signing link.
            </Text>

            <Hr style={styles.hr} />

            <Text style={styles.note}>
              No action is required if you don&apos;t need to sign this
              document.
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
    backgroundColor: '#292524',
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
  buttonSection: {
    margin: '24px 0',
    textAlign: 'center' as const,
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
