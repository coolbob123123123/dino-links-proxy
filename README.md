# Dino Links

Dino Links is a starter browser/proxy project using the current Scramjet demo architecture and Brave Search.

## Requirements

- Node.js 20+
- pnpm
- A Brave Search API key

## Setup

1. Copy `.env.example` to `.env`
2. Put your Brave Search API key in `.env`
3. Install dependencies

```bash
pnpm install
```

4. Start it

```bash
pnpm start
```

5. Open:

```text
http://localhost:8080
```

## How it works

Search terms are sent to `/api/search`.

The server sends the request to Brave Search so the API key never reaches the browser.

Website URLs are opened through Scramjet. The Scramjet frame uses the Wisp websocket transport and libcurl transport supplied by the server.

For deployment, use HTTPS because service workers are required outside localhost.

## Important

This is a development starter. Add authentication, rate limiting, logging controls, resource limits and abuse protections before exposing a public proxy.

Scramjet is maintained by Mercury Workshop. Keep its license and attribution when redistributing the project.
