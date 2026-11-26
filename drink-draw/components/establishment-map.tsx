"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { CatalogImage } from "@/components/catalog-image";
import { useCatalog } from "@/components/catalog-provider";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { distanceInKm, establishmentLabel, validCoordinates, type Coordinates, type Establishment } from "@/lib/establishments";

type Place = Establishment & Coordinates;
type MapEngine = { leaflet: typeof import("leaflet"); map: LeafletMap };
const distanceFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function MapCanvas({ places, nearest, location, focused }: {
  places: Place[];
  nearest?: Place;
  location?: Coordinates;
  focused?: { id: string };
}) {
  const container = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, Marker>());
  const [engine, setEngine] = useState<MapEngine>();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    let map: LeafletMap | undefined;
    void import("leaflet").then((leaflet) => {
      if (!active || !container.current) return;
      map = leaflet.map(container.current, { scrollWheelZoom: false }).setView([-14.2, -51.9], 4);
      leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(map);
      setEngine({ leaflet, map });
    }).catch(() => {
      if (active) setUnavailable(true);
    });
    return () => {
      active = false;
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!engine) return;
    const { leaflet, map } = engine;
    const layer = leaflet.layerGroup().addTo(map);
    const byId = new Map<string, Marker>();

    for (const place of places) {
      const face = document.createElement("span");
      face.className = "map-marker-face";
      if (typeof place.image === "string") {
        const image = document.createElement("img");
        image.src = place.image;
        image.alt = "";
        face.append(image);
      } else {
        face.textContent = place.name.trim().charAt(0).toLocaleUpperCase("pt-BR");
      }
      const name = establishmentLabel(place);
      const popup = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = name;
      popup.append(heading);
      if (place.address) {
        const address = document.createElement("div");
        address.textContent = place.address;
        popup.append(address);
      }
      const marker = leaflet.marker([place.latitude, place.longitude], {
        title: name,
        alt: name,
        zIndexOffset: place.id === nearest?.id ? 1000 : 0,
        icon: leaflet.divIcon({
          className: place.id === nearest?.id ? "map-marker map-marker-nearest" : "map-marker",
          html: face,
          iconSize: [40, 44],
          iconAnchor: [20, 44],
          popupAnchor: [0, -42],
        }),
      }).bindPopup(popup).addTo(layer);
      byId.set(place.id, marker);
    }
    markers.current = byId;

    if (location) {
      const point = leaflet.latLng(location.latitude, location.longitude);
      leaflet.circleMarker(point, { radius: 8, weight: 3, color: "#fff", fillColor: "#2477d4", fillOpacity: 1 })
        .bindTooltip("Você está aqui").addTo(layer);
      if (nearest) {
        map.fitBounds(leaflet.latLngBounds([point, [nearest.latitude, nearest.longitude]]), { padding: [44, 44], maxZoom: 15 });
      } else {
        map.setView(point, 14);
      }
    } else if (places.length) {
      map.fitBounds(leaflet.latLngBounds(places.map(({ latitude, longitude }) => [latitude, longitude])), { padding: [44, 44], maxZoom: 14 });
    } else {
      map.setView([-14.2, -51.9], 4);
    }
    return () => {
      layer.remove();
      markers.current = new Map();
    };
  }, [engine, places, nearest, location]);

  useEffect(() => {
    const marker = focused && markers.current.get(focused.id);
    if (engine && marker) {
      engine.map.setView(marker.getLatLng(), Math.max(engine.map.getZoom(), 15));
      marker.openPopup();
    }
  }, [engine, places, focused]);

  return (
    <div className="map-panel">
      <div ref={container} className="map-canvas" role="region" aria-label="Mapa dos estabelecimentos" />
      {!engine && <p className="map-status" role="status">{unavailable ? "O mapa está indisponível." : "Carregando mapa…"}</p>}
    </div>
  );
}

export function EstablishmentMap() {
  const { establishments, establishmentTypes, ready } = useCatalog();
  const [typeId, setTypeId] = useState("");
  const [location, setLocation] = useState<Coordinates>();
  const [focused, setFocused] = useState<{ id: string }>();
  const [locationStatus, setLocationStatus] = useState<"idle" | "pending" | "failed">("idle");
  const selectedType = establishmentTypes.find(({ id }) => id === typeId);
  const type = selectedType?.name;
  const places = useMemo(() => establishments.filter((record): record is Place =>
    validCoordinates(record) && (!type || record.type === type),
  ), [establishments, type]);
  const options = useMemo(() => establishmentTypes.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [establishmentTypes]);
  const matches = useMemo(() => places.map((place) => ({
    place,
    distance: location ? distanceInKm(location, place) : undefined,
  })).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0) || a.place.name.localeCompare(b.place.name, "pt-BR")), [places, location]);
  const nearest = location ? matches[0]?.place : undefined;

  function locate() {
    if (!navigator.geolocation) {
      setLocationStatus("failed");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setFocused(undefined);
      setLocation({ latitude: coords.latitude, longitude: coords.longitude });
      setLocationStatus("idle");
    }, () => setLocationStatus("failed"), { timeout: 10000, maximumAge: 60000 });
  }

  return (
    <main className="frame dashboard">
      <header className="page-intro">
        <h1>Mapa<span>.</span></h1>
        <p>Encontre estabelecimentos cadastrados perto de você.</p>
      </header>
      <div className="map-toolbar">
        <div className="field">
          <label htmlFor="map-type">Tipo de estabelecimento</label>
          <NativeSelect id="map-type" value={selectedType?.id ?? ""} onChange={(event) => { setTypeId(event.target.value); setFocused(undefined); }}>
            <option value="">Todos os tipos</option>
            {options.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </NativeSelect>
        </div>
        <Button type="button" variant="outline" onClick={locate} disabled={locationStatus === "pending"}>
          <LocateFixed aria-hidden="true" /> {locationStatus === "pending" ? "Localizando…" : "Usar minha localização"}
        </Button>
      </div>
      {locationStatus === "failed" && <p className="map-location-status" role="status">Não foi possível acessar sua localização. Confira a permissão do navegador.</p>}
      <div className="map-layout">
        <MapCanvas places={places} nearest={nearest} location={location} focused={focused} />
        <aside className="map-results">
          <h2>{nearest ? "Mais próximos" : "Estabelecimentos no mapa"}</h2>
          {!ready ? <p role="status">Carregando estabelecimentos…</p> : matches.length === 0 ? (
            <p>{type ? "Nenhum local desse tipo tem coordenadas cadastradas." : "Nenhum estabelecimento tem coordenadas cadastradas."}</p>
          ) : (
            <ul>
              {matches.map(({ place, distance }) => (
                <li key={place.id}>
                  <button type="button" className="map-result" onClick={() => setFocused({ id: place.id })}>
                    <span className="map-result-logo" aria-hidden="true">
                      {place.image ? <CatalogImage image={place.image} /> : <MapPin />}
                    </span>
                    <span className="map-result-copy">
                      <strong>{establishmentLabel(place)}</strong>
                      <small>{place.type}{place.address ? ` · ${place.address}` : ""}</small>
                      {distance !== undefined && <small>{distanceFormat.format(distance)} km em linha reta</small>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
