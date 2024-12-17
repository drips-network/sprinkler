import {Client} from 'pg';
import appSettings from '../appSettings';

const {
  network: {name: dbSchema},
} = appSettings;

export async function getAllProjectsSortedByCreationDate(db: Client) {
  return db.query<{
    id: bigint;
    createdAt: Date;
  }>({
    text: `SELECT * FROM "${dbSchema}"."GitProjects" WHERE "claimedAt" IS NOT NULL ORDER BY "createdAt" DESC`,
  });
}
