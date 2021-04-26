#!/bin/bash

echo What should the version be?
read VERSION
echo $VERSION

bocker build -t # name of docker container with server benawad/liredit:$VERSION and etc comands for deploy