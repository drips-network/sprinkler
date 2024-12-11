import {formatEther, parseEther, Wallet} from 'ethers';
import Safe from '@safe-global/protocol-kit';
import appSettings from './appSettings';

const {
  safes,
  rpcUrl,
  network: {minBalance, targetBalance, name: networkName},
} = appSettings;

async function requestWithdrawalFromSafe(
  wallet: Wallet,
  amount: bigint,
): Promise<void> {
  const safeAddress = safes[networkName];
  if (!safeAddress) {
    throw new Error('Safe address not configured');
  }

  try {
    const safeSdk = await Safe.init({
      provider: rpcUrl,
      safeAddress,
    });

    const transaction = {
      to: wallet.address,
      value: amount.toString(),
      data: '0x',
    };

    console.log('Requesting transaction...');
    const safeTransaction = await safeSdk.createTransaction({
      transactions: [transaction],
    });

    // console.log('Signing transaction...');
    // const signedTransaction = await safeSdk.signTransaction(safeTransaction);
    // console.log('Transaction prepared:', signedTransaction);

    const executeTxResponse = await safeSdk.executeTransaction(safeTransaction);
    console.log('Transaction confirmed. Hash:', executeTxResponse.hash);
  } catch (error) {
    console.error(
      'Failed to withdraw from Safe:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

export async function ensureWalletHasSufficientBalance(
  wallet: Wallet,
): Promise<void> {
  // Only try to top up the wallet on mainnet.
  // if (networkName !== 'mainnet') {
  //   console.log('Skipping auto top up on non-mainnet network.');
  //   return;
  // }

  if (!wallet.provider) {
    throw new Error('Wallet provider not configured');
  }

  console.log('Trying to auto top up wallet balance...');
  const balance = await wallet.provider.getBalance(wallet.address);
  console.log(`Current wallet balance: ${formatEther(balance)} ETH`);

  if (balance < parseEther(minBalance.toString())) {
    const neededAmount = parseEther(targetBalance.toString()) - balance;
    console.log(
      `Low balance (target is ${targetBalance} ETH), withdrawing ${formatEther(neededAmount)} ETH from Safe...`,
    );

    await requestWithdrawalFromSafe(wallet, neededAmount);
    const newBalance = await wallet.provider.getBalance(wallet.address);
    console.log(`New wallet balance: ${formatEther(newBalance)} ETH`);
  } else {
    console.log('Wallet balance is sufficient.');
  }
}
