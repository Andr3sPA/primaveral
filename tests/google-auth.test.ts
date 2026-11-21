import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeGoogleIdentity,
  mapGoogleProfile,
} from "../src/server/auth/google-identity";

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
