#!/bin/sh
if [ -z "$1" ]; then
  version=$(git rev-parse HEAD | cut -c1-6)
else
  version=$1
fi
echo "build for version ${version} ..."
docker build -t gcr.io/intella-169409/foo-service:$version --build-arg NPM_TOKEN=${NPM_TOKEN} .
gcloud docker -- push gcr.io/intella-169409/foo-service:$version