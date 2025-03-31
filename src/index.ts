import {Client} from 'pg';
import {formatEther} from 'ethers';
import {getAllDripListsSortedByCreationDate} from './queries/getAllDripListsSortedByCreationDate';
import {getAllProjectsSortedByCreationDate} from './queries/getAllProjectsSortedByCreationDate';
import getCurrentSplitsReceivers from './queries/getCurrentSplitsReceivers';
import getTokens from './queries/getTokens';
import getWalletInstance from './getWalletInstance';
import {dripsReadContract, dripsWriteContract} from './drips-client';
import appSettings from './appSettings';
import retry from 'async-retry';
import {
  OxString,
  ProcessingResult,
  SplitsReceiver,
  WriteOperation,
} from './types';
import {notifyDiscord} from './notifyDiscord';

const MAX_CYCLES = 1000;
const SCRIPT_ITERATIONS = 3;

async function checkTotalWeight(
  splitsReceivers: SplitsReceiver[],
  type: string,
  accountId: string,
): Promise<boolean> {
  const totalWeight = splitsReceivers.reduce(
    (acc, {weight}) => acc + weight,
    0,
  );

  if (totalWeight !== 1000000) {
    const message = `Weights Mismatch: The sum of weights for ${type} ${accountId} is ${totalWeight}, but should be 1000000. Skipping split operation.`;
    console.warn(message);
    await notifyDiscord(message);
    return false;
  }
  return true;
}

function doIfNotDryRun<T>(fn: () => Promise<T>): Promise<T> | null {
  if (appSettings.dryRun) {
    console.log('Dry run mode. Skipping execution.');
    return null;
  }
  return fn();
}

async function main(): Promise<void> {
  if (!appSettings.shouldRun) {
    console.log('Script is disabled. Exiting...');
    return;
  }

  const startTime = Date.now();
  const wallet = await getWalletInstance();
  const db = new Client({connectionString: appSettings.connectionString});
  const allWriteOperations: WriteOperation[] = [];
  let scriptError: Error | null = null;
  let startBalance: bigint | undefined;

  try {
    console.log('Starting script...');
    await notifyDiscord(`💧 Now sprinkling: ${appSettings.network.name}`);

    await db.connect();
    console.log('Connected to database.');

    if (wallet) {
      startBalance = await wallet.provider!.getBalance(wallet.address);
      console.log(
        `Initial wallet balance: ${formatEther(startBalance)} ${appSettings.network.symbol}`,
      );
    }

    const tokens = await getTokens(db);
    console.log(`Found ${tokens.length} tokens to process`);

    for (let i = 0; i < SCRIPT_ITERATIONS; i++) {
      console.log(`\n=== Starting Iteration ${i + 1}/${SCRIPT_ITERATIONS} ===`);

      const dripListsResult = await processDripLists(db, tokens);
      const projectsResult = await processProjects(db, tokens);

      allWriteOperations.push(
        ...dripListsResult.writeOperations,
        ...projectsResult.writeOperations,
      );

      console.log(
        `=== Completed Iteration ${i + 1}/${SCRIPT_ITERATIONS} ===\n`,
      );
    }

    let costWei = 0n;
    let executionTimeMinutes = 0;
    if (wallet && startBalance) {
      const endBalance = await wallet.provider!.getBalance(wallet.address);
      costWei = startBalance - endBalance;
      executionTimeMinutes = (Date.now() - startTime) / 1000 / 60;
    }

    logWriteOperations(allWriteOperations);

    console.log('\n=== Final Results ===');
    console.log(
      `Total cost: ${formatEther(costWei)} ${appSettings.network.symbol}`,
    );
    console.log(
      `Total execution time: ${executionTimeMinutes.toFixed(2)} minutes`,
    );
  } catch (error) {
    scriptError = error instanceof Error ? error : new Error(String(error));
    console.error('Error running script:', scriptError.message);
    if (scriptError.stack) {
      console.error('Stack trace:', scriptError.stack);
    }
  } finally {
    const endBalance = wallet
      ? await wallet.provider!.getBalance(wallet.address)
      : 0n;
    const costWei = startBalance && endBalance ? startBalance - endBalance : 0n;
    const executionTimeMinutes = (Date.now() - startTime) / 1000 / 60;

    const summary = generateSummary(
      allWriteOperations,
      costWei,
      executionTimeMinutes,
      scriptError,
    );
    await notifyDiscord(summary);

    console.log('Disconnecting from database.');
    await db.end();
    console.log('Script finished.');
  }
}

async function processDripLists(
  db: Client,
  tokens: OxString[],
): Promise<ProcessingResult> {
  console.log('\nProcessing drip lists...');
  const writeOperations: WriteOperation[] = [];

  const {rows: dripLists} = await getAllDripListsSortedByCreationDate(db);

  for (const dripList of dripLists) {
    const splitsReceivers = await getCurrentSplitsReceivers(
      db,
      dripList.id.toString(),
      'dripList',
    );

    for (const token of tokens) {
      const result = await processToken(
        dripList.id,
        token,
        splitsReceivers,
        'dripList',
      );
      writeOperations.push(...result.writeOperations);
    }
  }

  console.log('Completed processing drip lists');
  return {writeOperations};
}

