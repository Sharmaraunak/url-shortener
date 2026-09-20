import { randomInt } from "node:crypto";

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * encodes a number into base62
 * @param id id of the encoded number
 * @returns encoded string
 */
export function encodeBase62(id: number): string {
  let encodedString = "";

  if (id === 0) {
    return "0";
  }

  while (id > 0) {
    let remainder = id % 62;
    encodedString = BASE62[remainder] + encodedString;

    id = Math.floor(id / 62);
  }

  return encodedString;
}

/**
 * decodes the base62 string into a number
 * @param url base62 encoded url
 * @returns decoded number
 */
export function decodeBase62(url: string): number {
  let decodedNumber = 0;
  if (url === "0") {
    return 0;
  }
  for (const char of url) {
    const value = BASE62.indexOf(char);

    if (value === -1) {
      throw new Error(`Invalid character ${char}`);
    }

    decodedNumber = decodedNumber * 62 + value;
  }

  return decodedNumber;
}

export function generateShortCodes(length: number): string {
  let randomCode = "";

  for (let i = 0; i < 8; i++) {
    const val = randomInt(0, BASE62.length);
    randomCode += BASE62[val];
  }

  return randomCode;
}
