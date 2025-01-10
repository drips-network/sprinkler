import {Client} from 'pg';
import appSettings from '../appSettings';
import {OxString} from '../types';

export default async function getTokens(db: Client) {
  const {
    network: {name: dbSchema},
  } = appSettings;

  const distinctGivenTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."GivenEvents"
    `,
  });

  const distinctSplitTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."SplitEvents"
    `,
  });

  const distinctStreamSetTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."StreamsSetEvents"
    `,
  });

  const distinctSqueezedStreamsTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."SqueezedStreamsEvents"
    `,
  });

  return [
    ...new Set([
      ...distinctGivenTokens.rows.map(row => row.erc20),
      ...distinctSplitTokens.rows.map(row => row.erc20),
      ...distinctStreamSetTokens.rows.map(row => row.erc20),
      ...distinctSqueezedStreamsTokens.rows.map(row => row.erc20),
    ]),
  ] as OxString[];
}
