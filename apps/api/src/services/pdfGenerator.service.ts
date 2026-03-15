/**
 * PDF Generation Service
 *
 * Generates a signed PDF by overlaying all field values (signatures, text, dates, checkboxes)
 * onto the original document at their specified positions.
 */

import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { prisma } from '@traza/database';
import { logger } from '../config/logger.js';
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
  }

  // Save the PDF
  const signedPdfBytes = await pdfDoc.save();
  return Buffer.from(signedPdfBytes);
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
      page.drawText(value, {
        x,
        y: y + height / 3, // Vertically center text
        size: Math.min(height * 0.6, 12),
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
      // Fallback: draw as text
      page.drawText(value, {
        x,
        y: y + height / 3,
        size: Math.min(height * 0.6, 12),
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
