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
    text: `SELECT * FROM "${dbSchema}"."DripLists" ORDER BY "createdAt" DESC`,
  });
}
