import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import {SUPPORTED_CHAINS, SupportedChain} from './types';

dotenvExpand.expand(dotenv.config());

const appSettings = {
  connectionString:
    process.env.POSTGRES_CONNECTION_STRING ??
    missingEnvVar('POSTGRES_CONNECTION_STRING'),
  walletPrivateKey: validatePrivateKey(
    process.env.WALLET_PRIVATE_KEY ?? missingEnvVar('WALLET_PRIVATE_KEY'),
  ),
  chain: validateChain(process.env.CHAIN ?? missingEnvVar('CHAIN')),
  rpcUrl: process.env.RPC_URL ?? missingEnvVar('RPC_URL'),
  rpcUrlAccessToken: process.env.RPC_URL_ACCESS_TOKEN,
  graphQlUrl: process.env.GRAPHQL_URL ?? missingEnvVar('GRAPHQL_URL'),
  graphQlAccessToken:
    process.env.GRAPHQL_ACCESS_TOKEN ?? missingEnvVar('GRAPHQL_ACCESS_TOKEN'),
} as const;

export default appSettings;

function missingEnvVar(name: string): never {
  throw new Error(`Missing ${name} in .env file.`);
}

function validateChain(chain: string): SupportedChain {
  if (!SUPPORTED_CHAINS.includes(chain as SupportedChain)) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  return chain as SupportedChain;
}

function validatePrivateKey(key: string): string {
  if (!key.match(/^[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid wallet private key format');
  }

  return key;
}
