// frontend/src/services/wallet.ts
export async function connectWallet(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error("No wallet found. Install MetaMask (or another EVM wallet).");
  }

  // Ask user to connect accounts
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const addr = accounts?.[0];
  if (!addr) throw new Error("Wallet returned no accounts.");

  return addr;
}