import { defineJsonSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import axios from "axios";

type RuntimeConfig = {
  spotify: {
    client_id: string;
    client_secret: string;
    refresh_token: string;
    playlist: string;
  };
};

const config = defineJsonSecret<RuntimeConfig>("SPOTIFY_CONFIG");

const formatRegex =
  /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]{2,})(\S*)/g;

type TelegramUpdate = {
  message?: {
    text?: string;
  };
};

const handleUpdate = async (body: TelegramUpdate) => {
  if (body.message?.text) {
    await handleTrackMessage(body.message.text);
  }
};

const handleTrackMessage = async (message: string) => {
  const trackUris = await getTrackUris(message);

  console.log({ trackUris });

  if (trackUris.length > 0) {
    // Always get the fresh access token for each request (ugly af but who cares)
    const accessToken = await getAccessToken();
    await deleteIfAlreadyExists(trackUris, accessToken);
    await addToPlaylist(trackUris, accessToken);
  }
};

const getTrackUris = async (message: string): Promise<string[]> => {
  const oldFormatUris = [...message.matchAll(formatRegex)].map(
    (match) => `spotify:track:${match[1]}`,
  );

  // Filter out duplicate values
  return oldFormatUris.filter(
    (value, index, array) => array.indexOf(value) === index,
  );
};

const getAccessToken = async (): Promise<string> => {
  const { client_id, client_secret, refresh_token } = config.value().spotify;
  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    {
      grant_type: "refresh_token",
      refresh_token,
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          client_id + ":" + client_secret,
        ).toString("base64")}`,
      },
    },
  );
  return response.data.access_token;
};

const deleteIfAlreadyExists = async (
  trackUris: string[],
  accessToken: string,
): Promise<void> => {
  return await axios.delete(
    `https://api.spotify.com/v1/playlists/${config.value().spotify.playlist}/tracks`,
    {
      data: {
        tracks: trackUris.map((uri) => {
          return { uri };
        }),
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
};

const addToPlaylist = async (
  trackUris: string[],
  accessToken: string,
): Promise<void> => {
  await axios.post(
    `https://api.spotify.com/v1/playlists/${config.value().spotify.playlist}/tracks`,
    {
      uris: trackUris,
      position: 0,
    },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
};

export const bot = onRequest(
  {
    region: "europe-west6",
    secrets: [config],
  },
  async (req, res) => {
    try {
      console.log(req.body);
      await handleUpdate(req.body);
    } catch (err) {
      console.error(err);
    } finally {
      res.sendStatus(200);
    }
  },
);
