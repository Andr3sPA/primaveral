import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:5432/primaveral_test";
process.env.AUTH_SECRET = "test-only-secret";
process.env.CRON_SECRET = "test-only-cron-secret-with-at-least-32-chars";
process.env.APP_URL = "https://primaveral.example";
process.env.META_ACCESS_TOKEN = "test-only-page-token";
process.env.META_PAGE_ACCESS_TOKEN = "";
process.env.META_PAGE_ID = "test-page-id";
process.env.META_INSTAGRAM_USER_ID = "test-instagram-id";

const {
  createInstagramJpegUrl,
  createPublicationCaption,
  createPublicationIdempotencyKey,
  getMetaEnvironment,
  getMissingMetaEnvironmentKeys,
  getRetryDelayMs,
  PublicationInputError,
  requirePublicHttpsImageUrl,
  resolveMetaPageAccessToken,
} = await import("../src/server/social/publishing");
const { createMetaPublisher, MetaApiError } = await import(
  "../src/server/social/meta-api"
);
const { isCronRequestAuthorized } = await import("../src/server/social/worker");

const payload = {
  productName: "Blusa bordada",
  description: "Bordado hecho a mano",
  price: 250000,
  currency: "$",
  imageUrl:
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1600/blusa.webp",
  productUrl: "https://primaveral.example/menu/c123456789012345678901234",
  whatsappUrl:
    "https://api.whatsapp.com/message/L4SSJI6CVEXJL1?autoload=1&app_absent=0",
};

test("publication keys are stable per product and platform", () => {
  assert.equal(
    createPublicationIdempotencyKey("product-1", "FACEBOOK", "post-1"),
    "product:product-1:FACEBOOK:post-1",
  );
  assert.notEqual(
    createPublicationIdempotencyKey("product-1", "FACEBOOK", "post-1"),
    createPublicationIdempotencyKey("product-1", "INSTAGRAM", "post-1"),
  );
  assert.notEqual(
    createPublicationIdempotencyKey("product-1", "FACEBOOK", "post-1"),
    createPublicationIdempotencyKey("product-1", "FACEBOOK", "post-2"),
  );
});

test("custom publication text and hashtags are used verbatim", () => {
  const caption = "Nueva colección 🌿\n\n#Primaveral #HechoAMano";

  assert.equal(createPublicationCaption({ ...payload, caption }), caption);
});

test("Meta page token prefers META_PAGE_ACCESS_TOKEN and accepts META_ACCESS_TOKEN", () => {
  assert.equal(
    resolveMetaPageAccessToken({
      pageAccessToken: "page-token",
      accessToken: "alias-token",
    }),
    "page-token",
  );
  assert.equal(
    resolveMetaPageAccessToken({ accessToken: "alias-token" }),
    "alias-token",
  );
  assert.equal(
    resolveMetaPageAccessToken({
      pageAccessToken: "",
      accessToken: "alias-token",
    }),
    "alias-token",
  );
  assert.equal(resolveMetaPageAccessToken({ pageAccessToken: "" }), undefined);
  assert.equal(resolveMetaPageAccessToken({}), undefined);
});

test("Meta environment reads META_ACCESS_TOKEN when the Page token name is unset", () => {
  const configuration = getMetaEnvironment("FACEBOOK");
  assert.equal(configuration.configured, true);
  assert.equal(configuration.accessToken, "test-only-page-token");
});

test("Meta environment requires APP_URL, CRON_SECRET, and a page token alias", () => {
  assert.deepEqual(
    getMissingMetaEnvironmentKeys("FACEBOOK", {
      pageId: "page-id",
      accessToken: "alias-token",
      appUrl: "https://primaveral.example",
      cronSecret: "x".repeat(32),
      nodeEnv: "production",
    }),
    [],
  );
  assert.deepEqual(
    getMissingMetaEnvironmentKeys("FACEBOOK", {
      pageId: "page-id",
      accessToken: "alias-token",
      appUrl: "http://primaveral.example",
      cronSecret: "x".repeat(32),
      nodeEnv: "production",
    }),
    ["APP_URL (HTTPS)"],
  );
  assert.deepEqual(
    getMissingMetaEnvironmentKeys("FACEBOOK", {
      pageId: "page-id",
      accessToken: "alias-token",
      appUrl: "https://primaveral.example/nested",
      cronSecret: "x".repeat(32),
      nodeEnv: "production",
    }),
    ["APP_URL (canonical origin)"],
  );
  assert.deepEqual(
    getMissingMetaEnvironmentKeys("FACEBOOK", {
      pageId: "page-id",
      accessToken: "alias-token",
      appUrl: "not-an-origin",
      cronSecret: "x".repeat(32),
      nodeEnv: "production",
    }),
    ["APP_URL (canonical origin)"],
  );
  assert.deepEqual(
    getMissingMetaEnvironmentKeys("INSTAGRAM", {
      pageId: "page-id",
      pageAccessToken: "page-token",
      nodeEnv: "development",
    }),
    ["APP_URL", "CRON_SECRET", "META_INSTAGRAM_USER_ID"],
  );
  assert.deepEqual(
    getMissingMetaEnvironmentKeys("FACEBOOK", {
      pageId: "page-id",
      appUrl: "https://primaveral.example",
      cronSecret: "x".repeat(32),
      nodeEnv: "production",
    }),
    ["META_PAGE_ACCESS_TOKEN"],
  );
  assert.deepEqual(
    getMissingMetaEnvironmentKeys("FACEBOOK", {
      pageId: "page-id",
      accessToken: "alias-token",
      appUrl: "https://primaveral.example",
      cronSecret: "x".repeat(31),
      nodeEnv: "production",
    }),
    ["CRON_SECRET"],
  );
});

