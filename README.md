# Solana React Auth Provider

A React context provider that allows users to authenticate using their Solana wallet. It uses browser local storage to store the authentication data. which includes the signature, public key, and the timestamp of the signature in seconds.
It verifies the signature using the public key and the signature itself and also checks the timestamp to ensure that the signature is not expired.

# Installation

### bun

```bash
bun add solana-react-auth
```

### yarn

```bash
yarn add solana-react-auth
```

### npm

```bash
npm install solana-react-auth
```

# Exposed Objects

### `SolanaAuthProvider`

A React component that wraps the application and provides the authentication context. It takes the following props:

- **`wallet`**: WalletContext returend from useWallet hook from @solana/wallet-adapter-react.
- **`message`**: A string that represents the message to be signed by the user.
- **`children`**: A React node that represents the children of the component.
- **`authTimeout`**: A number that represents the timeout of the authentication in seconds.

> Note: This provider should be a child of WalletProvider from @solana/wallet-adapter-react.

```tsx
<SolanaAuthProvider
  wallet={wallet}
  message="Sign in to continue"
  authTimeout={60}
>
  <App />
</SolanaAuthProvider>
```

### `useSolanaAuth`

A React hook that exposes the following methods:

- **`checkIsAuthenticated`**: Returns a boolean value indicating if the user is authenticated.
- **`authenticate`**: A function that tries to authenticate the user.
- **`getAuthData`**: Returns the authentication data, including the signature, public key, and the timestamp of the signature in seconds.

```tsx
const { checkIsAuthenticated, authenticate, getAuthData } = useSolanaAuth();
```

### `AuthStorage`

An object that represents the authentication data stored in the local storage of the browser.

```typescript
type AuthStorage = {
  signature: string;
  pubkey: string;
  signedAt: number;
};
```
