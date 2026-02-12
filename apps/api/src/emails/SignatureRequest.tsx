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

interface SignatureRequestProps {
  recipientName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt: Date;
  message?: string;
}

export function SignatureRequest({
  recipientName,
  senderName,
  documentTitle,
  signingUrl,
  expiresAt,
  message,
}: SignatureRequestProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {senderName} sent you &ldquo;{documentTitle}&rdquo; for your signature
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.logo}>traza</Heading>
          </Section>

          <Section style={styles.content}>
            <Heading as="h2" style={styles.heading}>
              You have a document to sign
            </Heading>

            <Text style={styles.text}>Hi {recipientName},</Text>

            <Text style={styles.text}>
              <strong>{senderName}</strong> has sent you &ldquo;
              {documentTitle}&rdquo; for your signature.
            </Text>

            {message && (
              <Section style={styles.messageBox}>
                <Text style={styles.messageLabel}>Message from sender:</Text>
                <Text style={styles.messageText}>{message}</Text>
              </Section>
            )}

            <Section style={styles.buttonSection}>
              <Button href={signingUrl} style={styles.button}>
                REVIEW AND SIGN
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.details}>
              This request expires on{' '}
              {expiresAt.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              .
            </Text>

            <Text style={styles.details}>
              If you didn&apos;t expect this email, you can safely ignore it.
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
  messageBox: {
    backgroundColor: '#f5f5f4',
    border: '2px solid #d6d3d1',
    margin: '16px 0 24px 0',
    padding: '16px',
  },
  messageLabel: {
    color: '#78716c',
    fontSize: '12px',
    fontWeight: '600' as const,
    letterSpacing: '0.05em',
    margin: '0 0 8px 0',
    textTransform: 'uppercase' as const,
  },
  messageText: {
    color: '#292524',
    fontSize: '14px',
    fontStyle: 'italic' as const,
    lineHeight: '22px',
    margin: '0',
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
