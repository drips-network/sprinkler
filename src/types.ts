export const SUPPORTED_CHAIN_IDS = [1, 11155111, 314, 1088] as const;
export type ChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export type Network = {
  chainId: ChainId;
  name: string;
  symbol: string;
  contracts: {
    drips: string;
  };
};

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
