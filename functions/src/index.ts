import * as functions from "firebase-functions";
import axios from "axios";

const {client_id, client_secret, refresh_token, playlist} =
  functions.config().spotify;
// const playlistUrl = `https://open.spotify.com/playlist/${playlist}`;
const trackRegex =
    /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]{2,})(\S*)/g;


const handleUpdate = async (body: any) => {
  if (body?.message?.text) {
    await handleTrackMessage(body.message.text);
  }
};

const handleTrackMessage = async (message: string) => {
  const trackUris = [...message.matchAll(trackRegex)]
      .map((match) => `spotify:track:${match[1]}`);

  if (trackUris.length > 0) {
    try {
      // Always get the fresh access token for each request (ugly af but who cares)
      const tokenResponse = await axios.post("https://accounts.spotify.com/api/token",
          {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Basic ${Buffer.from(client_id+":"+client_secret).toString("base64")}`,
            },
          }
      );
      await axios.delete(
          `https://api.spotify.com/v1/playlists/${playlist}/tracks`,
          {
            data: {
              tracks: trackUris.map((uri) => {
                return {uri};
              }),
            },
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${tokenResponse.data.access_token}`,
            },
          });
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
              "Authorization": `Bearer ${tokenResponse.data.access_token}`,
            },
          });
    } catch (err) {
      console.error(err);
    }
  }
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
