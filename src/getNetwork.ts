import {ChainId, Network, SUPPORTED_CHAIN_IDS} from './types';

export default function getNetwork(chain: ChainId): Network {
  validateChain(chain);

  switch (chain) {
    case 1:
      return {
        chainId: 1,
        name: 'mainnet',
        symbol: 'ETH',
        minBalance: 0,
        targetBalance: 0,
        contracts: {
          drips: '0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4',
        },
      };
    case 11155111:
      return {
        chainId: 11155111,
        name: 'sepolia',
        symbol: 'SepoliaETH',
        minBalance: 10,
        targetBalance: 10,
        contracts: {
          drips: '0x74A32a38D945b9527524900429b083547DeB9bF4',
        },
      };
    case 314:
      return {
        chainId: 314,
        name: 'filecoin',
        symbol: 'FIL',
        minBalance: 0,
        targetBalance: 0,
        contracts: {
          drips: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
        },
      };
  }
}

function validateChain(chainId: number) {
  if (!SUPPORTED_CHAIN_IDS.includes(chainId as ChainId)) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}
