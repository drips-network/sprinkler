import {Client} from 'pg';
import appSettings from '../appSettings';
import {OxString} from '../types';

export default async function getTokens(db: Client) {
  const {
    network: {name: dbSchema},
  } = appSettings;

  const distictGivenTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."GivenEvents"
    `,
  });

  const distictSplitTokens = await db.query({
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

  const distictSqueezedStreamsTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."SqueezedStreamsEvents"
    `,
  });

  return [
    ...new Set([
      ...distictGivenTokens.rows.map(row => row.erc20),
      ...distictSplitTokens.rows.map(row => row.erc20),
      ...distinctStreamSetTokens.rows.map(row => row.erc20),
      ...distictSqueezedStreamsTokens.rows.map(row => row.erc20),
    ]),
  ] as OxString[];
}
