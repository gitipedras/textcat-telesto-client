## Textcat Telesto
A textcat client made with Javascript and Electron.
Named after the Saturn moon '[Telesto](https://en.wikipedia.org/wiki/Telesto_(moon))'

[![Build Electron App](https://github.com/gitipedras/textcat-telesto-client/actions/workflows/main.yml/badge.svg)](https://github.com/gitipedras/textcat-telesto-client/actions/workflows/main.yml)

### Building from source
Install electron (for running from source)<br>
`npm install electron --save-dev`<br>

To build into binaries, use:<br>
`npm install electron-builder --save-dev`<br>

**Linux Electron Error**<br>
If you get the error:<br>
```
The SUID sandbox helper binary was found, but is not configured correctly. Rather than run without sandboxing I'm aborting now. You need to make sure that /home/superllamma/Projects/textcat/textcat-telesto/node_modules/electron/dist/chrome-sandbox is owned by root and has mode 4755.
```
<br>
you need to run:<br>
`npm run patch` (for run.sh)<br>
`./linux-patch.sh` (for running the built binary in dist/linux-unpacked)<br>

### Versioning System
`MAJOR.MINOR.PATCH`

Examples:
```
1.0.0
1.2.9
6.7.7
1.8.0-alpha1
6.2.1-beta1
6.2.1-beta2
6.2.1-beta3
10.2.1-SNAPSHOT
```

Read [semver.og](https://semver.org/) to learn more...
