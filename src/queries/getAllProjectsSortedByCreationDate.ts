import {Client} from 'pg';
import appSettings from '../appSettings';
import {toBigInt} from 'ethers';
import {repoSubAccountReadContract} from '../contracts/repoSubAccountDriver';

const {
  network: {name: dbSchema},
} = appSettings;

export async function getAllProjectsAndSubProjectSortedByCreationDate(
  db: Client,
) {
  const projects = (
    await db.query<{
      id: bigint;
      createdAt: Date;
    }>({
      text: `SELECT * FROM ${dbSchema}.projects WHERE "verification_status" = 'claimed' ORDER BY "created_at" DESC`,
    })
  ).rows;

  const subProjects = await Promise.all(
    projects.map(async project => ({
      id: await repoSubAccountReadContract({
        functionName: 'calcAccountId',
        args: [toBigInt(project.id)],
      }),
      createdAt: project.createdAt,
    })),
  );

  return [...projects, ...subProjects].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
