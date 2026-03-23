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

interface SignerAudit {
  name: string;
  email: string;
  signedAt: string | null;
  ip: string | null;
}

interface DocumentCompletedProps {
  recipientName: string;
  documentTitle: string;
  completedAt: Date;
  totalSigners: number;
  downloadUrl: string;
  locale?: string;
  signers?: SignerAudit[];
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
    auditTrail: 'Audit Trail',
    signedOn: 'Signed:',
    ip: 'IP:',
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
    auditTrail: 'Registro de Auditoría',
    signedOn: 'Firmado:',
    ip: 'IP:',
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
  signers = [],
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
              <table cellPadding="0" cellSpacing="0" border={0} style={{ margin: '0 auto' }}>
                <tr>
                  <td align="center" style={styles.button}>
                    <a href={downloadUrl} style={styles.buttonLink} target="_blank">
                      {t.button}
                    </a>
                  </td>
                </tr>
              </table>
            </Section>

            {signers.length > 0 && (
              <>
                <Hr style={styles.hr} />
                <Heading as="h3" style={styles.auditHeading}>{t.auditTrail}</Heading>
                <table cellPadding="0" cellSpacing="0" border={0} style={styles.auditTable}>
                  {signers.map((signer, i) => (
                    <tr key={i}>
                      <td style={styles.auditRow}>
                        <Text style={styles.auditName}>{signer.name}</Text>
                        <Text style={styles.auditEmail}>{signer.email}</Text>
                        <Text style={styles.auditMeta}>
                          {t.signedOn}{' '}
                          {signer.signedAt
                            ? new Date(signer.signedAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                          {signer.ip && <> · {t.ip} {signer.ip}</>}
                        </Text>
                      </td>
                    </tr>
                  ))}
                </table>
              </>
            )}

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
    borderRadius: '0',
  },
  buttonLink: {
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '700' as const,
    letterSpacing: '0.05em',
    padding: '14px 32px',
    textDecoration: 'none',
    textTransform: 'uppercase' as const,
    backgroundColor: '#000000',
  },
  hr: {
    borderColor: '#e7e5e4',
    borderTop: '1px solid #e7e5e4',
    margin: '24px 0',
  },
  auditHeading: {
    color: '#000000',
    fontSize: '14px',
    fontWeight: '700' as const,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    margin: '0 0 12px 0',
  },
  auditTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  auditRow: {
    borderBottom: '1px solid #e7e5e4',
    padding: '10px 0',
  },
  auditName: {
    color: '#1c1917',
    fontSize: '14px',
    fontWeight: '700' as const,
    margin: '0',
    lineHeight: '20px',
  },
  auditEmail: {
    color: '#44403c',
    fontSize: '13px',
    margin: '0',
    lineHeight: '18px',
  },
  auditMeta: {
    color: '#78716c',
    fontSize: '12px',
    fontFamily: 'monospace',
    margin: '2px 0 0 0',
    lineHeight: '16px',
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
