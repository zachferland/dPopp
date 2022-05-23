// ----- Types
import type { Provider, ProviderOptions } from "../types";
import type { RequestPayload, VerifiedPayload } from "@dpopp/types";

// --- Api Library
import axios from "axios";

type Verification = {
  unique: boolean;
  app: string;
  appUserId: string;
  context: string;
  contextIds: string[];
};

// BrightId API call response
type Response = {
  data?: Verification[];
};

// The app name registered with BrightId for the verification end point
const appName = "Gitcoin";

// Request a verifiable credential from brightid
export class BrightIdProvider implements Provider {
  // Give the provider a type so that we can select it with a payload
  type = "Brightid";
  // Options can be set here and/or via the constructor
  _options = {};

  // construct the provider instance with supplied options
  constructor(options: ProviderOptions = {}) {
    this._options = { ...this._options, ...options };
  }

  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    console.log("started brightid");
    try {
      const { address } = payload;
      const did = payload.proofs?.did;

      console.log("before response ", did);
      const responseData = await verifyBrightId(did);
      console.log("RESPONSE ", responseData);
      const formattedData = responseData?.data[0];

      const valid: boolean =
        formattedData.app === appName && formattedData.appUserId === did && formattedData.verificationHash.length > 5;

      return {
        valid,
        record: valid
          ? {
              app: formattedData.app,
              appUserId: formattedData.appUserId,
            }
          : undefined,
      };
    } catch (e) {
      return { valid: false };
    }
  }
}

function verifyBrightId(did: string): Promise<Response> {
  try {
    const response: Response = axios.get(`https://app.brightid.org/node/v5/verifications/${appName}/${did}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response;
  } catch (e) {
    console.log(JSON.stringify(e));
  }
}
