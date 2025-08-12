import {Client} from 'pg';
import appSettings from '../appSettings';
import type {OxString} from '../types';

const {
  network: {name: dbSchema},
} = appSettings;

export type OrcidAccountRow = {
  accountId: bigint;
  ownerAddress: OxString;
  ownerAccountId: bigint;
  isLinked: boolean;
  identityType: string;
  receiverAccountId: bigint;
  weight: number;
};

export async function getAllOrcidAccountsWithSplits(
  db: Client,
): Promise<OrcidAccountRow[]> {
  const query = `
    SELECT 
      li.account_id as "accountId",
      li.owner_address as "ownerAddress", 
      li.owner_account_id as "ownerAccountId",
      li.is_linked as "isLinked",
      li.identity_type as "identityType",
      sr.receiver_account_id as "receiverAccountId",
      sr.weight as "weight"
    FROM ${dbSchema}.linked_identities li
    INNER JOIN ${dbSchema}.splits_receivers sr ON li.account_id = sr.sender_account_id
    WHERE li.identity_type = 'orcid' 
    AND li.is_linked = true
    ORDER BY li.account_id
  `;

  const result = await db.query(query);

  return result.rows.map(row => ({
    accountId: BigInt(row.accountId),
    ownerAddress: row.ownerAddress as OxString,
    ownerAccountId: BigInt(row.ownerAccountId),
    isLinked: row.isLinked,
    identityType: row.identityType,
    receiverAccountId: BigInt(row.receiverAccountId),
    weight: row.weight,
  }));
}
