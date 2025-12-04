mkdir -p downloads-tmp
rm -rf downloads-tmp/tc
git clone -b client https://github.com/gitipedras/textcat.git downloads-tmp/tc
cp -r downloads-tmp/tc/src .
