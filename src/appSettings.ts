import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import {ChainId} from './types';
import getNetwork from './getNetwork';

dotenvExpand.expand(dotenv.config());

const appSettings = {
  connectionString:
    process.env.POSTGRES_CONNECTION_STRING ??
    missingEnvVar('POSTGRES_CONNECTION_STRING'),
  walletPrivateKey: validatePrivateKey(
    process.env.WALLET_PRIVATE_KEY ?? missingEnvVar('WALLET_PRIVATE_KEY'),
  ),

  network: getNetwork(
    Number(process.env.CHAIN_ID ?? missingEnvVar('CHAIN_ID')) as ChainId,
  ),

  rpcUrl: process.env.RPC_URL ?? missingEnvVar('RPC_URL'),
  rpcUrlAccessToken: process.env.RPC_URL_ACCESS_TOKEN,
} as const;

export default appSettings;

function missingEnvVar(name: string): never {
  throw new Error(`Missing ${name} in .env file.`);
}

function validatePrivateKey(key: string): string {
  if (!key.match(/^[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid wallet private key format');
  }

  return key;
}
