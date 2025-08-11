import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import {ChainId} from './types';
import getNetwork from './getNetwork';

dotenvExpand.expand(dotenv.config());

function parseCommaSeparatedList(envVar: string | undefined): string[] {
  if (!envVar) {
    return [];
  }
  return envVar
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

const appSettings = {
  shouldRun: process.env.SHOULD_RUN === 'true',
  dryRun: process.env.DRY_RUN === 'true',

  connectionString:
    process.env.POSTGRES_CONNECTION_STRING ??
    missingEnvVar('POSTGRES_CONNECTION_STRING'),

  walletPrivateKey:
    process.env.DRY_RUN === 'true'
      ? undefined
      : validatePrivateKey(
          process.env.WALLET_PRIVATE_KEY ?? missingEnvVar('WALLET_PRIVATE_KEY'),
        ),

  network: getNetwork(
    Number(process.env.CHAIN_ID ?? missingEnvVar('CHAIN_ID')) as ChainId,
  ),

  rpcUrl: process.env.RPC_URL ?? missingEnvVar('RPC_URL'),
  rpcUrlAccessToken: process.env.RPC_URL_ACCESS_TOKEN,

  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,

  accountIdsToSkip: parseCommaSeparatedList(process.env.ACCOUNT_IDS_TO_SKIP),
  accountIdsToSplitDespiteWrongWeights: parseCommaSeparatedList(
    process.env.ACCOUNT_IDS_TO_SPLIT_DESPITE_WRONG_WEIGHTS,
  ),
} as const;

if (!appSettings.discordWebhookUrl) {
  console.warn(
    'No Discord webhook URL provided. Notifications will not be sent.',
  );
}

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
