import {ChainId, Network, SUPPORTED_CHAIN_IDS} from './types';

export default function getNetwork(chain: ChainId): Network {
  validateChain(chain);

  switch (chain) {
    case 1:
      return {
        chainId: 1,
        name: 'mainnet',
        symbol: 'ETH',
        contracts: {
          drips: '0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4',
          repoSubAccountDriver: '0xc219395880fa72e3ad9180b8878e0d39d144130b',
        },
      };
    case 11155111:
      return {
        chainId: 11155111,
        name: 'sepolia',
        symbol: 'SepoliaETH',
        contracts: {
          drips: '0x74A32a38D945b9527524900429b083547DeB9bF4',
          repoSubAccountDriver: '0x0000000000000000000000000000000000000000',
        },
      };
    case 314:
      return {
        chainId: 314,
        name: 'filecoin',
        symbol: 'FIL',
        contracts: {
          drips: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
          repoSubAccountDriver: '0x0000000000000000000000000000000000000000',
        },
      };
    case 1088:
      return {
        chainId: 1088,
        name: 'metis',
        symbol: 'METIS',
        contracts: {
          drips: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
          repoSubAccountDriver: '0x0000000000000000000000000000000000000000',
        },
      };
    case 10:
      return {
        chainId: 10,
        name: 'optimism',
        symbol: 'ETH',
        contracts: {
          drips: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
          repoSubAccountDriver: '0x0000000000000000000000000000000000000000',
        },
      };
    case 31337:
      return {
        chainId: 31337,
        name: 'localtestnet',
        symbol: 'ETH',
        contracts: {
          drips: '0x7CBbD3FdF9E5eb359E6D9B12848c5Faa81629944',
          repoSubAccountDriver: '0xB8743C2bB8DF7399273aa7EE4cE8d4109Bec327F',
        },
      };
  }
}

function validateChain(chainId: number) {
  if (!SUPPORTED_CHAIN_IDS.includes(chainId as ChainId)) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}
