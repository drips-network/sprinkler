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
      FROM ${dbSchema}.given_events
    `,
  });

  const distinctSplitTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM ${dbSchema}.split_events
    `,
  });

  const distinctStreamSetTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM ${dbSchema}.streams_set_events
    `,
  });

  const distinctSqueezedStreamsTokens = await db.query({
    text: `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM ${dbSchema}.squeezed_streams_events
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
