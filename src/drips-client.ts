import type {
  AbiFunction,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
} from 'abitype';
import {dripsAbi, type DripsAbi} from './drips-abi';
import {Contract, TransactionResponse} from 'ethers';
import appSettings from './appSettings';
import getWalletInstance from './getWalletInstance';

const {chain} = appSettings;

const contractAddresses = {
  mainnet: '0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4',
  filecoin: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
  sepolia: '0x74A32a38D945b9527524900429b083547DeB9bF4',
} as const;

let contractInstance: Contract | null = null;

async function getDripsContract(): Promise<Contract> {
  if (contractInstance) {
    return contractInstance;
  }

  const wallet = await getWalletInstance();
  const contractAddress = contractAddresses[chain];

  if (!contractAddress) {
    throw new Error(`No contract address configured for chain: ${chain}`);
  }

  try {
    contractInstance = new Contract(contractAddress, dripsAbi, wallet);
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

export function unwrapEthersResult<T>(
  result: T | T[],
): UnwrappedEthersResult<T> | UnwrappedEthersResult<T[]> {
  if (Array.isArray(result) && result.length === 1) {
    return result[0] as UnwrappedEthersResult<T>;
  }
  return result as UnwrappedEthersResult<T[]>;
}

export type UnwrappedEthersResult<T> = T extends [infer U]
  ? U
  : T extends readonly [infer U]
    ? U
    : T;
