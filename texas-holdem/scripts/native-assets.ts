import sharp from "sharp";
import { readdir } from "node:fs/promises";

await sharp("public/icon.png")
  .resize(1024)
  .png()
  .toFile("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const splash = await sharp({
  create: { width: 2732, height: 2732, channels: 3, background: "#111817" },
})
  .composite([
    {
      input: await sharp("public/icon.png").resize(280).png().toBuffer(),
      gravity: "center",
    },
  ])
  .png()
  .toBuffer();
for (const f of await readdir("ios/App/App/Assets.xcassets/Splash.imageset"))
  if (f.endsWith(".png"))
    await sharp(splash).toFile(
      `ios/App/App/Assets.xcassets/Splash.imageset/${f}`,
    );
for (const [dpi, size] of [
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192],
] as const) {
  for (const name of [
    "ic_launcher",
    "ic_launcher_round",
    "ic_launcher_foreground",
  ]) {
    const outSize = name.endsWith("foreground")
      ? Math.round(size * 2.25)
      : size;
    await sharp("public/icon.png")
      .resize(outSize)
      .png()
      .toFile(`android/app/src/main/res/mipmap-${dpi}/${name}.png`);
  }
}
for (const dir of await readdir("android/app/src/main/res"))
  if (dir.startsWith("drawable")) {
    const list = await readdir(`android/app/src/main/res/${dir}`);
    if (list.includes("splash.png")) {
      const file = `android/app/src/main/res/${dir}/splash.png`;
      const meta = await sharp(file).metadata();
      await sharp(splash)
        .resize(meta.width, meta.height, {
          fit: "contain",
          background: "#111817",
        })
        .png()
        .toFile(file);
    }
  }
console.log("Native icons and launch screens generated.");
