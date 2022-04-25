import { DID, Passport, Stamp, VerifiableCredential } from "@dpopp/types";
import { DataStorageBase } from "../types";
import type { CeramicApi } from "@ceramicnetwork/common";

// -- Ceramic and Glazed
import { SelfID } from "@self.id/web";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { DIDDataStore } from "@glazed/did-datastore";
import { TileLoader } from "@glazed/tile-loader";
import { DataModel } from "@glazed/datamodel";
import publishedModel from "../../../schemas/scripts/publish-model.json";

export class LocalStorageDatabase implements DataStorageBase {
  passportKey: string;

  constructor(address: string) {
    const _passportKey = `dpopp::${address}`;
    this.passportKey = _passportKey;
  }

  createPassport(): DID {
    const newPassport = {
      issuanceDate: new Date(),
      expiryDate: new Date(),
      stamps: [],
    };
    window.localStorage.setItem(this.passportKey, JSON.stringify(newPassport));
    return this.passportKey;
  }
  getPassport(did: DID): Passport | undefined {
    const stringifiedPassport = window.localStorage.getItem(did);
    if (stringifiedPassport === null) return undefined;
    const parsedPassport = JSON.parse(stringifiedPassport) as {
      issuanceDate: string;
      expiryDate: string;
      stamps: Stamp[];
    };
    const passport = {
      issuanceDate: new Date(parsedPassport.issuanceDate),
      expiryDate: new Date(parsedPassport.expiryDate),
      stamps: parsedPassport.stamps,
    };
    return passport ?? undefined;
  }
  addStamp(did: DID, stamp: Stamp): void {
    const passport = this.getPassport(did);
    if (passport) {
      passport.stamps.push(stamp);
      window.localStorage.setItem(did, JSON.stringify(passport));
    } else {
      const newPassport = {
        issuanceDate: new Date(),
        expiryDate: new Date(),
        stamps: [stamp],
      };
      window.localStorage.setItem(did, JSON.stringify(newPassport));
    }
  }
}

type CeramicStamp = {
  provider: string;
  credential: string;
};
type CeramicPassport = {
  issuanceDate: Date;
  expiryDate: Date;
  stamps: CeramicStamp[];
};

export type ModelTypes = {
  schemas: {
    // Passport: Passport;
    Passport: CeramicPassport;
    VerifiableCredential: VerifiableCredential;
  };
  definitions: {
    Passport: "Passport";
    VerifiableCredential: "VerifiableCredential";
  };
  tiles: {};
};

export class CeramicDatabase {
  // implements DataStorageBase {
  loader: TileLoader;
  ceramicClient: CeramicApi;
  model: DataModel<ModelTypes>;
  store: DIDDataStore<ModelTypes>;

  constructor(selfId: SelfID) {
    const did = selfId.did;
    // Create the Ceramic instance and inject the DID
    const ceramic = new CeramicClient("http://localhost:7007");
    // @ts-ignore
    ceramic.setDID(did);
    console.log("Current ceramic did: ", ceramic.did?.id);

    // Create the loader, model and store
    const loader = new TileLoader({ ceramic });
    const model = new DataModel({ ceramic, aliases: publishedModel });
    const store = new DIDDataStore({ loader, ceramic, model });

    this.loader = loader;
    this.ceramicClient = ceramic;
    this.model = model;
    this.store = store;
  }

  // todo make base class async
  async createPassport(): Promise<DID> {
    const date = new Date();
    const newPassport = {
      issuanceDate: date.toISOString(),
      expiryDate: date.toISOString(),
      stamps: [],
    };
    const passportTile = await this.model.createTile("Passport", newPassport);
    console.log("Created passport tile: ", JSON.stringify(passportTile.id.toUrl()));
    const stream = await this.store.set("Passport", { ...newPassport });
    console.log("Set Passport: ", JSON.stringify(stream.toUrl()));
    return stream.toUrl();
  }
  async getPassport(did: DID): Promise<Passport | undefined> {
    try {
      const passport = await this.store.get("Passport");
      console.log("Loaded passport: ", JSON.stringify(passport));
      // `stamps` is stored as ceramic URLs - must load actual VC data from URL
      const stampsToLoad =
        passport?.stamps.map(async (_stamp) => {
          const { provider, credential } = _stamp;
          const loadedCred = await this.loader.load(credential);
          return {
            provider,
            credential: loadedCred.content,
          } as Stamp;
        }) ?? [];
      const loadedStamps = await Promise.all(stampsToLoad);

      return passport
        ? { issuanceDate: passport.issuanceDate, expiryDate: passport.expiryDate, stamps: loadedStamps }
        : undefined;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
  async addStamp(stamp: Stamp): Promise<void> {
    console.log("add stamp ceramic");
    const passport = await this.store.get("Passport");
    if (passport) {
      // Must save stamps as ceramic URLs, NOT VCs - see Passports.json in schemas/
      // otherwise get error: 'Internal Server Error': {"error":"Validation Error: data/stamps/0/credential must be string"}
      const newStampTile = await this.model.createTile("VerifiableCredential", stamp.credential);
      console.log("new stamp: ", JSON.stringify(newStampTile.content), "; id: ", JSON.stringify(newStampTile.id));

      const newStamps = passport?.stamps.concat({ provider: stamp.provider, credential: newStampTile.id.toUrl() });
      const streamID = await this.store.merge("Passport", { stamps: newStamps });
      console.log("Stream ID: ", streamID.toUrl());
    } else {
      console.log("no passport founnd");
    }
  }

  async deletePassport(): Promise<void> {
    console.log("remove passport");
    await this.store.remove("Passport");
    const passport = await this.store.get("Passport");
    console.log("Cleared passport: ", JSON.stringify(passport));
  }
}
