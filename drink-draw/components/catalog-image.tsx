"use client";

import { useEffect, useState } from "react";

export function CatalogImage({ image, alt = "", className }: { image: Blob | string; alt?: string; className?: string }) {
  const [source, setSource] = useState<{ image: Blob; url: string } | null>(null);

  useEffect(() => {
    if (typeof image === "string") return;
    const url = URL.createObjectURL(image);
    setSource({ image, url });
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const url = typeof image === "string" ? image : source?.image === image ? source.url : null;
  if (!url) return null;
  // Object URLs refer to local files and are resolved directly by the browser.
  return <img src={url} alt={alt} className={className} width={512} height={512} />;
}
