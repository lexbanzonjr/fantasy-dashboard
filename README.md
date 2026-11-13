# Fantasy Dashboard

A personal dashboard for a CBS fantasy football league: your matchup, your roster, standings, and every team's roster. It runs locally in Docker, stores its data in SQLite, and isn't meant to be deployed publicly.

## Setup

1. Copy `.env.example` to `.env`. Use `.env.local` instead for `npm run dev`.
2. Set `AUTH_USERNAME` and `AUTH_PASSWORD`. This is the one login for the app.
3. Generate `CBS_TOKEN_KEY`. The app uses it to encrypt your CBS token in the database:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   If you change this key later, the saved token can't be read any more, and you'll need to reconnect CBS.
4. Set `NEXT_PUBLIC_SITE_URL` to the address you open the app at (default `http://localhost:6972`). The bookmarklet sends you there.

## Run with Docker

```sh
docker compose up -d --build
```

Open http://localhost:6972 and sign in. The database is `data/fantasy-dashboard.sqlite`; to back it up, copy the `data/` folder. To stop the app, run `docker compose down`.

By default the port is open to your LAN, behind the login. To limit it to this machine, change the port to `127.0.0.1:6972:6972` in `docker-compose.yml`.

## Connect CBS

CBS has no sign-in for third-party apps, so the dashboard uses the access token your league page already has:

1. In the app, go to **Settings** and drag the **Connect to Fantasy Dashboard** link to your bookmarks bar.
2. Open your CBS league page (`https://<league>.football.cbssports.com`) while signed in to CBS.
3. Click the bookmark. Settings opens with the league and token filled in. Click **Save connection**.

The token travels in the URL fragment, so no server logs it, and it's stored encrypted. When CBS stops accepting it, the app shows **Reconnect CBS**; run the bookmark again.

## Development

```sh
npm install
npm run dev     # http://localhost:3000; set NEXT_PUBLIC_SITE_URL to match
npm test
npm run lint
```

### CBS API fixtures

The CBS fantasy API has no public docs. `scripts/cbs-probe.mts` calls each endpoint the app uses and saves the responses, with personal details scrubbed, to `src/lib/cbs/__fixtures__/`. The schemas and tests are built from those responses. To refresh them, set `CBS_LEAGUE_ID` and `CBS_TOKEN` in `.env.local` and run:

```sh
node --env-file=.env.local scripts/cbs-probe.mts
```
