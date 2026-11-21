export function mapGoogleProfile(profile: {
  sub: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  email_verified?: boolean;
}) {
  return {
    id: profile.sub,
    name: profile.name ?? null,
    email: profile.email ?? null,
    image: profile.picture ?? null,
    emailVerified: profile.email_verified === true ? new Date() : null,
  };
}

export async function authorizeGoogleIdentity(
  email: string | null | undefined,
  emailVerified: boolean,
  isExistingAccountVerified: (email: string) => Promise<boolean | null>,
) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !emailVerified) {
    return "/user/signin?error=GoogleEmailNotVerified";
  }

  const existingAccountVerified =
    await isExistingAccountVerified(normalizedEmail);
  if (existingAccountVerified === false) {
    return "/user/signin?error=AccountNotVerified";
  }

  return true;
}
