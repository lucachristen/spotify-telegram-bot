# Spotify Telegram Bot

A webhook deployed as a Firebase Function that adds Spotify track links from a Telegram group chat to a Spotify playlist.

The hook currently recognizes links in this format:

```
https://open.spotify.com/track/<track-id>
```

When a track is received, any existing occurrence in the playlist is removed before the track is inserted to prevent duplicates.

The bot abused the fact that refresh tokens did not really expire in the past. This worked for a couple years, but Spotify has recently made some changes to this and now refresh tokens are only valid for 180 days. The bot does not handle this well at the moment. Maybe I'll fix this, maybe I won't.

## Prerequisites

- Node.js 24
- npm 11
- A Firebase project with Cloud Functions enabled
- A Spotify application
- A Spotify playlist
- A Telegram bot

The Firebase CLI is installed as a development dependency.

## Install

```bash
nvm use
npm --prefix functions ci
```

Authenticate with Firebase and select a project:

```bash
npm --prefix functions exec firebase -- login
npm --prefix functions exec firebase -- use --add
```

This creates a local `.firebaserc`.

## Spotify configuration

The function expects one JSON secret named `SPOTIFY_CONFIG` with this structure:

```json
{
  "spotify": {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "refresh_token": "your-refresh-token",
    "playlist": "your-playlist-id"
  }
}
```

You can apply the config from a file like this:

```bash
npm --prefix functions exec firebase -- functions:secrets:set SPOTIFY_CONFIG --format=json --data-file=/tmp/spotify-config.json
```

Create the refresh token using Spotify's [Authorization Code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow) with the `playlist-modify-public` and `playlist-modify-private` scopes.

## Checks

```bash
npm --prefix functions run lint
npm --prefix functions run build
```

Firebase runs both checks automatically before deployment.

## Deploy

```bash
npm --prefix functions run deploy
```

The stable function URL has this form:

```text
https://europe-west6-<firebase-project-id>.cloudfunctions.net/bot
```

## Configure the Telegram webhook

Set up a Telegram bot, get its token, and register the deployed function URL:

```bash
curl -sS -X POST \
  "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  --data-urlencode 'url=https://europe-west6-<firebase-project-id>.cloudfunctions.net/bot'
```

Verify the webhook:

```bash
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```
