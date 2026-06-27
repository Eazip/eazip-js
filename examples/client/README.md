# Eazip Client Example

Minimal browser example for `@eazip/client`.

The default Local mode creates a ZIP from files selected on your machine and
URLs fetched by your browser. It does not require an Eazip public key. Cloud
mode uses Eazip Public Sessions and requires a Public App key.

## Run Locally

```sh
cp .env.example .env
npm install
npm run dev -- --host 0.0.0.0
```

Open the printed local or Tailscale URL in your browser.

Local mode works immediately after startup. For Cloud mode, your Public App must
allow the origin you open this example from, such as `http://localhost:5173` or
your Tailscale URL. The source URLs must also match the Public App's allowed
source hosts.

## Environment

- `VITE_EAZIP_PUBLIC_KEY`: Public App key used by the browser.
- `VITE_EAZIP_API_BASE_URL`: Eazip API base URL. Defaults to `https://api.eazip.io`.
- `VITE_EAZIP_SAMPLE_FILES_JSON`: Optional JSON array of sample `{ url, filename }` values.
