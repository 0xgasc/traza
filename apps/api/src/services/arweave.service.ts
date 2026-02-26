/**
 * Arweave anchoring service via Irys.
 *
 * When a document is fully signed, this service uploads the PDF to Irys (Arweave)
 * for permanent, tamper-proof storage. The Arweave transaction ID is stored in
 * the document's blockchainTxHash field with blockchainNetwork = 'arweave'.
 *
 * Requires env vars:
 *   IRYS_PRIVATE_KEY - Ethereum private key (hex, no 0x prefix) to sign uploads
 *   IRYS_RPC_URL     - Ethereum/EVM RPC URL (e.g. Infura, Alchemy, or public endpoint)
 *
 * If not configured, anchoring is silently skipped.
 */

import { prisma } from '@traza/database';
import { getEnv } from '../config/env.js';
import { getFileBuffer } from './storage.service.js';

function isIrysConfigured(): boolean {
  const env = getEnv();
  return !!(env.IRYS_PRIVATE_KEY && env.IRYS_RPC_URL);
}

async function getIrysUploader() {
  const env = getEnv();
  // Dynamic imports — @irys/upload is ESM-only
  const { Uploader } = await import('@irys/upload');
  const { Ethereum } = await import('@irys/upload-ethereum');

  const key = env.IRYS_PRIVATE_KEY!.trim().replace(/^0x/i, '');

  if (key.length !== 64 || !/^[0-9a-fA-F]+$/.test(key)) {
    throw new Error('IRYS_PRIVATE_KEY must be a 64-char hex string (no 0x prefix)');
  }

  return await Uploader(Ethereum)
    .withWallet(key)
    .withRpc(env.IRYS_RPC_URL!)
    .devnet(); // Using devnet for testing — switch to .mainnet() for production
}

/**
 * Upload a signed document's PDF to Arweave via Irys.
 * Stores the Arweave tx ID in document.blockchainTxHash.
 * Returns null (and logs) if Irys is not configured or upload fails.
 */
export async function anchorDocumentToArweave(
  documentId: string,
): Promise<{ txId: string; url: string } | null> {
  if (!isIrysConfigured()) {
    console.log('[arweave] IRYS_PRIVATE_KEY not set — skipping Arweave anchor');
    return null;
  }

  try {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new Error('Document not found');

    if (document.blockchainTxHash) {
      console.log(`[arweave] ${documentId} already anchored (${document.blockchainTxHash}), skipping`);
      return null;
    }

    const fileKey = document.pdfFileUrl || document.fileUrl;
    const buffer = await getFileBuffer(fileKey);
    if (!buffer) throw new Error('PDF not found in storage — upload to Arweave skipped');

    const uploader = await getIrysUploader();

    // Check we have enough balance before uploading
    const price = await uploader.getPrice(buffer.length);
    const balance = await uploader.getBalance();
    if (BigInt(balance.toString()) < BigInt(price.toString())) {
      throw new Error(
        `Insufficient Irys balance. Need: ${price.toString()} wei, Have: ${balance.toString()} wei. ` +
        `Fund your Irys wallet to enable Arweave anchoring.`,
      );
    }

    const receipt = await uploader.upload(buffer, {
      tags: [
        { name: 'Content-Type', value: 'application/pdf' },
        { name: 'App-Name', value: 'Traza' },
        { name: 'Document-Id', value: documentId },
        { name: 'Document-Title', value: document.title },
        { name: 'Document-Hash', value: document.fileHash },
        { name: 'Signed-At', value: new Date().toISOString() },
      ],
    });

    const txId = receipt.id;
    const url = `https://devnet.irys.xyz/${txId}`; // Devnet gateway — use https://arweave.net for mainnet

    await prisma.document.update({
      where: { id: documentId },
      data: {
        blockchainTxHash: txId,
        blockchainNetwork: 'arweave',
      },
    });

    await prisma.auditLog.create({
      data: {
        documentId,
        eventType: 'document.anchored',
        metadata: {
          txId,
          network: 'arweave',
          url,
          fileHash: document.fileHash,
          fileSize: buffer.length,
        },
      },
    });

    console.log(`[arweave] Anchored ${documentId} → ${url}`);
    return { txId, url };
  } catch (err) {
    console.error(`[arweave] Failed to anchor ${documentId}:`, (err as Error).message);
    return null;
  }
}
