export function randomInt(max: number): number {
  const limit = 0x100000000 - (0x100000000 % max);
  const buffer = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}
