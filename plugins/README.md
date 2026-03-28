# The Plugins Folder

This is where your own plugins and their associated modules live, each in a
separate folder of its own.

If you want to create a new plugin here, go to your project root directory, run
the command `yarn new`, and follow the on-screen instructions.

You can also check out existing plugins on [the plugin marketplace](https://backstage.io/plugins)!

## Team-Owned Packages

This repository keeps team customizations under `plugins/` so they stay clearly
separated from the stock Backstage app wiring in `packages/backend`.

Current Inhouse CMDB package layout:

- `inhouse-cmdb-backend`
  HTTP backend plugin for `/api/inhouse-cmdb/*`
- `inhouse-cmdb-backend-module-catalog`
  Catalog source module that registers the entity provider
- `inhouse-cmdb-backend-module-scaffolder`
  Scaffolder module that registers `inhouse-cmdb:append`
- `inhouse-cmdb-node`
  Shared node-library for repositories, provider logic, parsing, and tests

See each package `README.md` for ownership boundaries and edit guidance.
