import { ethers } from 'ethers';

const DOCUMENT_REGISTRY_ABI = [
  'function anchor(bytes32 hash) external',
  'function anchorBatch(bytes32[] calldata hashes) external',
  'function verify(bytes32 hash) external view returns (uint256 timestamp, address anchor)',
  'event DocumentAnchored(bytes32 indexed hash, uint256 timestamp, address indexed anchor)',
];

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
}

export function createBlockchainClient(config: BlockchainConfig) {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const contract = new ethers.Contract(config.contractAddress, DOCUMENT_REGISTRY_ABI, wallet);

  return {
    async anchorHash(hash: string): Promise<{ txHash: string }> {
      const bytes32Hash = ethers.zeroPadValue(ethers.getBytes(`0x${hash}`), 32);
      const tx = await contract.getFunction('anchor')(bytes32Hash);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    },

    async anchorBatchHashes(hashes: string[]): Promise<{ txHash: string }> {
      const bytes32Hashes = hashes.map((h) =>
        ethers.zeroPadValue(ethers.getBytes(`0x${h}`), 32),
      );
      const tx = await contract.getFunction('anchorBatch')(bytes32Hashes);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    },

    async verifyOnChain(
      hash: string,
    ): Promise<{ anchored: boolean; timestamp: Date | null; anchor: string | null }> {
      const bytes32Hash = ethers.zeroPadValue(ethers.getBytes(`0x${hash}`), 32);
      const [timestamp, anchor] = await contract.getFunction('verify')(bytes32Hash);
      const ts = Number(timestamp);

      if (ts === 0) {
        return { anchored: false, timestamp: null, anchor: null };
      }

      return {
        anchored: true,
        timestamp: new Date(ts * 1000),
        anchor: anchor as string,
      };
    },

    async getTransactionReceipt(txHash: string) {
      return provider.getTransactionReceipt(txHash);
    },
  };
}
