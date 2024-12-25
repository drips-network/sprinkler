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
    text: `SELECT * FROM "${dbSchema}"."GitProjects" ORDER BY "createdAt" DESC`,
  });
}