async function processProjects(
  db: Client,
  tokens: OxString[],
): Promise<ProcessingResult> {
  console.log('\nProcessing projects...');
  const writeOperations: WriteOperation[] = [];

  const {rows: projects} = await getAllProjectsSortedByCreationDate(db);

  for (const project of projects) {
    const id = project.id.toString();

    const splitsReceivers = await getCurrentSplitsReceivers(db, id, 'project');

    const weightsAreCorrect = await checkTotalWeight(
      splitsReceivers,
      'project',
      id,
    );

    if (!weightsAreCorrect) {
      continue;
    }

    for (const token of tokens) {
      const result = await processToken(
        project.id,
        token,
        splitsReceivers,
        'project',
      );
      writeOperations.push(...result.writeOperations);
    }
  }

  console.log('Completed processing projects');
  return {writeOperations};
}

async function processToken(
  accountId: bigint,
  token: string,
  splitsReceivers: SplitsReceiver[],
  type: 'dripList' | 'project',
): Promise<ProcessingResult> {
  const writeOperations: WriteOperation[] = [];
  const entityDescription = `${type} ${accountId}`;

  console.log(`Processing token ${token} for ${entityDescription}...`);

  const receivable = await dripsReadContract({
    functionName: 'receiveStreamsResult',
    args: [accountId, token as OxString, MAX_CYCLES],
  });

  if (receivable > 0) {
    try {
      const txResponse = await doIfNotDryRun(() =>
        dripsWriteContract({
          functionName: 'receiveStreams',
          args: [accountId, token as OxString, MAX_CYCLES],
        }),
      );

      if (txResponse) {
        console.log(
          `Awaiting 'receiveStreams' transaction ${txResponse.hash} for ${entityDescription}...`,
        );
        await retry(async () => txResponse.wait(1));

        writeOperations.push({
          type: 'receive',
          accountId,
          token,
          amount: receivable,
          txHash: txResponse.hash,
        });
        console.log(
          `Received ${formatEther(receivable)} tokens for ${entityDescription}. Transaction: ${txResponse.hash}`,
        );
      } else {
        console.log(
          `Dry run mode. Skipping 'receiveStreams' transaction for ${entityDescription}.`,
        );
      }
    } catch (error) {
      const errorMessage = `Receive Streams Error: Failed to receive streams for ${type} ${accountId}. Error: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage);
      await notifyDiscord(`❌ ${errorMessage}`);
    }
  }

  const splittable = await dripsReadContract({
    functionName: 'splittable',
    args: [accountId, token as OxString],
  });

  if (splittable > 0) {
    try {
      const txResponse = await doIfNotDryRun(() =>
        dripsWriteContract({
          functionName: 'split',
          args: [accountId, token as OxString, splitsReceivers],
        }),
      );

      if (txResponse) {
        console.log(
          `Awaiting 'split' transaction ${txResponse.hash} for ${entityDescription}...`,
        );
        await retry(async () => txResponse.wait(1));

        writeOperations.push({
          type: 'split',
          accountId,
          token,
          amount: splittable,
          txHash: txResponse.hash,
        });
        console.log(
          `Split ${formatEther(splittable)} tokens for ${entityDescription}. Transaction: ${txResponse.hash}`,
        );
      } else {
        console.log(
          `Dry run mode. Skipping 'split' transaction for ${entityDescription}.`,
        );
      }
    } catch (error) {
      const errorMessage = `Split Error: Failed to split for ${type} ${accountId}. Error: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage);
      await notifyDiscord(`❌ ${errorMessage}`);
    }
  }

  return {writeOperations};
}

function generateSummary(
  operations: WriteOperation[],
  costWei: bigint,
  durationMinutes: number,
  error: Error | null,
): string {
  const receiveOps = operations.filter(op => op.type === 'receive');
  const splitOps = operations.filter(op => op.type === 'split');

  let summary = `✅ Sprinkler script finished for network: ${appSettings.network.name}.\n`;
  if (error) {
    summary = `❌ Sprinkler script finished with errors for network: ${appSettings.network.name}.\nError: ${error.message}\n`;
  }

  summary += `Execution Time: ${durationMinutes.toFixed(2)} minutes\n`;
  summary += `Total Cost: ${formatEther(costWei)} ${appSettings.network.symbol}\n`;
  summary += `Total Operations: ${operations.length} (Receives: ${receiveOps.length}, Splits: ${splitOps.length})\n`;

  return summary;
}

function logWriteOperations(operations: WriteOperation[]): void {
  const receiveOps = operations.filter(op => op.type === 'receive');
  const splitOps = operations.filter(op => op.type === 'split');

  console.log('\n=== Write Operations Summary ===');
  console.log(`Total operations: ${operations.length}`);
  console.log(`Receive operations: ${receiveOps.length}`);
  console.log(`Split operations: ${splitOps.length}`);

  if (receiveOps.length > 0) {
    console.log('\nReceive Operations:');
    receiveOps.forEach(op => {
      console.log(
        `Account ${op.accountId}: Received ${formatEther(op.amount)} ${op.token} (tx: ${op.txHash})`,
      );
    });
  }

  if (splitOps.length > 0) {
    console.log('\nSplit Operations:');
    splitOps.forEach(op => {
      console.log(
        `Account ${op.accountId}: Split ${formatEther(op.amount)} ${op.token} (tx: ${op.txHash})`,
      );
    });
  }
}

void main().catch(async error => {
  console.error('Unhandled error in main:', error);

  await notifyDiscord(
    `🚨 Unhandled critical error in sprinkler script: ${error instanceof Error ? error.message : String(error)}`,
  );

  throw error;
});
