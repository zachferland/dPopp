// --- React Methods
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useConnectWallet, useWallets } from "@web3-onboard/react";
import "./App.css";
import { Dashboard, Home, Layout, NoMatch } from "./views";

// --- Wallet connection utilities
import { initWeb3Onboard } from "./utils/onboard";
import { OnboardAPI, WalletState } from "@web3-onboard/core/dist/types";
import { JsonRpcSigner, Web3Provider } from "@ethersproject/providers";
import { Passport, Stamp, PROVIDER_ID } from "@dpopp/types";

// --- Data Storage Functions
import { CeramicDatabase, LocalStorageDatabase } from "./services/databaseStorage";
import { ProviderSpec, STAMP_PROVIDERS } from "./config/providers";

import { EthereumAuthProvider, SelfID } from "@self.id/web";

export type AllProvidersState = {
  [provider in PROVIDER_ID]: {
    providerSpec: ProviderSpec;
    stamp?: Stamp;
  };
};

const startingAllProvidersState: AllProvidersState = {
  Google: {
    providerSpec: STAMP_PROVIDERS.Google,
    stamp: undefined,
  },
  Simple: {
    providerSpec: STAMP_PROVIDERS.Simple,
    stamp: undefined,
  },
};

export interface UserContextState {
  loggedIn: boolean;
  passport: Passport | undefined;
  allProvidersState: AllProvidersState;
  getStampIndex: (stamp: Stamp) => number | undefined;
  hasStamp: (provider: string) => boolean;
  handleCreatePassport: () => void;
  handleSaveStamp: (stamp: Stamp) => void;
  handleConnection: () => void;
  handleAddStamp: (stamp: Stamp) => void;
  address: string | undefined;
  connectedWallets: WalletState[];
  signer: JsonRpcSigner | undefined;
  walletLabel: string | undefined;
  ceramicDatabase?: CeramicDatabase;
}
const startingState: UserContextState = {
  loggedIn: false,
  passport: undefined,
  allProvidersState: startingAllProvidersState,
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  getStampIndex: () => undefined,
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  hasStamp: () => false,
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  handleCreatePassport: () => {},
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  handleSaveStamp: () => {},
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  handleConnection: () => {},
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  handleAddStamp: () => {},
  address: undefined,
  connectedWallets: [],
  signer: undefined,
  walletLabel: undefined,
};

export const UserContext = React.createContext(startingState);

