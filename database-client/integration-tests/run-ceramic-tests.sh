#!/usr/bin/env bash

# === preliminary installs ===
yarn global add lerna
cd dpopp
lerna bootstrap # TODO - figure out how to speed this up if run in docker

# === start up ceramic in background ===
until $(curl --output /dev/null --silent --head --fail ceramic-daemon:7007/api/v0/node/healthcheck); do
    printf '... waiting for Ceramic daemon ...'
    sleep 5
done

# TODO - not needed once we publish + persist our schemas to ceramic testnet
# === create & publish model to ceramic ===
export SEED="06be7d9853096fca06d6da9268a8a66ecaab2a7249ccd63c70fead97aafefa02" # TEST SEED, DO NOT USE IN PROD
export CERAMIC_CLIENT_URL="http://ceramic-daemon:7007"
yarn workspace @dpopp/schemas create-model
yarn workspace @dpopp/schemas publish-model

# === run ceramic integration tests ===
yarn test:ceramic-integration --runInBand