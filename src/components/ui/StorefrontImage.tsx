import React from "react";

export interface ImageManifestEntry {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurDataURL?: string;
}

export type ImagesManifest = Record<string, ImageManifestEntry>;

export interface StorefrontImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
  decoding?: "async" | "sync" | "auto";
  className?: string;
  style?: React.CSSProperties;
  manifest?: ImagesManifest;
}

/**
 * Resolves product image paths:
 * 1. SVGs pass through unchanged to a direct <img> (zero server image optimizer overhead).
 * 2. Processed raster paths resolve via the manifest to a plain <img> with srcSet, sizes,
 *    explicit width/height, and a base64 blur placeholder.
 * 3. The first/priority product image uses fetchpriority="high" and eager loading;
 *    all others use loading="lazy" and decoding="async".
 * 4. Maintains exact container sizing and cropping without depending on Vercel image optimization.
 */
export default function StorefrontImage({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  fetchPriority,
  loading,
  decoding = "async",
  className = "",
  style = {},
  manifest,
}: StorefrontImageProps) {
  const isSvg = src.toLowerCase().endsWith(".svg");

  // Determine priority & loading
  const finalFetchPriority: "high" | "low" | "auto" | undefined = priority
    ? "high"
    : fetchPriority;
  const finalLoading: "eager" | "lazy" | undefined = priority
    ? "eager"
    : (loading ?? "lazy");

  const fillStyle: React.CSSProperties = fill
    ? {
        position: "absolute",
        height: "100%",
        width: "100%",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      }
    : {};

  // Case 1: SVG passes through unchanged
  if (isSvg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fetchPriority={finalFetchPriority}
        loading={finalLoading}
        decoding={decoding}
        className={className}
        style={{ ...fillStyle, ...style }}
      />
    );
  }

  // Case 2: Resolve raster image through manifest if available
  let manifestEntry: ImageManifestEntry | undefined = undefined;
  if (manifest) {
    if (manifest[src]) {
      manifestEntry = manifest[src];
    } else {
      // Try resolving with .webp extension or base filename
      const webpPath = src.replace(/\.(jpe?g|png|webp|heic)$/i, ".webp");
      if (manifest[webpPath]) {
        manifestEntry = manifest[webpPath];
      } else {
        const baseName = src
          .split("/")
          .pop()
          ?.replace(/\.[^/.]+$/, "");
        if (baseName && manifest[baseName]) {
          manifestEntry = manifest[baseName];
        }
      }
    }
  }

  if (manifestEntry) {
    const blurStyle: React.CSSProperties = manifestEntry.blurDataURL
      ? {
          backgroundImage: `url("${manifestEntry.blurDataURL}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {};

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={manifestEntry.src}
        srcSet={manifestEntry.srcSet}
        sizes={sizes || (fill ? "100vw" : undefined)}
        width={fill ? manifestEntry.width : (width ?? manifestEntry.width)}
        height={fill ? manifestEntry.height : (height ?? manifestEntry.height)}
        alt={alt}
        fetchPriority={finalFetchPriority}
        loading={finalLoading}
        decoding={decoding}
        className={className}
        style={{ ...fillStyle, ...blurStyle, ...style }}
      />
    );
  }

  // Case 3: Fallback plain raster <img>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      fetchPriority={finalFetchPriority}
      loading={finalLoading}
      decoding={decoding}
      className={className}
      style={{ ...fillStyle, ...style }}
    />
  );
}
