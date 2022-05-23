import React from "react";
import { render, screen } from "@testing-library/react";

import { Card, CardProps } from "../../components/Card";

import { VerifiableCredential } from "@dpopp/types";
import { mock } from "jest-mock-extended";

let cardProps: CardProps;

describe("when the user is not verified", () => {
  beforeEach(() => {
    cardProps = {
      providerSpec: { name: "Some", description: "Some desc" },
      verifiableCredential: undefined,
      issueCredentialWidget: <div data-testid="some-widget" />,
    };
  });

  describe("when the user is verifying a stamp", () => {
    it("should show a loading indicator", () => {
      cardProps = {
        ...cardProps,
        isLoading: true,
      };

      render(<Card {...cardProps} />);

      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });
  });

  describe("when the user is not verifying a stamp", () => {
    it("should not show a loading indicator", () => {
      cardProps = {
        ...cardProps,
        isLoading: false,
      };

      render(<Card {...cardProps} />);

      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });
  });

  it("should show verification button", () => {
    render(<Card {...cardProps} />);

    expect(screen.getByTestId("some-widget")).toBeInTheDocument();
  });
});

describe("when the user is verified", () => {
  beforeEach(() => {
    cardProps = {
      providerSpec: { name: "Some", description: "Some desc" },
      verifiableCredential: mock<VerifiableCredential>(),
      issueCredentialWidget: <div data-testid="some-widget" />,
    };
  });

  it("should show verified status", () => {
    render(<Card {...cardProps} />);

    expect(screen.getByText(/[Vv]erified/)).toBeInTheDocument();
    expect(screen.queryByText("Verify Button")).not.toBeInTheDocument();
  });
});
