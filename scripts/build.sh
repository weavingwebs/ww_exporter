#!/bin/bash

set -eux

CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o dist/main
