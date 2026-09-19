/**
 * encodes a number into base62
 * @param id id of the encoded number
 * @returns encoded string
 */
export function encodeBase62(id: number): string {
  let encodedString = "";

  const BASE62 =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
