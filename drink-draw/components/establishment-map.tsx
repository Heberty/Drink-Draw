"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import { CatalogImage } from "@/components/catalog-image";
import { useCatalog } from "@/components/catalog-provider";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { distanceInKm, establishmentLabel, validCoordinates, type Coordinates, type Establishment } from "@/lib/establishments";

type Place = Establishment & Coordinates;
type MapLocation = Coordinates & ({ source: "browser"; accuracy: number } | { source: "manual" });
type MapEngine = { leaflet: typeof import("leaflet"); map: LeafletMap };
const distanceFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function MapCanvas({ places, nearby, location, focused, onPickLocation }: {
  places: Place[];
  nearby: Place[];
  location?: MapLocation;
  focused?: { id: string };
  onPickLocation?: (point: Coordinates) => void;
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
    const element = map.getContainer();
    let zoomTimer: number | undefined;
    let wheelDelta = 0;

    function zoomWithControl(event: WheelEvent) {
      if (!event.ctrlKey) return;
      const delta = leaflet.DomEvent.getWheelDelta(event);
      if (!delta) return;
      event.preventDefault();
      wheelDelta += delta;
      if (zoomTimer !== undefined) return;

      const point = map.mouseEventToContainerPoint(event);
      zoomTimer = window.setTimeout(() => {
        const zoom = map.getZoom();
        const nextZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), zoom + Math.sign(wheelDelta)));
        if (nextZoom !== zoom) map.setZoomAround(point, nextZoom);
        wheelDelta = 0;
        zoomTimer = undefined;
      }, 80);
    }

    element.addEventListener("wheel", zoomWithControl, { passive: false });
    return () => {
      element.removeEventListener("wheel", zoomWithControl);
      window.clearTimeout(zoomTimer);
    };
  }, [engine]);

  useEffect(() => {
    if (!engine || !onPickLocation) return;
    const { map } = engine;
    const element = map.getContainer();
    map.closePopup();

    function pickPoint({ latlng }: LeafletMouseEvent) {
      const { lat, lng } = latlng.wrap();
      onPickLocation?.({ latitude: lat, longitude: lng });
    }

    function pickCenter(event: KeyboardEvent) {
      if (event.key === "Enter" && event.target === element) {
        event.preventDefault();
        const { lat, lng } = map.getCenter().wrap();
        onPickLocation?.({ latitude: lat, longitude: lng });
      }
    }

    map.on("click", pickPoint);
    element.addEventListener("keydown", pickCenter);
    return () => {
      map.off("click", pickPoint);
      element.removeEventListener("keydown", pickCenter);
    };
  }, [engine, onPickLocation]);

  useEffect(() => {
    if (!engine) return;
    const { leaflet, map } = engine;
    const layer = leaflet.layerGroup().addTo(map);
    const byId = new Map<string, Marker>();
    const nearest = nearby[0];

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
      if (location.source === "browser" && Number.isFinite(location.accuracy) && location.accuracy > 0) {
        leaflet.circle(point, {
          radius: location.accuracy, color: "#2477d4", weight: 1, fillOpacity: 0.12, interactive: false,
        }).addTo(layer);
      }
      leaflet.circleMarker(point, { radius: 8, weight: 3, color: "#fff", fillColor: "#2477d4", fillOpacity: 1 })
        .bindTooltip(location.source === "manual" ? "Localização marcada por você" : "Localização estimada pelo navegador").addTo(layer);
      if (nearby.length) {
        const bounds = leaflet.latLngBounds([point]);
        for (const { latitude, longitude } of nearby) bounds.extend([latitude, longitude]);
        map.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
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
  }, [engine, places, nearby, location]);

  useEffect(() => {
    const marker = focused && markers.current.get(focused.id);
    if (engine && marker) {
      engine.map.setView(marker.getLatLng(), Math.max(engine.map.getZoom(), 15));
      marker.openPopup();
    }
  }, [engine, places, focused]);

  return (
    <div className="map-panel">
      <div ref={container} className={onPickLocation ? "map-canvas map-canvas-picking" : "map-canvas"}
        role="region" aria-label="Mapa dos estabelecimentos" aria-describedby={onPickLocation ? "map-pick-hint" : "map-zoom-hint"} />
      {!engine && <p className="map-status" role="status">{unavailable ? "O mapa está indisponível." : "Carregando mapa…"}</p>}
    </div>
  );
}

export function EstablishmentMap() {
  const { establishments, establishmentTypes, ready } = useCatalog();
  const [typeId, setTypeId] = useState("");
  const [location, setLocation] = useState<MapLocation>();
  const [focused, setFocused] = useState<{ id: string }>();
  const [locationRequest, setLocationRequest] = useState<number | null>(0);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "pending" | "failed">("pending");
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
  const nearby = useMemo(() => location ? matches.slice(0, 5).map(({ place }) => place) : [], [location, matches]);
  const accuracy = location?.source === "browser" && Number.isFinite(location.accuracy) && location.accuracy > 0
    ? location.accuracy : undefined;

  useEffect(() => {
    if (locationRequest === null) return;
    if (!navigator.geolocation) {
      setLocationStatus("failed");
      return;
    }
    let active = true;
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (!active) return;
      setFocused(undefined);
      setLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, source: "browser" });
      setLocationStatus("idle");
    }, () => {
      if (active) setLocationStatus("failed");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    return () => { active = false; };
  }, [locationRequest]);

  const pickLocation = useCallback((point: Coordinates) => {
    if (!validCoordinates(point)) return;
    setFocused(undefined);
    setLocation({ ...point, source: "manual" });
    setPickingLocation(false);
  }, []);

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
        <Button type="button" variant="outline" onClick={() => {
          setPickingLocation(false);
          setLocationRequest((current) => (current ?? 0) + 1);
        }} disabled={locationStatus === "pending"}>
          <LocateFixed aria-hidden="true" /> {locationStatus === "pending" ? "Localizando…"
            : location?.source === "browser" ? "Atualizar minha localização" : "Usar minha localização"}
        </Button>
        <Button type="button" variant="outline" aria-pressed={pickingLocation} onClick={() => {
          if (!pickingLocation) {
            setLocationRequest(null);
            setLocationStatus("idle");
          }
          setPickingLocation(!pickingLocation);
        }}>
          <MapPin aria-hidden="true" /> {pickingLocation ? "Cancelar seleção" : "Marcar no mapa"}
        </Button>
      </div>
      {locationStatus === "failed" && <p className="map-location-status" role="status">Não foi possível acessar sua localização. Confira a permissão do navegador.</p>}
      {pickingLocation ? (
        <p className="map-location-status" id="map-pick-hint" role="status">Clique ou toque no ponto onde você está. Pelo teclado, use as setas para mover o mapa e pressione Enter para marcar o centro.</p>
      ) : location?.source === "manual" ? <p className="map-location-status" role="status">Distâncias calculadas a partir do ponto que você marcou.</p>
        : accuracy !== undefined && <p className="map-location-status" role="status">
          Margem estimada da localização de {accuracy >= 1000 ? `${distanceFormat.format(accuracy / 1000)} km` : `${Math.ceil(accuracy)} m`}.
        </p>}
      <p className="map-zoom-hint" id="map-zoom-hint">Segure <kbd>Ctrl</kbd> e role sobre o mapa para ajustar o zoom.</p>
      <div className="map-layout">
        <MapCanvas places={places} nearby={nearby} location={location} focused={focused} onPickLocation={pickingLocation ? pickLocation : undefined} />
        <aside className="map-results">
          <h2>{nearby.length ? "Mais próximos" : "Estabelecimentos no mapa"}</h2>
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
