import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  DEFAULT_WATERMARK_POSITION,
  DEFAULT_WATERMARK_SIZE,
} from "../src/lib/watermark-options";
import {
  embedInvisibleWatermark,
  extractInvisibleWatermark,
  parseWatermarkOptions,
  validateWatermarkImageType,
  WatermarkInputError,
} from "../src/server/images/invisible-watermark";
import { handleAdminWatermarkUpload } from "../src/server/images/admin-watermark-upload";
import { prepareProductImageUpload } from "../src/server/images/product-watermark-upload";

async function createPng(width = 512, height = 512) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    pixels[pixel * 4] = (pixel * 31) % 256;
    pixels[pixel * 4 + 1] = (pixel * 17) % 256;
    pixels[pixel * 4 + 2] = (pixel * 7) % 256;
    pixels[pixel * 4 + 3] = 255;
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

function watermarkForm(
  image: Buffer,
  text: string,
  position = DEFAULT_WATERMARK_POSITION,
  size = DEFAULT_WATERMARK_SIZE,
) {
  const formData = new FormData();
  formData.append(
    "file",
    new File([Uint8Array.from(image)], "photo.png", { type: "image/png" }),
  );
  formData.append("watermarkText", text);
  formData.append("watermarkPosition", position);
  formData.append("watermarkSizePercent", String(size));
  return formData;
}

test("watermark stays within one RGB level and its payload can be extracted", async () => {
  const original = await createPng();
  const options = parseWatermarkOptions(
    "  Primaveral — prueba 🌸  ",
    "center",
    30,
  );
  const output = await embedInvisibleWatermark(original, options);
  const [before, after] = await Promise.all([
    sharp(original).toColourspace("srgb").ensureAlpha().raw().toBuffer(),
    sharp(output).toColourspace("srgb").ensureAlpha().raw().toBuffer(),
  ]);
  let maxChannelDifference = 0;
  for (let index = 0; index < before.length; index++) {
    maxChannelDifference = Math.max(
      maxChannelDifference,
      Math.abs(before[index]! - after[index]!),
    );
  }

  assert.equal(maxChannelDifference, 1);
  assert.equal(
    await extractInvisibleWatermark(output, "center", 30),
    "Primaveral — prueba 🌸",
  );
  assert.equal(await extractInvisibleWatermark(output, "top-left", 30), null);

  const { data, info } = await sharp(output)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const regionSide = Math.floor(Math.min(info.width, info.height) * 0.3);
  const regionLeft = Math.floor((info.width - regionSide) / 2);
  const regionTop = Math.floor((info.height - regionSide) / 2);
  const payloadBitOffset = (regionTop * info.width + regionLeft + 48) * 4;
  data[payloadBitOffset] = data[payloadBitOffset]! ^ 1;
  data[payloadBitOffset + 1] = data[payloadBitOffset + 1]! ^ 1;
  data[payloadBitOffset + 2] = data[payloadBitOffset + 2]! ^ 1;
  const corrupted = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  assert.equal(await extractInvisibleWatermark(corrupted, "center", 30), null);
});

test("watermark options enforce text, size, and position limits", () => {
  assert.throws(
    () => parseWatermarkOptions("   ", "center", 30),
    WatermarkInputError,
  );
  assert.throws(
    () => parseWatermarkOptions("x".repeat(129), "center", 30),
    WatermarkInputError,
  );
  assert.throws(
    () => parseWatermarkOptions("texto", "unknown", 30),
    WatermarkInputError,
  );
  assert.throws(
    () => parseWatermarkOptions("texto", "center", 25),
    WatermarkInputError,
  );
});

test("watermark rejects insufficient image capacity and mismatched MIME types", async () => {
  const smallImage = await createPng(32, 32);
  await assert.rejects(
    embedInvisibleWatermark(
      smallImage,
      parseWatermarkOptions("texto", "center", 20),
    ),
    (error: unknown) =>
      error instanceof WatermarkInputError &&
      error.message.includes("demasiado pequeña"),
  );
  await assert.rejects(
    validateWatermarkImageType(smallImage, "image/jpeg"),
    WatermarkInputError,
  );
});

test("product upload prepares an invisible PNG without modifying the source", async () => {
  const original = await createPng();
  const originalCopy = Buffer.from(original);
  const prepared = await prepareProductImageUpload(
    original,
    "image/png",
    "Producto-123",
    "bottom-left",
    30,
  );

  assert.equal(prepared.watermarked, true);
  assert.deepEqual(original, originalCopy);
  assert.notDeepEqual(prepared.buffer, original);
  assert.equal(
    await extractInvisibleWatermark(prepared.buffer, "bottom-left", 30),
    "Producto-123",
  );
  const unmarked = await prepareProductImageUpload(
    original,
    "image/png",
    null,
    null,
    null,
  );
  assert.equal(unmarked.watermarked, false);
  assert.deepEqual(unmarked.buffer, original);
  assert.equal((await sharp(original).metadata()).format, "png");
});

test("product upload accepts the existing JPEG and WebP formats", async () => {
  const png = await createPng();
  const sources = [
    { mimeType: "image/jpeg", image: await sharp(png).jpeg().toBuffer() },
    { mimeType: "image/webp", image: await sharp(png).webp().toBuffer() },
  ];

  for (const { mimeType, image } of sources) {
    const prepared = await prepareProductImageUpload(
      image,
      mimeType,
      "producto",
      "top-right",
      30,
    );
    assert.equal(prepared.watermarked, true);
    assert.equal(
      await extractInvisibleWatermark(prepared.buffer, "top-right", 30),
      "producto",
    );
    assert.equal((await sharp(prepared.buffer).metadata()).format, "png");
  }
});

test("admin watermark endpoint rejects non-admin roles and returns a marked PNG to admins", async () => {
  const image = await createPng();
  for (const role of [null, "EMPLOYEE", "CUSTOMER"]) {
    const denied = await handleAdminWatermarkUpload(
      new Request("https://primaveral.example/api/admin/watermark"),
      role,
    );
    assert.equal(denied.status, 403);
  }

  const response = await handleAdminWatermarkUpload(
    new Request("https://primaveral.example/api/admin/watermark", {
      method: "POST",
      body: watermarkForm(image, "solo administrador"),
    }),
    "ADMIN",
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(
    await extractInvisibleWatermark(
      Buffer.from(await response.arrayBuffer()),
      DEFAULT_WATERMARK_POSITION,
      DEFAULT_WATERMARK_SIZE,
    ),
    "solo administrador",
  );
});
