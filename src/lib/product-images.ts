export function getProductImages(image: string | null, images: string[]) {
  return images.length > 0 ? images : image ? [image] : [];
}
