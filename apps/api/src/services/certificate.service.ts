/**
 * Certificate of Completion Service
 *
 * Generates a Certificate of Completion PDF that serves as a legal audit trail
 * for signed documents, including all signer details, timestamps, and IP addresses.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '@traza/database';

interface SignerInfo {
  name: string;
  email: string;
  signedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  order: number;
}

/**
 * Generate a Certificate of Completion PDF for a fully signed document
 */
export async function generateCertificateOfCompletion(documentId: string): Promise<Buffer> {
  // Fetch document with all signatures
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      signatures: {
        where: { status: 'SIGNED' },
        orderBy: { signedAt: 'asc' },
      },
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  if (document.status !== 'SIGNED') {
    throw new Error('Document is not fully signed yet');
  }

  // Create new PDF document
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([612, 792]); // US Letter size (8.5" x 11")
  const { width, height } = page.getSize();

  const margin = 50;
  let y = height - 80;

  // Header
  page.drawText('CERTIFICATE OF COMPLETION', {
    x: width / 2 - 180,
    y,
    size: 24,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  y -= 40;

  // Document Information
  page.drawText('Document Information', {
    x: margin,
    y,
    size: 16,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  y -= 25;

  const documentInfo = [
    `Document Title: ${document.title}`,
    `Document ID: ${document.id}`,
    `Owner: ${document.owner?.name || 'Unknown'} (${document.owner?.email || 'N/A'})`,
    `Completion Date: ${document.updatedAt.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })}`,
  ];

  if (document.blockchainTxHash) {
    documentInfo.push(`Blockchain Hash: ${document.blockchainTxHash}`);
    documentInfo.push(`Network: ${document.blockchainNetwork || 'Arweave'}`);
  }

  for (const info of documentInfo) {
    page.drawText(info, {
      x: margin + 10,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 15;
  }

  y -= 20;

  // Signers Section
  page.drawText('Signers', {
    x: margin,
    y,
    size: 16,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  y -= 20;

  // Draw table header
  const tableX = margin + 10;
  const colWidths = {
    order: 30,
    name: 140,
    email: 160,
    timestamp: 140,
  };

  // Header background
  page.drawRectangle({
    x: tableX - 5,
    y: y - 15,
    width: width - 2 * margin - 10,
    height: 20,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText('#', {
    x: tableX,
    y,
    size: 9,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  page.drawText('Name', {
    x: tableX + colWidths.order,
    y,
    size: 9,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  page.drawText('Email', {
    x: tableX + colWidths.order + colWidths.name,
    y,
    size: 9,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  page.drawText('Signed At', {
    x: tableX + colWidths.order + colWidths.name + colWidths.email,
    y,
    size: 9,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  y -= 25;

  // Draw each signer
  let signerNum = 1;
  for (const signature of document.signatures) {
    if (!signature.signedAt) continue;

    // Check if we need a new page
    if (y < 100) {
      const newPage = pdfDoc.addPage([612, 792]);
      y = height - 80;
    }

    page.drawText(String(signerNum), {
      x: tableX,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    page.drawText(signature.signerName.substring(0, 25), {
      x: tableX + colWidths.order,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    page.drawText(signature.signerEmail.substring(0, 28), {
      x: tableX + colWidths.order + colWidths.name,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    const timestamp = signature.signedAt.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    page.drawText(timestamp, {
      x: tableX + colWidths.order + colWidths.name + colWidths.email,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    y -= 12;

    // Add IP address if available
    if (signature.ipAddress) {
      page.drawText(`IP: ${signature.ipAddress}`, {
        x: tableX + colWidths.order + colWidths.name,
        y,
        size: 7,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 10;
    }

    y -= 5;
    signerNum++;
  }

  y -= 30;

  // Audit Trail Section
  if (y < 150) {
    const newPage = pdfDoc.addPage([612, 792]);
    y = height - 80;
  }

  page.drawText('Audit Trail', {
    x: margin,
    y,
    size: 16,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  y -= 20;

  // Get audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: { documentId },
    orderBy: { timestamp: 'asc' },
    take: 20, // Limit to most relevant events
  });

  for (const log of auditLogs) {
    if (y < 60) break; // Stop if we run out of space

    const timestamp = log.timestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const eventText = `${timestamp} - ${log.eventType}`;
    page.drawText(eventText, {
      x: margin + 10,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    y -= 12;
  }

  // Footer
  const footer = [
    '',
    'This certificate was automatically generated by Traza.',
    `Generated on: ${new Date().toLocaleString('en-US')}`,
    'This document serves as a legal record of the signature completion.',
  ];

  y = 50;
  for (const line of footer) {
    page.drawText(line, {
      x: width / 2 - 150,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 12;
  }

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Save certificate to storage and link it to the document
 */
export async function saveCertificateToDocument(documentId: string): Promise<string> {
  const { uploadFile } = await import('./storage.service.js');

  // Generate certificate
  const certificateBuffer = await generateCertificateOfCompletion(documentId);

  // Save to storage
  const fileName = `certificate-${documentId}.pdf`;
  const certificateKey = await uploadFile(certificateBuffer, fileName, 'application/pdf');

  // Update document with certificate URL (we'll add this field in schema later if needed)
  // For now, we'll just return the key
  console.log(`[certificate] Generated certificate for document ${documentId}: ${certificateKey}`);

  return certificateKey;
}
