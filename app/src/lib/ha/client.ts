import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
  type HassEntities,
} from "home-assistant-js-websocket";

declare global {
  var __haConnectionPromise: Promise<Connection> | undefined;
  var __haLatestEntities: HassEntities | undefined;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and set it.`,
    );
  }
  return value;
}

/**
 * Long-lived server-side connection to Home Assistant. Reused across requests
 * (module state survives between invocations in the long-running Next.js
 * server process) so we don't re-authenticate on every API call.
 */
export function getHaConnection(): Promise<Connection> {
  if (!global.__haConnectionPromise) {
    // home-assistant-js-websocket builds the websocket URL by string
    // concatenation (`${hassUrl}/api/websocket`) without normalizing a
    // trailing slash, which produces an invalid `//api/websocket` path that
    // Home Assistant rejects. Strip it here so HA_URL with or without a
    // trailing slash both work.
    const hassUrl = requiredEnv("HA_URL").replace(/\/+$/, "");
    const accessToken = requiredEnv("HA_TOKEN");

    const auth = createLongLivedTokenAuth(hassUrl, accessToken);
    global.__haConnectionPromise = createConnection({ auth }).then((conn) => {
      // Keep a rolling snapshot of entity state so REST callers (getEntities)
      // don't need to open their own subscription per request.
      subscribeEntities(conn, (entities) => {
        global.__haLatestEntities = entities;
      });

      conn.addEventListener("disconnected", () => {
        console.warn("[ha] connection lost, will auto-reconnect");
      });
      conn.addEventListener("reconnect-error", (_conn, err) => {
        console.error("[ha] reconnect failed", err);
      });

      return conn;
    });

    global.__haConnectionPromise.catch((err) => {
      console.error("[ha] failed to connect", err);
      global.__haConnectionPromise = undefined;
    });
  }

  return global.__haConnectionPromise;
}

export async function getEntities(): Promise<HassEntities> {
  await getHaConnection();
  return global.__haLatestEntities ?? {};
}

/** Base URL + token for plain REST calls (logbook, camera proxy) that don't go through the websocket connection. */
export function getHaConfig(): { hassUrl: string; accessToken: string } {
  return {
    hassUrl: requiredEnv("HA_URL").replace(/\/+$/, ""),
    accessToken: requiredEnv("HA_TOKEN"),
  };
}
