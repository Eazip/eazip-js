# Changelog

## @eazip/core 0.2.0 and @eazip/react 0.1.0

First stable pre-1.0 releases.

### Changed from the beta channel

- `@eazip/core` now keeps its top-level runtime API focused on ZIP job
  functions and error classes. Low-level filename helpers remain available
  from `@eazip/core/local`; `SessionsClient` and Cloud constants remain under
  `@eazip/core/cloud`; input, download, and abort helpers remain under
  `@eazip/core/shared`.
- `@eazip/react` now depends on the stable `@eazip/core` line.

### Upgrade from beta.3

Install the stable packages normally:

```sh
npm install @eazip/core@^0.2.0
npm install @eazip/react@^0.1.0
```

If you imported a low-level helper from `@eazip/core`, move it to the matching
`/local`, `/cloud`, or `/shared` entry point described above. Main
`createZip`, `startZip`, `resumeZip`, React hook, tray, types, and error-class
imports are unchanged.
