import type { TransactionIntent } from "./api";

function toHex(value: number | string | bigint): string {
  return "0x" + BigInt(value).toString(16);
}

export function encodeErc20Approve(spender: string, amount: number | string | bigint): string {
  const methodId = "0x095ea7b3"; // approve(address,uint256)
  const paddedSpender = spender.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const paddedAmount = BigInt(amount).toString(16).padStart(64, "0");
  return `${methodId}${paddedSpender}${paddedAmount}`;
}

export async function ensureCorrectChain(requiredChainId: number) {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet found.");

  const currentChainHex: string = await eth.request({
    method: "eth_chainId",
  });
  const currentChainId = Number(BigInt(currentChainHex));

  if (currentChainId === requiredChainId) return;

  const targetHex = toHex(requiredChainId);

  await eth.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: targetHex }],
  });
}

export async function sendIntentTransaction(
  from: string,
  intent: TransactionIntent
): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet found.");

  await ensureCorrectChain(intent.chain_id);

  const txHash: string = await eth.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: intent.to,
        data: intent.data,
        value: toHex(intent.value_wei || 0),
      },
    ],
  });

  return txHash;
}

export async function sendApproveTransaction(args: {
  from: string;
  tokenAddress: string;
  spender: string;
  amount: number | string | bigint;
  chainId: number;
}): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet found.");

  await ensureCorrectChain(args.chainId);

  const data = encodeErc20Approve(args.spender, args.amount);

  const txHash: string = await eth.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: args.from,
        to: args.tokenAddress,
        data,
        value: "0x0",
      },
    ],
  });

  return txHash;
}

export async function waitForReceipt(txHash: string, timeoutMs = 120000) {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet found.");

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const receipt = await eth.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });

    if (receipt) return receipt;

    await new Promise((r) => setTimeout(r, 2500));
  }

  throw new Error("Transaction pending too long. Check wallet / explorer.");
}