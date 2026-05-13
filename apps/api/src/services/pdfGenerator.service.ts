/**
 * PDF Generation Service
 *
 * Generates a signed PDF by overlaying all field values (signatures, text, dates, checkboxes)
 * onto the original document at their specified positions.
 */

import { PDFDocument, rgb, PDFPage, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import { prisma } from '@traza/database';
import { logger } from '../config/logger.js';
import { getEnv } from '../config/env.js';
import * as storage from './storage.service.js';

interface FieldValue {
  fieldType: string;
  value: string;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  label?: string | null;
}

/**
 * Generate a signed PDF by overlaying all signature field values
 */
export async function generateSignedPdf(documentId: string): Promise<Buffer> {
  // Fetch document and field values
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      fields: {
        include: {
          fieldValue: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Load original PDF
  const fileKey = document.pdfFileUrl || document.fileUrl;
  const originalPdfBuffer = await storage.getFileBuffer(fileKey);

  if (!originalPdfBuffer) {
    throw new Error('Original PDF not found in storage');
  }

  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  const pages = pdfDoc.getPages();
  const env = getEnv();
  const verifyUrl = `${env.APP_URL}/en/verify/${documentId}`;
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Overlay each field value
  for (const field of document.fields) {
    if (!field.fieldValue) continue; // Skip unfilled fields

    const page = pages[field.page - 1]; // page is 1-indexed in DB, 0-indexed in pdf-lib
    if (!page) continue;

    const { height: pageHeight } = page.getSize();

    // Convert Decimal to number and percentage positions to points
    const posX = typeof field.positionX === 'number' ? field.positionX : Number(field.positionX);
    const posY = typeof field.positionY === 'number' ? field.positionY : Number(field.positionY);
    const w = typeof field.width === 'number' ? field.width : Number(field.width);
    const h = typeof field.height === 'number' ? field.height : Number(field.height);

    const x = (posX / 100) * page.getWidth();
    const y = pageHeight - ((posY / 100) * pageHeight) - ((h / 100) * pageHeight); // Flip Y coordinate
    const width = (w / 100) * page.getWidth();
    const height = (h / 100) * pageHeight;

    await overlayField(pdfDoc, page, field.fieldType, field.fieldValue.value, x, y, width, height);

    // For signature fields, attach an invisible clickable link annotation
    // over the signature image itself, so anyone tapping the signature in a
    // PDF reader is taken to the public verify page. No visible stamp — the
    // signature itself is the click target. Verify URL is also printed in
    // the page footer for users who can't click PDF annotations.
    if (field.fieldType.toLowerCase() === 'signature' || field.fieldType.toLowerCase() === 'initials') {
      addLinkAnnotation(pdfDoc, page, x, y, width, height, verifyUrl);
    }
  }

  // Footer on the LAST page with the verification URL and document ID
  const lastPage = pages[pages.length - 1];
  if (lastPage) {
    const { width: pw } = lastPage.getSize();
    const footerSize = 7;
    const footerY = 18;
    const docIdLine = `Document ID: ${documentId}`;
    const verifyLine = `Verify at ${env.APP_URL}/en/verify/${documentId}`;
    const verifyWidth = helveticaBold.widthOfTextAtSize(verifyLine, footerSize);
    const docIdWidth = helvetica.widthOfTextAtSize(docIdLine, footerSize);
    lastPage.drawText(docIdLine, {
      x: (pw - docIdWidth) / 2,
      y: footerY + 10,
      size: footerSize,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    lastPage.drawText(verifyLine, {
      x: (pw - verifyWidth) / 2,
      y: footerY,
      size: footerSize,
      font: helveticaBold,
      color: rgb(0.1, 0.3, 0.7),
    });
    addLinkAnnotation(
      pdfDoc,
      lastPage,
      (pw - verifyWidth) / 2,
      footerY - 1,
      verifyWidth,
      footerSize + 2,
      verifyUrl,
    );
  }

  // Save the PDF
  const signedPdfBytes = await pdfDoc.save();
  return Buffer.from(signedPdfBytes);
}

/**
 * Attach a clickable URI annotation to a region of a page. pdf-lib doesn't
 * expose this directly, so we drop down to the raw annotation dict.
 */
function addLinkAnnotation(
  pdfDoc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  url: string,
): void {
  const link = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(url),
    },
  });
  const linkRef = pdfDoc.context.register(link);
  const annots = page.node.lookup(PDFName.of('Annots'));
  if (annots && 'push' in annots) {
    (annots as { push: (ref: unknown) => void }).push(linkRef);
  } else {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkRef]));
  }
}

/**
 * Overlay a single field value onto the PDF
 */
async function overlayField(
  pdfDoc: PDFDocument,
  page: PDFPage,
  fieldType: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<void> {
  switch (fieldType.toLowerCase()) {
    case 'signature':
    case 'initials':
      // Value is a base64 data URL (e.g., "data:image/png;base64,...")
      await embedImage(pdfDoc, page, value, x, y, width, height);
      break;

    case 'text':
    case 'date':
      // Draw text
      // Baseline sits on the field bottom (which is snapped to the
      // underline), so text reads as resting on the line — matching how
      // hand-typed values like "05/12/2026" already render in source PDFs.
      // Tiny +1pt clearance so descenders don't kiss the line itself.
      page.drawText(value, {
        x,
        y: y + 1,
        size: Math.max(7, Math.min(height * 0.8, 11)),
        color: rgb(0, 0, 0),
      });
      break;

    case 'checkbox':
      // Draw checkbox
      if (value === 'true') {
        // Draw X mark for checked
        const fontSize = Math.min(width, height) * 0.7;
        page.drawText('X', {
          x: x + width / 4,
          y: y + height / 4,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      }
      break;

    default:
      // Fallback: draw as text (same baseline-on-underline rule)
      page.drawText(value, {
        x,
        y: y + 1,
        size: Math.max(7, Math.min(height * 0.8, 11)),
        color: rgb(0, 0, 0),
      });
  }
}

/**
 * Embed an image (signature/initials) from base64 data URL
 */
async function embedImage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<void> {
  try {
    // Extract base64 data from data URL
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return;

    const imageBytes = Buffer.from(base64Data, 'base64');

    // Detect image type from data URL
    let image;
    if (dataUrl.startsWith('data:image/png')) {
      image = await pdfDoc.embedPng(imageBytes);
    } else if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
      image = await pdfDoc.embedJpg(imageBytes);
    } else {
      logger.warn(`[pdfGenerator] Unsupported image format: ${dataUrl.substring(0, 30)}`);
      return;
    }

    // Draw the image
    page.drawImage(image, {
      x,
      y,
      width,
      height,
    });
  } catch (err) {
    logger.error('[pdfGenerator] Failed to embed image:', (err as Error).message);
  }
}
