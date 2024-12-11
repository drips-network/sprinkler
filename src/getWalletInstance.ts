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
    const {
      rpcUrl,
      rpcUrlAccessToken,
      network: {name: currentNetwork},
    } = appSettings;
    const urlOrFetchRequest = rpcUrlAccessToken
      ? createAuthFetchRequest(rpcUrl, rpcUrlAccessToken)
      : rpcUrl;

    const provider = new JsonRpcProvider(urlOrFetchRequest);

    const providerNetwork = await provider.getNetwork();
    if (providerNetwork.name !== currentNetwork) {
      throw new Error(
        `Provider connected to ${providerNetwork.name} but expected ${currentNetwork}`,
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
