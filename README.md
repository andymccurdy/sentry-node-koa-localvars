## Repro

This is a minimal Node/TypeScript project to demonstrate Sentry.io's `includeLocalVariables` across sync/async boundaries.

### Run

Define environment variables used when uploading sourcemaps and sending errors to Sentry

```
SENTRY_DSN="<your-sentry-dsn>"
SENTRY_ORG="<name-of-your-sentry-org>"
SENTRY_PROJECT="<name-of-your-sentry-project>"
SENTRY_AUTH_TOKEN="<auth-token>"
```

Install dependencies

`npm install`

Compile TypeScript, generate and upload Sentry sourcemaps and start the server

`npm run start-app`

Make a request to the `/error/sync` endpoint (requires curl)

`npm run client-sync`

Make a request to the `/error/async` endpoint (requires curl)

`npm run client-async`
