import axios from "axios";
import moxios from "moxios";

jest.mock("axios");

describe("BrightID Verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should respond with brightid user information", () => {
    // Given we query BrightID with an appUserId
    moxios.stubRequest("https://app.brightid.org/node/v6/verifications/dpopp/{appUserId}", {
      status: 200,
    });
    // THEN we receive user information
    // THEN we verify collaboration w/ our passport stamp
  });
});
