import {Client} from 'pg';
import appSettings from '../appSettings';

const {
  network: {name: dbSchema},
} = appSettings;

export async function getAllDripListsSortedByCreationDate(db: Client) {
  return db.query<{
    id: bigint;
    createdAt: Date;
  }>({
    text: `
      SELECT
        dl.account_id as "id",
        dl.created_at as "createdAt"
      FROM ${dbSchema}."drip_lists" dl
      ORDER BY "created_at" DESC`,
  });
}
