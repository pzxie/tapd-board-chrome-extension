#!/bin/sh

extension_name="TAPD_Powerful"

curl -o chrome-extension-store-master.zip -L https://gitee.com/pzxie/chrome-extension-store/repository/archive/master.zip

unzip -o chrome-extension-store-master.zip
cp -rf chrome-extension-store-master/${extension_name}/* .
rm -rf chrome-extension-store-maste*