function App(): JSX.Element {
  const [loggedIn, setLoggedIn] = useState(false);
  const [passport, setPassport] = useState<Passport | undefined>(undefined);
  // const [localStorageDatabase, setLocalStorageDatabase] = useState<LocalStorageDatabase | undefined>(undefined);
  const [ceramicDatabase, setCeramicDatabase] = useState<CeramicDatabase>();
  const [allProvidersState, setAllProviderState] = useState(startingAllProvidersState);

  // Use onboard to control the current provider/wallets
  const [{ wallet }, connect, disconnect] = useConnectWallet();
  const connectedWallets = useWallets();
  const [web3Onboard, setWeb3Onboard] = useState<OnboardAPI | undefined>();
  const [walletLabel, setWalletLabel] = useState<string | undefined>();
  const [address, setAddress] = useState<string>();
  const [signer, setSigner] = useState<JsonRpcSigner | undefined>();

  // Init onboard to enable hooks
  useEffect((): void => {
    setWeb3Onboard(initWeb3Onboard);
  }, []);

  // Update on wallet connect
  useEffect((): void => {
    // no connection
    if (!connectedWallets.length) {
      setWalletLabel(undefined);
      setAddress(undefined);
      setSigner(undefined);
    } else {
      // record connected wallet details
      setWalletLabel(wallet?.label);
      setAddress(wallet?.accounts[0].address);
      // get the signer from an ethers wrapped Web3Provider
      setSigner(new Web3Provider(connectedWallets[0]?.provider).getSigner());
      // flaten array for storage
      const connectedWalletsLabelArray = connectedWallets.map(({ label }) => label);
      // store in localstorage
      window.localStorage.setItem("connectedWallets", JSON.stringify(connectedWalletsLabelArray));

      if (wallet && address) {
        // Load localStorage Passport data
        // const localStorageInstance = new LocalStorageDatabase(address);
        // setLocalStorageDatabase(localStorageInstance);
        // const loadedPassport = localStorageInstance?.getPassport(localStorageInstance.passportKey);
        // setPassport(loadedPassport);

        const ethereumProvider = wallet.provider;
        // what happens if user rejects?
        SelfID.authenticate({
          authProvider: new EthereumAuthProvider(ethereumProvider, address),
          ceramic: "testnet-clay",
          // Make sure the `ceramic` and `connectNetwork` parameter connect to the same network
          connectNetwork: "testnet-clay",
        }).then((authedSelfId) => {
          const ceramicDatabaseInstance = new CeramicDatabase(authedSelfId);
          setCeramicDatabase(ceramicDatabaseInstance);
          ceramicDatabaseInstance.getPassport("not a did").then((pass) => {
            setPassport(pass);
          });
        });
      }
    }
  }, [connectedWallets, wallet]);

  // Connect wallet on reload
  useEffect((): void => {
    // retrieve localstorage state
    const previouslyConnectedWallets = JSON.parse(window.localStorage.getItem("connectedWallets") || "[]") as string[];
    if (previouslyConnectedWallets?.length) {
      /* eslint-disable no-inner-declarations */
      async function setWalletFromLocalStorage(): Promise<void> {
        void (await connect({
          autoSelect: {
            label: previouslyConnectedWallets[0],
            disableModals: true,
          },
        }));
      }
      // restore from localstorage
      setWalletFromLocalStorage().catch((e): void => {
        throw e;
      });
    }
  }, [web3Onboard, connect]);

  // Toggle connect/disconnect
  // clear context passport on disconnect
  const handleConnection = (): void => {
    if (!address) {
      connect({})
        .then(() => {
          setLoggedIn(true);
        })
        .catch((e) => {
          throw e;
        });
    } else {
      disconnect({
        label: walletLabel || "",
      })
        .then(() => {
          window.localStorage.setItem("connectedWallets", "[]");
          setPassport(undefined);
          setLoggedIn(false);
        })
        .catch((e) => {
          throw e;
        });
    }
  };

  // hydrate allProvidersState
  useEffect(() => {
    passport?.stamps.forEach((stamp: Stamp) => {
      const { provider } = stamp;
      const providerState = allProvidersState[provider];
      const newProviderState = {
        providerSpec: providerState.providerSpec,
        stamp,
      };
      setAllProviderState((prevState) => ({ ...prevState, [provider]: newProviderState }));
    });
    // TODO remove providerstate on stamp removal
  }, [passport]);

  const handleCreatePassport = (): void => {
    // if (localStorageDatabase) {
    //   const passportDid = localStorageDatabase.createPassport();
    //   const getPassport = localStorageDatabase.getPassport(passportDid);
    //   setPassport(getPassport);
    // }
    async function createCeramicPassport() {
      if (ceramicDatabase) {
        await ceramicDatabase.createPassport();
      }
    }
    async function loadCeramicPassport() {
      if (ceramicDatabase) {
        const getPassport = await ceramicDatabase.getPassport("not a did");
        setPassport(getPassport);
      }
    }
    createCeramicPassport().then(loadCeramicPassport);
  };

  const handleAddStamp = (stamp: Stamp): void => {
    // if (localStorageDatabase) {
    //   localStorageDatabase.addStamp(localStorageDatabase.passportKey, stamp);
    // }
    async function addStampCeramic() {
      if (ceramicDatabase) {
        await ceramicDatabase.addStamp(stamp);
      }
    }
    async function loadCeramicPassport() {
      if (ceramicDatabase) {
        const getPassport = await ceramicDatabase.getPassport("not a did");
        setPassport(getPassport);
      }
    }
    addStampCeramic().then(loadCeramicPassport);
  };

  const handleSaveStamp = (stamp: Stamp): void => {
    if (passport) {
      // check if there is already a stamp recorded for this provider
      const stampIndex = getStampIndex(stamp);
      // place the new stamp into the stamps array
      if (stampIndex !== undefined && stampIndex !== -1) {
        passport.stamps[stampIndex] = stamp;
      } else {
        passport.stamps.push(stamp);
      }
      // propagate the new passport state
      setPassport({ ...passport });
    }
  };

  const getStampIndex = (stamp: Stamp): number | undefined => {
    // check if there is already a stamp recorded for this provider
    return passport?.stamps.findIndex((_stamp) => _stamp.provider === stamp.provider);
  };

  const hasStamp = (provider: string): boolean => {
    // check if a stamp exists for a given provider
    return !!passport?.stamps && getStampIndex({ provider } as unknown as Stamp) !== -1;
  };

  const stateMemo = useMemo(
    () => ({
      loggedIn,
      address,
      passport,
      allProvidersState,
      handleCreatePassport,
      handleSaveStamp,
      handleConnection,
      getStampIndex,
      hasStamp,
      handleAddStamp,
      connectedWallets,
      signer,
      walletLabel,
      ceramicDatabase,
    }),
    [loggedIn, address, passport, signer, connectedWallets, allProvidersState, ceramicDatabase]
  );

  return (
    <div>
      <UserContext.Provider value={stateMemo}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={connectedWallets.length > 0 ? <Navigate replace to="/dashboard" /> : <Home />} />
            <Route
              path="dashboard"
              element={connectedWallets.length > 0 ? <Dashboard /> : <Navigate replace to="/" />}
            />
            <Route path="*" element={<NoMatch />} />
          </Route>
        </Routes>
      </UserContext.Provider>
    </div>
  );
}

export default App;
