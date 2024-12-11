import {Client} from 'pg';
import appSettings from '../appSettings';
import {OxString} from '../types';

export default async function getTokens(db: Client) {
  const {chain} = appSettings;

  const distictGivenTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${chain}"."GivenEvents"
    `,
  });

  const distictSplitTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${chain}"."SplitEvents"
    `,
  });

  const distinctStreamSetTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${chain}"."StreamsSetEvents"
    `,
  });

  const distictSqueezedStreamsTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${chain}"."SqueezedStreamsEvents"
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
