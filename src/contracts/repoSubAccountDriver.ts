import type {
  AbiFunction,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
} from 'abitype';
import {Contract} from 'ethers';
import appSettings from '../appSettings';
import {getContractRunner} from '../getWalletInstance';
import {unwrapEthersResult, UnwrappedEthersResult} from './unwrapEthersResult';
import {
  repoSubAccountDriverAbi,
  RepoSubAccountDriverAbi,
} from './repoSubAccountDriverAbi';

const {
  network: {
    contracts: {repoSubAccountDriver: contractAddress},
    name: networkName,
  },
} = appSettings;

let contractInstance: Contract | null = null;

async function getRepoSubAccountContract(): Promise<Contract> {
  if (contractInstance) {
    return contractInstance;
  }

  if (!contractAddress) {
    throw new Error(`No contract address configured for chain: ${networkName}`);
  }

  try {
    contractInstance = new Contract(
      contractAddress,
      repoSubAccountDriverAbi,
      await getContractRunner(),
    );
    return contractInstance;
  } catch (error) {
    throw new Error(
      `Failed to initialize contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function repoSubAccountReadContract<
  functionName extends ExtractAbiFunctionNames<
    RepoSubAccountDriverAbi,
    'pure' | 'view'
  >,
  abiFunction extends AbiFunction = ExtractAbiFunction<
    RepoSubAccountDriverAbi,
    functionName
  >,
>(config: {
  functionName:
    | functionName
    | ExtractAbiFunctionNames<RepoSubAccountDriverAbi, 'pure' | 'view'>;
  args: AbiParametersToPrimitiveTypes<abiFunction['inputs'], 'inputs'>;
}): Promise<
  UnwrappedEthersResult<
    AbiParametersToPrimitiveTypes<abiFunction['outputs'], 'outputs'>
  >
> {
  try {
    const repoSubAccount = await getRepoSubAccountContract();
    const {functionName: func, args} = config;
    const result = await repoSubAccount[func](...args);

    return unwrapEthersResult(result);
  } catch (error: any) {
    throw new Error(
      `Read operation '${config.functionName}' failed: ${error.message}`,
    );
  }
}
