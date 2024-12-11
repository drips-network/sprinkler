import {Client} from 'pg';
import appSettings from '../appSettings';

const {chain} = appSettings;

export async function getAllProjectsSortedByCreationDate(db: Client) {
  return db.query<{
    id: bigint;
    createdAt: Date;
  }>({
    text: `SELECT * FROM "${chain}"."GitProjects" ORDER BY "createdAt" DESC`,
  });
}
