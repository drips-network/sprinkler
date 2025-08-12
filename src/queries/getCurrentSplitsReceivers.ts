/* eslint-disable n/no-unsupported-features/es-builtins */
import {Client} from 'pg';
import appSettings from '../appSettings';
import {SplitsReceiver} from '../types';

const {
  network: {name: dbSchema},
} = appSettings;

type SplitRow = {
  receiver_account_id: string;
  weight: number;
};

export default async function getCurrentSplitsReceivers(
  db: Client,
  accountId: string,
): Promise<SplitsReceiver[]> {
  const {rows: splits} = await db.query<SplitRow>({
    text: `SELECT receiver_account_id, weight FROM "${dbSchema}"."splits_receivers" WHERE sender_account_id = $1`,
    values: [accountId],
  });

  const splitsReceivers = sortSplitsReceivers(
    splits.map(row => ({
      accountId: BigInt(row.receiver_account_id),
      weight: row.weight,
    })),
  );

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
