import { loadCatalog } from "@/lib/catalog-db";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(loadCatalog(), { headers: { "Cache-Control": "no-store" } });
}
