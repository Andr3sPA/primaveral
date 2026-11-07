"use client";
import * as React from "react";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";

export default function MenuItemImage({
  imageUrl,
}: {
  imageUrl: string | null;
}) {
  const [imageError, setImageError] = React.useState(false);

  const optimizeCloudinaryUrl = (url: string) => {
    if (url.includes("cloudinary.com")) {
      if (url.includes("/c_")) return url;
      const parts = url.split("/upload/");
      if (parts.length === 2) {
        return `${parts[0]}/upload/c_fill,w_48,h_48,q_auto,f_auto/${parts[1]}`;
      }
    }
    return url;
  };

  return (
    <div className="flex h-12 w-12 items-center justify-center">
      {imageUrl && !imageError ? (
        <Image
          src={optimizeCloudinaryUrl(imageUrl)}
          alt="Menu item"
          width={48}
          height={48}
          className="rounded-md object-cover"
          onError={() => setImageError(true)}
          priority={false}
          unoptimized={false}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-200">
          <ImageIcon className="h-6 w-6 text-gray-400" />
        </div>
      )}
    </div>
  );
}
