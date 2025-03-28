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

const MAX_CYCLES = 1000;
const SCRIPT_ITERATIONS = 3;

async function main(): Promise<void> {
  if (!appSettings.shouldRun) {
    console.log('Script is disabled. Exiting...');
    return;
  }

  const startTime = Date.now();
  const wallet = await getWalletInstance();
  const db = new Client({connectionString: appSettings.connectionString});
  const allWriteOperations: WriteOperation[] = [];

  try {
    console.log('Starting script...');
    await db.connect();
    console.log('Connected to database.');

    const startBalance = await wallet.provider!.getBalance(wallet.address);
    console.log(
      `Initial wallet balance: ${formatEther(startBalance)} ${appSettings.network.symbol}`,
    );

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

    const endBalance = await wallet.provider!.getBalance(wallet.address);
    const costWei = startBalance - endBalance;
    const executionTimeMinutes = (Date.now() - startTime) / 1000 / 60;

    logWriteOperations(allWriteOperations);

    console.log('\n=== Final Results ===');
    console.log(
      `Total cost: ${formatEther(costWei)} ${appSettings.network.symbol}`,
    );
    console.log(
      `Total execution time: ${executionTimeMinutes.toFixed(2)} minutes`,
    );
  } catch (error) {
    console.error(
      'Error running script:',
      error instanceof Error ? error.message : error,
    );
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await db.end();
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
    const splitsReceivers = await getCurrentSplitsReceivers(
      db,
      project.id.toString(),
      'project',
    );

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
    const txResponse = await dripsWriteContract({
      functionName: 'receiveStreams',
      args: [accountId, token as OxString, MAX_CYCLES],
    });

    console.log(
      `Awaiting 'receiveStreams' transaction ${txResponse.hash} for ${entityDescription}...`,
    );
    await retry(() => txResponse.wait);

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
  }

  const splittable = await dripsReadContract({
    functionName: 'splittable',
    args: [accountId, token as OxString],
  });

  if (splittable > 0) {
    const txResponse = await dripsWriteContract({
      functionName: 'split',
      args: [accountId, token as OxString, splitsReceivers],
    });

    console.log(
      `Awaiting 'split' transaction ${txResponse.hash} for ${entityDescription}...`,
    );
    await retry(() => txResponse.wait);

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
  }

  return {writeOperations};
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

void main().catch(error => {
  console.error('Unhandled error in main:', error);
  process.exit(1); // eslint-disable-line n/no-process-exit
});
