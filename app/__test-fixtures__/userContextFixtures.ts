import { UserContextState } from "../context/userContext";
import { mockAddress, mockWallet } from "./onboardHookValues";
import { STAMP_PROVIDERS } from "../config/providers";

const mockHandleConnection = jest.fn();
const mockCreatePassport = jest.fn();
const mockHasStamp = jest.fn();
const getStampIndex = jest.fn();
const handleSaveStamp = jest.fn();
const handleAddStamp = jest.fn();
export const mockUserContext: UserContextState = {
  loggedIn: true,
  passport: undefined,
  isLoadingPassport: false,
  allProvidersState: {
    Google: {
      providerSpec: STAMP_PROVIDERS.Google,
      stamp: undefined,
    },
    Simple: {
      providerSpec: STAMP_PROVIDERS.Simple,
      stamp: undefined,
    },
    Ens: {
      providerSpec: STAMP_PROVIDERS.Ens,
      stamp: undefined,
    },
  },
  handleAddStamp: handleAddStamp,
  handleCreatePassport: mockCreatePassport,
  handleConnection: mockHandleConnection,
  address: mockAddress,
  wallet: mockWallet,
  signer: undefined,
  walletLabel: mockWallet.label,
};

export const getUserContext = (initialState?: Partial<UserContextState>): UserContextState => {
  return {
    loggedIn: true,
    passport: undefined,
    isLoadingPassport: false,
    allProvidersState: {
      Google: {
        providerSpec: STAMP_PROVIDERS.Google,
        stamp: undefined,
      },
      Simple: {
        providerSpec: STAMP_PROVIDERS.Simple,
        stamp: undefined,
      },
      Ens: {
        providerSpec: STAMP_PROVIDERS.Ens,
        stamp: undefined,
      },
    },
    handleAddStamp: handleAddStamp,
    handleCreatePassport: mockCreatePassport,
    handleConnection: mockHandleConnection,
    address: mockAddress,
    wallet: mockWallet,
    signer: undefined,
    walletLabel: mockWallet.label,
    ...initialState,
  };
};

export const clearUserContextMock = (): void => {
  mockHandleConnection.mockClear();
  mockCreatePassport.mockClear();
  mockHasStamp.mockClear();
  getStampIndex.mockClear();
  handleSaveStamp.mockClear();
  handleAddStamp.mockClear();
};
