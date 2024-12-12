import {FetchRequest, JsonRpcProvider, Wallet} from 'ethers';
import appSettings from './appSettings';

let walletInstance: Wallet | null = null;

function createAuthFetchRequest(rpcUrl: string, token: string): FetchRequest {
  const fetchRequest = new FetchRequest(rpcUrl);
  fetchRequest.method = 'POST';
  fetchRequest.setHeader('Content-Type', 'application/json');
  fetchRequest.setHeader('Authorization', `Bearer ${token}`);
  return fetchRequest;
}

export default async function getWalletInstance(): Promise<Wallet> {
  if (walletInstance) {
    return walletInstance;
  }

  try {
    const {rpcUrl, rpcUrlAccessToken} = appSettings;
    const urlOrFetchRequest = rpcUrlAccessToken
      ? createAuthFetchRequest(rpcUrl, rpcUrlAccessToken)
      : rpcUrl;

    const provider = new JsonRpcProvider(urlOrFetchRequest);

    const network = await provider.getNetwork();
    // eslint-disable-next-line n/no-unsupported-features/es-builtins
    if (network.chainId !== BigInt(appSettings.network.chainId)) {
      throw new Error(
        `Provider connected to chain ${network.chainId} but expected ${appSettings.network.chainId}`,
      );
    }

    walletInstance = new Wallet(appSettings.walletPrivateKey, provider);

    // Quick check that the wallet is operational.
    await walletInstance.getAddress();

    return walletInstance;
  } catch (error) {
    walletInstance = null;

    throw new Error(
      `Wallet initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
