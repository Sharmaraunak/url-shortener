import { redis } from "../db/redis.js";

export type CachedUrlResponse =
  | {
      status: "HIT";
      url: string;
    }
  | { status: "MISS" }
  | { status: "NOT_FOUND" };

/**
 * get the cached url from redis
 * @param key key of cache
 */
export async function getCachedUrl(
  shortcode: string,
): Promise<CachedUrlResponse | null> {
  const cachedKey = `url:${shortcode}`;
  try {
    const url = await redis.get(cachedKey);
    if (!url) {
      return {
        status: "MISS",
      };
    }
    if (url === "NOT_FOUND") {
      return {
        status: "NOT_FOUND",
      };
    }

    return {
      status: "HIT",
      url: url,
    };
  } catch (error) {
    console.error("Redis unavailable");
    return null;
  }
}

/**
 * get the cached url from redis
 * @param shortcode shortcode of the url
 */
export async function setCachedUrl(
  shortcode: string,
  url: string,
): Promise<string | null> {
  try {
    const cachedKey = `url:${shortcode}`;
    return await redis.set(cachedKey, url);
  } catch (error) {
    console.error("Redis unavailable");
    return null;
  }
}

/**
 * get the cached url from redis
 * @param shortcode shortcode of the url
 */
export async function setCachedUrlNotFound(
  shortcode: string,
): Promise<string | null> {
  try {
    const cachedKey = `url:${shortcode}`;
    return await redis.set(cachedKey, "NOT_FOUND", { EX: 60 });
  } catch (error) {
    console.error("Redis unavailable");
    return null;
  }
}
