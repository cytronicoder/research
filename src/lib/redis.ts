import { createClient } from "redis";

const redisUrl = process.env.RESEARCH_REDIS_URL || "redis://localhost:6379";

// Create a singleton Redis client
let client: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!client) {
    client = createClient({
      url: redisUrl,
    });

    client.on("error", (err) => {
      console.error("Redis Client Error", err);
    });

    await client.connect();
  }

  return client;
}
