#!/usr/bin/env bash

# === preliminary installs ===
yarn global add lerna
cd dpopp
lerna bootstrap # TODO - figure out how to speed this up if run in docker

# === start up ceramic in background ===
# TODO - how to kill this ceramic process at the end?
echo "Starting up Ceramic..."
yarn workspace @dpopp/schemas ceramic

# TODO alternatively figure out how to save the PID and kill at the end
# CERAMIC_PID = $(ceramic daemon)
# echo $CERAMIC_PID