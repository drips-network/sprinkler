export function isRepoSubAccountDriverId(id: string | bigint): boolean {
  const idString = typeof id === 'bigint' ? id.toString() : id;
  const isNaN = Number.isNaN(Number(idString));
  const isAccountIdOfRepoSubAccountDriver =
    getContractNameFromAccountId(idString) === 'repoSubAccountDriver';

  if (isNaN || !isAccountIdOfRepoSubAccountDriver) {
    return false;
  }

  return true;
}

function getContractNameFromAccountId(id: string) {
  if (Number.isNaN(Number(id))) {
    throw new Error(`Could not get bits: ${id} is not a number.`);
  }

  const accountIdAsBigInt = BigInt(id);

  if (accountIdAsBigInt < 0n || accountIdAsBigInt > 2n ** 256n - 1n) {
    throw new Error(
      `Could not get bits: ${id} is not a valid positive number within the range of a uint256.`,
    );
  }

  const mask = 2n ** 32n - 1n; // 32 bits mask

  const bits = (accountIdAsBigInt >> 224n) & mask; // eslint-disable-line no-bitwise

  switch (bits) {
    case 0n:
      return 'addressDriver';
    case 1n:
      return 'nftDriver';
    case 2n:
      return 'immutableSplitsDriver';
    case 3n:
      return 'repoDriver';
    case 4n:
      return 'repoSubAccountDriver';
    default:
      throw new Error(`Unknown driver for ID ${id}.`);
  }
}
