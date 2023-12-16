#!/bin/bash

# - Update src/manifest.json with the new version number
# - Run the below command
# - Then the file /manifests.json also needs to be updated with the new manifest file

yarn run dist && cp publish/org.xilinotaapp.plugins.RegisterCommandDemo.jpl ~/src/xilinota-plugins-test/plugins/org.xilinotaapp.plugins.RegisterCommandDemo/plugin.jpl && cp publish/org.xilinotaapp.plugins.RegisterCommandDemo.json ~/src/xilinota-plugins-test/plugins/org.xilinotaapp.plugins.RegisterCommandDemo/plugin.json