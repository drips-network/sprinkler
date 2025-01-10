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
    text: `SELECT * FROM "${dbSchema}"."GitProjects" WHERE "verificationStatus" = 'Claimed' ORDER BY "createdAt" DESC`,
  });
}
