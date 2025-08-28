# Kikoeru (kikoeru-quasar)

A self-hosted web media player for listening to your DLsite voice works.

[![unstable build status](https://github.com/umonaca/kikoeru-quasar/actions/workflows/build-and-publish.yml/badge.svg)](https://github.com/umonaca/kikoeru-quasar/actions)

## 相关项目

- 后端：[kikoeru-express](https://github.com/XunJiJiang/kikoeru-express)
- 桌面应用：[kikoeru-tauri](https://github.com/XunJiJiang/kikoeru-tauri)

## Install the dependencies

> 建议 Node 版本 12 至 14。

```bash
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Build the app for production

If you prefer SPA:

```bash
npx quasar build
```

If you prefer PWA:

```bash
npx quasar build -m pwa
```

### Customize the configuration

See [Configuring quasar.conf.js](https://quasar.dev/quasar-cli/quasar-conf-js).
