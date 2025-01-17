node -e "require('fs').unlinkSync('tu-stream-solid.exe')"
node --experimental-sea-config sea-config.json
node -e "require('fs').copyFileSync(process.execPath, 'tu-stream-solid.exe')"
call "C:\SSDPrograms\Visual Studio 2022\Common7\Tools\VsDevCmd.bat"
signtool remove /s tu-stream-solid.exe
pnpx postject tu-stream-solid.exe NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
