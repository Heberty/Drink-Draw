import "leaflet/dist/leaflet.css";
import { EstablishmentMap } from "@/components/establishment-map";

export const metadata = { title: "Mapa de estabelecimentos | Drink Draw" };

export default function MapPage() {
  return <EstablishmentMap />;
}
