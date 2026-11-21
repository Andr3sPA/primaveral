import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeGoogleIdentity,
  createGoogleProvider,
  mapGoogleProfile,
  resolveGoogleOAuthCredentials,
} from "../src/server/auth/google-identity";

test("the configured OAuth variables create the Google provider", () => {
  const credentials = resolveGoogleOAuthCredentials(
    "test-google-client-id",
    "test-google-client-secret",
  );
  assert.deepEqual(credentials, {
    clientId: "test-google-client-id",
    clientSecret: "test-google-client-secret",
  });
  assert.equal(
    createGoogleProvider("test-google-client-id", "test-google-client-secret")
      ?.id,
    "google",
  );
});

test("the OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET environment keys feed the provider", async () => {
  const previous = {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
  };

  try {
    process.env.DATABASE_URL =
      "postgresql://test:test@127.0.0.1:5432/primaveral_test";
    Reflect.set(process.env, "NODE_ENV", "test");
    process.env.OAUTH_CLIENT_ID = "test-google-client-id";
    process.env.OAUTH_CLIENT_SECRET = "test-google-client-secret";

    const { env } = await import("../src/env.js");
    const provider = createGoogleProvider(
      env.OAUTH_CLIENT_ID,
      env.OAUTH_CLIENT_SECRET,
    );

    assert.equal(provider?.id, "google");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else Reflect.set(process.env, key, value);
    }
  }
});

test("Google sign-in is disabled when OAuth credentials are absent", () => {
  assert.equal(resolveGoogleOAuthCredentials(undefined, undefined), null);
  assert.equal(createGoogleProvider(undefined, undefined), null);
});

test("partial Google OAuth configuration reports the missing pair", () => {
  assert.throws(
    () => createGoogleProvider("test-google-client-id", undefined),
    /OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET must both be configured/,
  );
  assert.throws(
    () => createGoogleProvider(undefined, "test-google-client-secret"),
    /OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET must both be configured/,
  );
});

test("Google login requires Google's verified-email claim", async () => {
  let accountLookupCalled = false;
  const result = await authorizeGoogleIdentity(
    "customer@example.test",
    false,
    async () => {
      accountLookupCalled = true;
      return null;
    },
  );

  assert.equal(result, "/user/signin?error=GoogleEmailNotVerified");
  assert.equal(accountLookupCalled, false);
});

test("Google can link only an already verified account with the same email", async () => {
  const lookedUpEmails: string[] = [];
  const verifyExistingAccount = async (email: string) => {
    lookedUpEmails.push(email);
    return true;
  };

  assert.equal(
    await authorizeGoogleIdentity(
      "CUSTOMER@example.test",
      true,
      verifyExistingAccount,
    ),
    true,
  );
  assert.deepEqual(lookedUpEmails, ["customer@example.test"]);

  assert.equal(
    await authorizeGoogleIdentity(
      "customer@example.test",
      true,
      async () => false,
    ),
    "/user/signin?error=AccountNotVerified",
    "an unverified manual account cannot be linked or taken over",
  );
});

test("Google login can create a new account from verified claims", async () => {
  assert.equal(
    await authorizeGoogleIdentity(
      "new-customer@example.test",
      true,
      async () => null,
    ),
    true,
  );
});

test("Google profile marks verified email without inventing personal details", () => {
  const mapped = mapGoogleProfile({
    sub: "google-account-id",
    email: "customer@example.test",
    email_verified: true,
    name: "Cliente",
    picture: "https://example.test/avatar.png",
  });

  assert.equal(mapped.id, "google-account-id");
  assert.equal(mapped.email, "customer@example.test");
  assert.ok(mapped.emailVerified instanceof Date);
  assert.equal("phone" in mapped, false);
  assert.equal("address" in mapped, false);

  assert.equal(
    mapGoogleProfile({
      sub: "unverified-account-id",
      email: "unverified@example.test",
      email_verified: false,
    }).emailVerified,
    null,
  );
});
