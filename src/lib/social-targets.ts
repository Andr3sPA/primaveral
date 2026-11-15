import type { MenuItem, PublicationPlatform } from "@prisma/client";

type ProductSocialTargets = Pick<
  MenuItem,
  "autoPublishToFacebook" | "autoPublishToInstagram"
>;

export function isProductSocialTargetEnabled(
  product: ProductSocialTargets,
  platform: PublicationPlatform,
) {
  return platform === "FACEBOOK"
    ? product.autoPublishToFacebook
    : product.autoPublishToInstagram;
}
