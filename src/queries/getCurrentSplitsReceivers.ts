/* eslint-disable n/no-unsupported-features/es-builtins */
import {Client} from 'pg';
import appSettings from '../appSettings';
import {SplitsReceiver} from '../types';

const {
  network: {name: dbSchema},
} = appSettings;

type SplitRow = {
  fundeeAccountId?: string;
  fundeeDripListId?: string;
  fundeeProjectId?: string;
  weight: bigint;
};

export default async function getCurrentSplitsReceivers(
  db: Client,
  accountId: string,
  type: 'dripList' | 'project',
): Promise<SplitsReceiver[]> {
  const idColumn = type === 'dripList' ? 'funderDripListId' : 'funderProjectId';

  const {rows: addressSplits} = await db.query<SplitRow>({
    text: `SELECT * FROM "${dbSchema}"."AddressDriverSplitReceivers" WHERE "${idColumn}" = $1`,
    values: [accountId],
  });

  const {rows: dripListSplits} = await db.query<SplitRow>({
    text: `SELECT * FROM "${dbSchema}"."DripListSplitReceivers" WHERE "${idColumn}" = $1`,
    values: [accountId],
  });

  const {rows: projectSplits} = await db.query<SplitRow>({
    text: `SELECT * FROM "${dbSchema}"."RepoDriverSplitReceivers" WHERE "${idColumn}" = $1`,
    values: [accountId],
  });

  const splitsReceivers = sortSplitsReceivers([
    ...addressSplits.map(({fundeeAccountId, weight}) => ({
      accountId: BigInt(fundeeAccountId!),
      weight: Number(weight),
    })),
    ...dripListSplits.map(({fundeeDripListId, weight}) => ({
      accountId: BigInt(fundeeDripListId!),
      weight: Number(weight),
    })),
    ...projectSplits.map(({fundeeProjectId, weight}) => ({
      accountId: BigInt(fundeeProjectId!),
      weight: Number(weight),
    })),
  ]);

  return splitsReceivers;
}

function sortSplitsReceivers(splits: SplitsReceiver[]): SplitsReceiver[] {
  // Splits receivers must be sorted by user ID, deduplicated, and without weights <= 0.
  const uniqueReceivers = splits.reduce((unique: SplitsReceiver[], o) => {
    if (
      !unique.some(
        (obj: SplitsReceiver) =>
          obj.accountId === o.accountId && obj.weight === o.weight,
      )
    ) {
      unique.push(o);
    }
    return unique;
  }, []);

  const sortedReceivers = uniqueReceivers.sort((a, b) =>
    // Sort by user ID.
    BigInt(a.accountId) > BigInt(b.accountId)
      ? 1
      : BigInt(a.accountId) < BigInt(b.accountId)
        ? -1
        : 0,
  );

  return sortedReceivers.map(r => ({
    accountId: BigInt(r.accountId),
    weight: r.weight,
  }));
}