test("captions include the product and direct WhatsApp links", () => {
  const caption = createPublicationCaption(payload);

  assert.match(caption, /https:\/\/primaveral\.example\/menu\//);
  assert.match(
    caption,
    /https:\/\/api\.whatsapp\.com\/message\/L4SSJI6CVEXJL1\?autoload=1&app_absent=0/,
  );
});

test("Instagram image URLs request JPEG from Cloudinary", () => {
  const result = createInstagramJpegUrl(payload.imageUrl);
  assert.match(
    new URL(result).pathname,
    /\/image\/upload\/f_jpg,q_auto,w_1600\/blusa\.webp$/,
  );
});

test("Instagram accepts public JPEGs and rejects absent or non-JPEG images", () => {
  const jpegUrl = "https://cdn.example.com/products/shirt.jpg?width=1200";
  assert.equal(createInstagramJpegUrl(jpegUrl), jpegUrl);
  assert.throws(
    () => createInstagramJpegUrl(null),
    (error: unknown) =>
      error instanceof PublicationInputError && error.code === "IMAGE_REQUIRED",
  );
  assert.throws(
    () => createInstagramJpegUrl("https://cdn.example.com/products/shirt.png"),
    (error: unknown) =>
      error instanceof PublicationInputError && error.code === "IMAGE_NOT_JPEG",
  );
});

test("Facebook image URLs must use HTTPS", () => {
  assert.equal(requirePublicHttpsImageUrl(payload.imageUrl!), payload.imageUrl);
  assert.throws(
    () => requirePublicHttpsImageUrl("http://cdn.example.com/image.jpg"),
    (error: unknown) =>
      error instanceof PublicationInputError &&
      error.code === "IMAGE_MUST_USE_HTTPS",
  );
});

test("Facebook publishes through the versioned Page API without putting the token in the URL", async () => {
  let requestUrl = "";
  let requestHeaders: HeadersInit | undefined;
  let requestBody = "";
  const publisher = createMetaPublisher(
    {
      pageId: "page-id",
      accessToken: "test-token",
      graphApiVersion: "v27.0",
    },
    async (input, init) => {
      requestUrl = String(input);
      requestHeaders = init?.headers;
      requestBody = String(init?.body);
      return Response.json({ id: "photo-id", post_id: "post-id" });
    },
  );

  assert.equal(await publisher.publishFacebook(payload), "post-id");
  assert.match(requestUrl, /graph\.facebook\.com\/v27\.0\/page-id\/photos$/);
  assert.doesNotMatch(requestUrl, /test-token/);
  assert.equal(
    new Headers(requestHeaders).get("authorization"),
    "Bearer test-token",
  );
  assert.match(
    new URLSearchParams(requestBody).get("caption") ?? "",
    /Pídelo por WhatsApp/,
  );
});

test("Facebook and Instagram publish the custom caption without generated product copy", async () => {
  const bodies: string[] = [];
  const responses = [
    { id: "photo-id", post_id: "post-id" },
    { id: "container-id" },
  ];
  const publisher = createMetaPublisher(
    {
      pageId: "page-id",
      instagramUserId: "instagram-id",
      accessToken: "test-token",
      graphApiVersion: "v27.0",
    },
    async (_input, init) => {
      bodies.push(String(init?.body));
      return Response.json(responses.shift() ?? {});
    },
  );
  const customCaption = "Lanzamiento especial\n\n#Primaveral #HechoAMano";

  await publisher.publishFacebook({ ...payload, caption: customCaption });
  await publisher.createInstagramContainer({
    ...payload,
    caption: customCaption,
  });

  assert.equal(new URLSearchParams(bodies[0]).get("caption"), customCaption);
  assert.equal(new URLSearchParams(bodies[1]).get("caption"), customCaption);
  assert.doesNotMatch(bodies.join("&"), /Pídelo por WhatsApp/);
});

test("Facebook text-only posts use the Page feed message parameter", async () => {
  let requestUrl = "";
  let requestBody = "";
  const publisher = createMetaPublisher(
    {
      pageId: "page-id",
      accessToken: "test-token",
      graphApiVersion: "v27.0",
    },
    async (input, init) => {
      requestUrl = String(input);
      requestBody = String(init?.body);
      return Response.json({ id: "post-id" });
    },
  );

  await publisher.publishFacebook({ ...payload, imageUrl: null });
  const params = new URLSearchParams(requestBody);
  assert.match(requestUrl, /graph\.facebook\.com\/v27\.0\/page-id\/feed$/);
  assert.match(params.get("message") ?? "", /Pídelo por WhatsApp/);
  assert.equal(params.has("caption"), false);
});

test("Instagram creates, checks, and publishes a media container", async () => {
  const calls: Array<{ url: URL; method: string; body: string }> = [];
  const responses = [
    { id: "container-id" },
    { status_code: "FINISHED" },
    { id: "instagram-post-id" },
  ];
  const publisher = createMetaPublisher(
    {
      pageId: "page-id",
      instagramUserId: "instagram-id",
      accessToken: "test-token",
      graphApiVersion: "v27.0",
    },
    async (input, init) => {
      calls.push({
        url: new URL(String(input)),
        method: init?.method ?? "GET",
        body: String(init?.body ?? ""),
      });
      return Response.json(responses.shift() ?? {});
    },
  );

  const containerId = await publisher.createInstagramContainer(payload);
  assert.equal(containerId, "container-id");
  assert.equal(
    (await publisher.getInstagramContainerStatus(containerId)).status_code,
    "FINISHED",
  );
  assert.equal(
    await publisher.publishInstagramContainer(containerId),
    "instagram-post-id",
  );
  assert.equal(calls[0]?.url.pathname, "/v27.0/instagram-id/media");
  assert.equal(
    new URLSearchParams(calls[0]?.body ?? "").get("image_url"),
    createInstagramJpegUrl(payload.imageUrl),
  );
  assert.equal(calls[1]?.url.searchParams.get("fields"), "status_code,status");
  assert.equal(calls[2]?.url.pathname, "/v27.0/instagram-id/media_publish");
  assert.equal(
    new URLSearchParams(calls[2]?.body).get("creation_id"),
    "container-id",
  );
});

test("Meta API errors do not expose credentials", async () => {
  const publisher = createMetaPublisher(
    {
      pageId: "page-id",
      accessToken: "test-token",
      graphApiVersion: "v27.0",
    },
    async () =>
      Response.json(
        { error: { code: 190, message: "Invalid OAuth access token" } },
        { status: 400 },
      ),
  );

  await assert.rejects(
    publisher.publishFacebook(payload),
    (error: unknown) =>
      error instanceof MetaApiError &&
      error.code === "META_190" &&
      !error.message.includes("test-token"),
  );
});

test("rate limits use Meta's Retry-After header", async () => {
  const publisher = createMetaPublisher(
    {
      pageId: "page-id",
      accessToken: "test-token",
      graphApiVersion: "v27.0",
    },
    async () =>
      Response.json(
        { error: { code: 4, is_transient: true } },
        { status: 429, headers: { "Retry-After": "120" } },
      ),
  );

  await assert.rejects(
    publisher.publishFacebook(payload),
    (error: unknown) =>
      error instanceof MetaApiError &&
      error.safeToRetry &&
      error.retryAfterMs === 120_000,
  );
});

test("Meta transient rate-limit errors are safe to retry", async () => {
  const publisher = createMetaPublisher(
    {
      pageId: "page-id",
      accessToken: "test-token",
      graphApiVersion: "v27.0",
    },
    async () =>
      Response.json(
        { error: { code: 4, is_transient: true } },
        { status: 400 },
      ),
  );

  await assert.rejects(
    publisher.publishFacebook(payload),
    (error: unknown) =>
      error instanceof MetaApiError &&
      error.code === "META_4" &&
      error.safeToRetry,
  );
});

test("ambiguous publishing failures are not retried automatically", async () => {
  const publisher = createMetaPublisher(
    {
      pageId: "page-id",
      accessToken: "test-token",
      graphApiVersion: "v27.0",
    },
    async () => {
      throw new Error("simulated network interruption");
    },
  );

  await assert.rejects(
    publisher.publishFacebook(payload),
    (error: unknown) =>
      error instanceof MetaApiError &&
      error.outcomeUnknown &&
      !error.safeToRetry,
  );
});

test("cron endpoint authorization requires its server-side bearer secret", () => {
  assert.equal(
    isCronRequestAuthorized(
      new Request("https://example.test/api/cron/social-publications", {
        headers: {
          authorization: "Bearer test-only-cron-secret-with-at-least-32-chars",
        },
      }),
    ),
    true,
  );
  assert.equal(
    isCronRequestAuthorized(
      new Request("https://example.test/api/cron/social-publications"),
    ),
    false,
  );
});

test("retry delay is capped and grows exponentially", () => {
  assert.equal(
    getRetryDelayMs(1, 0, () => 0),
    60_000,
  );
  assert.equal(
    getRetryDelayMs(2, 0, () => 0),
    120_000,
  );
  assert.equal(
    getRetryDelayMs(1, 90_000, () => 0),
    90_000,
  );
  assert.equal(
    getRetryDelayMs(20, 0, () => 1),
    60 * 60 * 1000,
  );
});
