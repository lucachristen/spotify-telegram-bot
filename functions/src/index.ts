import * as functions from "firebase-functions";
import axios from "axios";

const {client_id, client_secret, refresh_token, playlist} =
  functions.config().spotify;
const oldFormatRegex =
  /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]{2,})(\S*)/g;
const newFormatRegex =
  /https:\/\/spotify\.link\/([a-zA-Z0-9]{2,})(\S*)/g;

const handleUpdate = async (body: any) => {
  if (body?.message?.text) {
    await handleTrackMessage(body.message.text);
  }
};

const handleTrackMessage = async (message: string) => {
  const trackUris = await getTrackUris(message);

  console.log({trackUris});

  if (trackUris.length > 0) {
    // Always get the fresh access token for each request (ugly af but who cares)
    const accessToken = await getAccessToken();
    await deleteIfAlreadyExists(trackUris, accessToken);
    await addToPlaylist(trackUris, accessToken);
  }
};

const getTrackUris = async (message: string): Promise<string[]> => {
  const oldFormatUris = [...message.matchAll(oldFormatRegex)].map(
      (match) => `spotify:track:${match[1]}`
  );

  const trackUriPromises = [...message.matchAll(newFormatRegex)].map(
      async (match) => {
        const url = `https://spotify.link/${match[1]}`;
        const response = await axios.get(url);
        const uriMatches = [...(response.data?.matchAll(oldFormatRegex) ?? [])];
        return uriMatches?.[0]?.[1] ?
            `spotify:track:${uriMatches[0][1]}` :
            undefined;
      }
  );

  const newFormatUris = (await Promise.all(trackUriPromises))
      .filter(Boolean)
      .map((value) => value as string);

  // Filter out duplicate values
  return [...oldFormatUris, ...newFormatUris].filter(
      (value, index, array) => array.indexOf(value) === index
  );
};

const getAccessToken = async (): Promise<string> => {
  const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      {
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(
              client_id + ":" + client_secret
          ).toString("base64")}`,
        },
      }
  );
  return response.data.access_token;
};

const deleteIfAlreadyExists = async (trackUris: string[], accessToken: string): Promise<void> => {
  return await axios.delete(
      `https://api.spotify.com/v1/playlists/${playlist}/tracks`,
      {
        data: {
          tracks: trackUris.map((uri) => {
            return {uri};
          }),
        },
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
      }
  );
};

const addToPlaylist = async (trackUris: string[], accessToken: string): Promise<void> => {
  await axios.post(
      `https://api.spotify.com/v1/playlists/${playlist}/tracks`,
      {
        uris: trackUris,
        position: 0,
      },
      {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
      });
};

exports.bot = functions
    .region("europe-west6")
    .https.onRequest(async (req, res) => {
      try {
        console.log(req.body);
        await handleUpdate(req.body);
      } catch (err) {
        console.error(err);
      } finally {
        res.sendStatus(200);
      }
    });
