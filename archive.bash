
#! /bin/bash

rsync -vurt --exclude '*.map' --exclude=**/.gradle/ --exclude=**/vendor/ --exclude=**/*node_module*/ --exclude=**/*cache*/ --exclude=**/dist/ --exclude=**/tmp/ --exclude=**/generated/ --exclude=**/intermediates/ --exclude=**/outputs/ . ../.OldFiles/Xilinota
