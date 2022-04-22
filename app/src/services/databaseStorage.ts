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

export type ModelTypes = {
  schemas: {
    Passport: Passport;
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
      return passport ?? undefined;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
  async addStamp(stamp: Stamp): Promise<void> {
    // const passport = this.getPassport(did);
    // if (passport) {
    //   passport.stamps.push(stamp);
    //   window.localStorage.setItem(did, JSON.stringify(passport));
    // } else {
    //   const newPassport = {
    //     issuanceDate: new Date(),
    //     expiryDate: new Date(),
    //     stamps: [stamp],
    //   };
    //   window.localStorage.setItem(did, JSON.stringify(newPassport));
    // }
    console.log("add stamp ceramic");
    const passport = await this.store.get("Passport");
    if (passport) {
      // TODO - save stamps as ceramic URLs, NOT VCs
      // error: 'Internal Server Error': {"error":"Validation Error: data/stamps/0/credential must be string"}

      const newStamps = passport?.stamps.concat(stamp);
      const updatedPassport = { ...passport, stamps: newStamps };
      const savedPassport = await this.model.createTile("Passport", updatedPassport);
      console.log("savedPassport: ", JSON.stringify(savedPassport.content), "; id: ", JSON.stringify(savedPassport.id));
      const streamID = await this.store.set("Passport", { ...savedPassport.content });
      console.log("Stream ID: ", streamID.toUrl());
    } else {
      console.log("no passport founnd");
    }
  }
}
