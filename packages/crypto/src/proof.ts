import { createHmac } from 'node:crypto';

export interface SignatureProof {
  signerEmail: string;
  signerName: string;
  signedAt: string;
  ipAddress: string | null;
  signatureType: string;
}

export interface BlockchainProof {
  network: string;
  txHash: string;
  timestamp: string;
}

export interface ProofBundle {
  version: '1.0';
  platform: 'traza';
  documentId: string;
  documentTitle: string;
  documentHash: string;
  hashAlgorithm: 'SHA-256';
  createdAt: string;
  signatures: SignatureProof[];
  blockchain: BlockchainProof | null;
  platformSignature: string;
}

export function generateProofBundle(
  data: {
    documentId: string;
    documentTitle: string;
    documentHash: string;
    createdAt: string;
    signatures: SignatureProof[];
    blockchain: BlockchainProof | null;
  },
  secretKey: string,
): ProofBundle {
  const bundle: Omit<ProofBundle, 'platformSignature'> = {
    version: '1.0',
    platform: 'traza',
    documentId: data.documentId,
    documentTitle: data.documentTitle,
    documentHash: data.documentHash,
    hashAlgorithm: 'SHA-256',
    createdAt: data.createdAt,
    signatures: data.signatures,
    blockchain: data.blockchain,
  };

  const platformSignature = signData(JSON.stringify(bundle), secretKey);

  return { ...bundle, platformSignature };
}

export function verifyProofBundle(bundle: ProofBundle, secretKey: string): boolean {
  const { platformSignature, ...rest } = bundle;
  const expected = signData(JSON.stringify(rest), secretKey);
  return expected === platformSignature;
}

export function signData(data: string, secretKey: string): string {
  return createHmac('sha256', secretKey).update(data).digest('hex');
}

export function verifySignature(data: string, signature: string, secretKey: string): boolean {
  const expected = signData(data, secretKey);
  return expected === signature;
}
