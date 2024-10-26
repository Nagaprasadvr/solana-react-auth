import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { PublicKey } from "@solana/web3.js";
import { type WalletContextState } from "@solana/wallet-adapter-react";

import bs58 from "bs58";
import solanaCrypto from "tweetnacl";

export type SolanaAuthProviderProps = {
  children: ReactNode;
  message: object;
  wallet: WalletContextState;
  authTimeout: number; // in seconds
};

export interface SolanaAuthContextType {
  checkIsAuthenticated: (wallet: WalletContextState) => boolean;
  authenticate: (wallet: WalletContextState) => void;
  getAuthData: () => AuthStorage | null;
}

const defaultContext: SolanaAuthContextType = {
  checkIsAuthenticated: () => false,
  authenticate: () => {},
  getAuthData: () => null,
};

const SolanaAuthContext = createContext<SolanaAuthContextType>(defaultContext);

export type AuthStorage = {
  signature: string;
  pubkey: string;
  signedAt: number; // timestamp in seconds
};

export const SolanaAuthProvider = ({
  children,
  message,
  wallet,
  authTimeout,
}: SolanaAuthProviderProps) => {
  const [pubkey, setPubkey] = useState<string | null>(null);

  // set this when the pubkey is available
  useEffect(() => {
    if (wallet?.connected && wallet?.publicKey) {
      setPubkey(wallet.publicKey.toBase58());
    }

    if (!wallet?.connected) {
      setPubkey(null);
    }
  }, [wallet?.connected, wallet?.publicKey]);

  // if pubkey changes, re-authenticate
  useEffect(() => {
    authenticate();
  }, [pubkey]);

  const checkIsAuthenticated = useCallback((): boolean => {
    try {
      if (!wallet.connected) {
        return false;
      }

      if (!pubkey) {
        return false;
      }

      const storedAuth = getstoredAuth();
      if (!storedAuth) {
        return false;
      }

      const isSignatureValid = verifySignature(
        storedAuth.signature,
        pubkey,
        getJsonMessage(pubkey, message)
      );

      if (!isSignatureValid) {
        return false;
      }

      const now = getTimeNowInSeconds();
      const signedAt = storedAuth.signedAt;
      const elapsed = now - signedAt;

      return elapsed < authTimeout;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [pubkey]);

  const authenticate = useCallback(async () => {
    try {
      console.log("authenticating...", pubkey);
      if (!pubkey) {
        return;
      }

      // if already authenticated, no need to re-authenticate
      if (checkIsAuthenticated()) {
        return;
      }

      // sign the message
      const signedMessage = await signMessage(
        getJsonMessage(pubkey, message),
        wallet
      );

      // store the signature on local storage
      storeSignature(signedMessage, pubkey);
    } catch (e) {
      console.error(e);
    }
  }, [pubkey]);

  const getAuthData = () => {
    return getstoredAuth();
  };

  return (
    <SolanaAuthContext.Provider
      value={{
        checkIsAuthenticated,
        authenticate,
        getAuthData,
      }}
    >
      {children}
    </SolanaAuthContext.Provider>
  );
};

export const useSolanaAuth = () => {
  return useContext(SolanaAuthContext);
};

function minimizePubkey(pubkey: PublicKey) {
  const pubkeyStr = pubkey.toBase58();
  return pubkeyStr.slice(0, 4) + "..." + pubkeyStr.slice(-4);
}

function encodeWithBase58(sig: Uint8Array) {
  return bs58.encode(sig);
}

function decodeWithBase58(sig: string) {
  return bs58.decode(sig);
}

function getMessageToSign(jsonMessage: object) {
  return new Uint8Array(
    JSON.stringify(jsonMessage)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
}

function verifySignature(
  signature: string, // base58 encoded
  pubkey: string, // base58 encoded
  jsonMessage: object
) {
  return solanaCrypto.sign.detached.verify(
    getMessageToSign(jsonMessage),
    decodeWithBase58(signature),
    decodeWithBase58(pubkey)
  );
}

async function signMessage(jsonMessage: object, wallet: WalletContextState) {
  if (!wallet.publicKey) {
    throw new Error("Wallet public key is not available");
  }

  if (!wallet.signMessage) {
    throw new Error("Wallet does not support signing messages");
  }

  const encodedMessage = getMessageToSign(jsonMessage);
  const signature = await wallet.signMessage(encodedMessage);

  return encodeWithBase58(signature);
}

function getJsonMessage(pubkey: string, jsonMessage: any) {
  if (!jsonMessage["pubkey"]) {
    jsonMessage["pubkey"] = pubkey;
  }
  return jsonMessage;
}

function storeSignature(signature: string, pubkey: string) {
  const authStorage: AuthStorage = {
    signature,
    pubkey,
    signedAt: getTimeNowInSeconds(),
  };

  localStorage.setItem("authStorage", JSON.stringify(authStorage));
}

function getstoredAuth(): AuthStorage | null {
  const authStorage = localStorage.getItem("authStorage");
  if (!authStorage) {
    return null;
  }

  return JSON.parse(authStorage);
}

function getCheckedAuthTimeout(authTimeout: number) {
  const secondsInDay = 24 * 60 * 60;
  if (authTimeout > secondsInDay) {
    return secondsInDay;
  }
  return authTimeout;
}

function getTimeNowInSeconds() {
  return Math.floor(Date.now() / 1000);
}
