# @eazip/example-react

Demo app for [`@eazip/react`](../../packages/react): an asset grid with selection and a host-owned
"Download as ZIP" button, plus controls for the tray's placement, theme, accent, and locale.

## Run

```bash
npm install
npm run dev -w @eazip/example-react
# open http://localhost:5174
```

## Cloud strategy

The local strategy works out of the box. To try the cloud strategy (Eazip Public Sessions),
copy `.env.example` to `.env` and set `VITE_EAZIP_PUBLIC_KEY`. Note that the Eazip API fetches
source files by URL, so only publicly reachable URLs can be zipped in cloud mode — the
generated in-memory files in this demo are local-only.
