import type {
  AbiFunction,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
} from 'abitype';
import {Contract, TransactionResponse} from 'ethers';
import appSettings from '../appSettings';
import {getContractRunner} from '../getWalletInstance';
import {dripsAbi, DripsAbi} from './drips-abi';
import {unwrapEthersResult, UnwrappedEthersResult} from './unwrapEthersResult';

const {
  network: {
    contracts: {drips: contractAddress},
    name: networkName,
  },
} = appSettings;

let contractInstance: Contract | null = null;

async function getDripsContract(): Promise<Contract> {
  if (contractInstance) {
    return contractInstance;
  }

  if (!contractAddress) {
    throw new Error(`No contract address configured for chain: ${networkName}`);
  }

  try {
    contractInstance = new Contract(
      contractAddress,
      dripsAbi,
      await getContractRunner(),
    );
    return contractInstance;
  } catch (error) {
    throw new Error(
      `Failed to initialize contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function dripsReadContract<
  functionName extends ExtractAbiFunctionNames<DripsAbi, 'pure' | 'view'>,
  abiFunction extends AbiFunction = ExtractAbiFunction<DripsAbi, functionName>,
>(config: {
  functionName:
    | functionName
    | ExtractAbiFunctionNames<DripsAbi, 'pure' | 'view'>;
  args: AbiParametersToPrimitiveTypes<abiFunction['inputs'], 'inputs'>;
}): Promise<
  UnwrappedEthersResult<
    AbiParametersToPrimitiveTypes<abiFunction['outputs'], 'outputs'>
  >
> {
  try {
    const drips = await getDripsContract();
    const {functionName: func, args} = config;
    const result = await drips[func](...args);

    return unwrapEthersResult(result);
  } catch (error: any) {
    throw new Error(
      `Read operation '${config.functionName}' failed: ${error.message}`,
    );
  }
}

export async function dripsWriteContract<
  functionName extends ExtractAbiFunctionNames<
    DripsAbi,
    'nonpayable' | 'payable'
  >,
  abiFunction extends AbiFunction = ExtractAbiFunction<DripsAbi, functionName>,
>(config: {
  functionName:
    | functionName
    | ExtractAbiFunctionNames<DripsAbi, 'nonpayable' | 'payable'>;
  args: AbiParametersToPrimitiveTypes<abiFunction['inputs'], 'inputs'>;
}): Promise<TransactionResponse> {
  try {
    const drips = await getDripsContract();
    const {functionName: func, args} = config;
    return await drips[func](...args);
  } catch (error: any) {
    throw new Error(
      `Write operation '${config.functionName}' failed: ${error.message}`,
    );
  }
}
