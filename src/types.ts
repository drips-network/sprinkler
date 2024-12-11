export const SUPPORTED_CHAINS = ['mainnet', 'filecoin', 'sepolia'] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export type OxString = `0x${string}`;
export type SplitsReceiver = {accountId: bigint; weight: number};

export type WriteOperation = {
  type: 'receive' | 'split';
  accountId: bigint;
  token: string;
  amount: bigint;
  txHash: string;
};

export type ProcessingResult = {
  writeOperations: WriteOperation[];
};
