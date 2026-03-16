import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { connectWallet } from "../services/wallet";

type WalletContextType = {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(
    localStorage.getItem("wallet_address")
  );

  async function connect() {
    const addr = await connectWallet();
    setAddress(addr);
    localStorage.setItem("wallet_address", addr);
  }

  function disconnect() {
    setAddress(null);
    localStorage.removeItem("wallet_address");
  }

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    const onAccountsChanged = (accounts: string[]) => {
      const next = accounts?.[0] || null;
      setAddress(next);
      if (next) localStorage.setItem("wallet_address", next);
      else localStorage.removeItem("wallet_address");
    };

    eth.on?.("accountsChanged", onAccountsChanged);
    return () => eth.removeListener?.("accountsChanged", onAccountsChanged);
  }, []);

  const value = useMemo(
    () => ({ address, connect, disconnect }),
    [address]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return ctx;
}