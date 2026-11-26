import { readCatalogImage } from "@/lib/catalog-db";
import { validRecordId } from "@/lib/catalog-input";
import { isCatalogImageCollection } from "@/lib/catalog";

type Context = { params: Promise<{ collection: string; id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { collection, id } = await params;
  const image = isCatalogImageCollection(collection) && validRecordId(id)
    ? readCatalogImage(collection, id)
    : undefined;

  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
