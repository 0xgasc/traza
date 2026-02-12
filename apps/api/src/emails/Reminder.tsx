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
}

export function Reminder({
  recipientName,
  senderName,
  documentTitle,
  signingUrl,
  expiresAt,
}: ReminderProps) {
  const daysLeft = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <Html>
      <Head />
      <Preview>
        Reminder: &ldquo;{documentTitle}&rdquo; is waiting for your signature
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.logo}>traza</Heading>
          </Section>

          <Section style={styles.content}>
            <Section style={styles.urgencyBadge}>
              <Text style={styles.urgencyText}>
                {daysLeft <= 1 ? 'EXPIRES TOMORROW' : `${daysLeft} DAYS LEFT`}
              </Text>
            </Section>

            <Heading as="h2" style={styles.heading}>
              Friendly reminder
            </Heading>

            <Text style={styles.text}>Hi {recipientName},</Text>

            <Text style={styles.text}>
              <strong>{senderName}</strong> is still waiting for your signature
              on &ldquo;{documentTitle}&rdquo;.
            </Text>

            <Text style={styles.text}>
              This signing link expires on{' '}
              {expiresAt.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              . Please sign at your earliest convenience.
            </Text>

            <Section style={styles.buttonSection}>
              <Button href={signingUrl} style={styles.button}>
                SIGN NOW
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.note}>
              If you&apos;ve already signed or this doesn&apos;t apply to you,
              please ignore this email.
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
