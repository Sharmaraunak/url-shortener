export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
import { all } from '../../../client/node_modules/axios/index.d';
 * normal incoming url by checking scheme to not allow some harmful url
 * @param url incoming url
 * @returns normalized url
 */
export function normalizeUrl(url: string): string {
  const allowedProtocols = ["http:", "https:"];
  let parsed;

  url = url.trim();
  if (!url) {
    throw new ValidationError("URL can not be empty");
  }

  // check scheme
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url);
  if (!hasScheme) {
    url = "https://" + url;
  }

  try {
    parsed = new URL(url);
  } catch (error) {
    throw new ValidationError("inappropritate URL");
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new ValidationError("inappropritate URL");
  }

  if (!parsed.hostname.includes(".")) {
    throw new ValidationError("Invalid hostname");
  }
  return parsed.toString();
}
