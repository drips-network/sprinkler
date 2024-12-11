import {Client} from 'pg';
import appSettings from '../appSettings';

const {chain} = appSettings;

export async function getAllDripListsSortedByCreationDate(db: Client) {
  return db.query<{
    id: bigint;
    createdAt: Date;
  }>({
    text: `SELECT * FROM "${chain}"."DripLists" ORDER BY "createdAt" DESC`,
  });
}
