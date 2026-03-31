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

- `catalog-backend-module-inhouse`
  Inhouse catalog backend module
  Includes entity extensions for domain/system/location handling

See each package `README.md` for ownership boundaries and edit guidance.
