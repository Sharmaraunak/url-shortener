import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", () => {
  console.log("error connecting with redis");
});

export async function connectRedis() {
  await redis.connect();
  console.log("redis connected");
}

export { redis };
