# Releasing

This repository publishes public browser SDK packages only.

## Channels

- `beta`: prerelease versions such as `0.1.0-beta.1`
- `latest`: stable versions such as `0.1.0`

Each npm release also gets a Git tag and GitHub Release:

- `client-v0.1.0-beta.1`
- `client-v0.1.0`

## One-time npm setup

Configure npm Trusted Publishing for `@eazip/client` before using the GitHub
Actions release workflow:

- Publisher: GitHub Actions
- GitHub organization/user: `Eazip`
- Repository: `eazip-js`
- Workflow filename: `publish.yml`
- Environment name: `npm-publish`
- Allowed action: `npm publish`

After a successful trusted publish, set the npm package publishing access to
require two-factor authentication and disallow classic/granular tokens.

## Beta release

1. Update `packages/client/package.json` to the next prerelease version.
2. Run `npm install --package-lock-only` to sync `package-lock.json`.
3. Merge the version bump to `main`.
4. Run the `Publish` workflow from `main` with:
   - Package: `@eazip/client`
   - npm dist-tag: `beta`

The workflow validates that `beta` is only used with `*-beta.N` versions.

## Stable release

1. Update `packages/client/package.json` to a stable version.
2. Run `npm install --package-lock-only` to sync `package-lock.json`.
3. Merge the version bump to `main`.
4. Run the `Publish` workflow from `main` with:
   - Package: `@eazip/client`
   - npm dist-tag: `latest`

The workflow rejects prerelease versions published as `latest`.

## Recovery

If npm publish succeeds but GitHub Release creation fails, create the missing
tag and release manually for the same commit. Do not republish the same npm
version; npm versions are immutable.

If a bad version is published, prefer:

```sh
npm deprecate @eazip/client@VERSION "Use VERSION_OR_NEWER instead"
```

Then publish a fixed patch or beta version.
