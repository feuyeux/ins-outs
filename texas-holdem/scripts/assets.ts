import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("public/assets", { recursive: true });
for (const [name, color, amount] of [
  ["felt", [28, 76, 62], 14],
  ["leather", [32, 35, 33], 13],
  ["room", [24, 30, 28], 5],
] as const) {
  const size = 512;
  const pixels = Buffer.alloc(size * size * 3);
  let seed = 12345;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise =
        (seed / 0xffffffff - 0.5) * amount +
        (name === "felt" ? Math.sin(x * 3) * Math.cos(y * 3) * 2 : 0);
      for (let c = 0; c < 3; c++)
        pixels[(y * size + x) * 3 + c] = Math.max(0, color[c] + noise);
    }
  await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 86 })
    .toFile(`public/assets/${name}.webp`);
}
const icon = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="100" fill="#193c32"/><rect x="22" y="22" width="468" height="468" rx="85" fill="none" stroke="#c9b17a" stroke-width="5"/><path d="M256  ninety"/><path d="M256 88C224 143 110 194 110 273C110 330 184 353 231 315L208 393H304L281 315C328 353 402 330 402 273C402 194 288 143 256 88Z" fill="#ddc995"/></svg>`;
await sharp(Buffer.from(icon.replace('<path d="M256  ninety"/>', "")))
  .png()
  .toFile("public/icon.png");
await sharp("public/icon.png").resize(192).png().toFile("public/icon-192.png");
const people = [12, 11, 47, 13, 44, 33];
for (let i = 0; i < people.length; i++) {
  try {
    const response = await fetch(`https://i.pravatar.cc/160?img=${people[i]}`);
    if (!response.ok) throw new Error(String(response.status));
    await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(160, 160)
      .webp({ quality: 88 })
      .toFile(`public/assets/avatar-${i}.webp`);
  } catch {
    const avatar = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="${["#687b66", "#668082", "#947f7a", "#7a858a", "#978378", "#74756a"][i]}"/><circle cx="80" cy="61" r="30" fill="#e4d3ba"/><ellipse cx="80" cy="159" rx="62" ry="61" fill="#263e37"/></svg>`;
    await sharp(Buffer.from(avatar))
      .webp()
      .toFile(`public/assets/avatar-${i}.webp`);
  }
}
for (const [name, frequency, duration] of [
  ["deal", 500, 0.07],
  ["chip", 1200, 0.08],
  ["win", 660, 0.5],
] as const) {
  const rate = 22050,
    count = Math.floor(rate * duration);
  const wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const v =
      Math.sin(t * frequency * Math.PI * 2) *
      Math.exp(-t * (name === "win" ? 7 : 65)) *
      0.2;
    wav.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  await writeFile(`public/assets/${name}.wav`, wav);
}
console.log("Generated table textures, portraits, icons and audio.");
