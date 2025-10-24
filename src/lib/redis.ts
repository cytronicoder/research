import { createClient } from "redis";

const redisUrl =
  process.env.RESEARCH_REDIS_URL ||
  process.env.REDIS_URL ||
  "redis://localhost:6379";

let client: ReturnType<typeof createClient> | null = null;
let isConnecting = false;

export async function getRedisClient() {
  if (client?.isOpen) {
    return client;
  }

  if (isConnecting && client) {
    let retries = 0;
    while (isConnecting && retries < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    if (client?.isOpen) {
      return client;
    }
  }

  isConnecting = true;

  try {
    if (!client) {
      client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error("Redis: Too many reconnection attempts");
              return new Error("Too many reconnection attempts");
            }
            return Math.min(retries * 50, 3000);
          },
        },
      });

      client.on("error", (err) => {
        console.error("Redis Client Error:", err);
      });

      client.on("reconnecting", () => {
        console.log("Redis: Reconnecting...");
      });

      client.on("ready", () => {
        console.log("Redis: Connected successfully");
      });
    }

    if (!client.isOpen) {
      await client.connect();
    }

    return client;
  } catch (error) {
    console.error("Redis: Failed to connect:", error);
    client = null;
    throw error;
  } finally {
    isConnecting = false;
  }
}

export async function closeRedisClient() {
  if (client?.isOpen) {
    await client.quit();
    client = null;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const result = await redis.ping();
    return result === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}
