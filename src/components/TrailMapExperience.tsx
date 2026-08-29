import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

import type { TrailRoute } from "../lib/content/schemas.ts";
import { milesToKilometers } from "../lib/content/metrics.ts";
import {
  getMapDayForMile,
  initialMapSelection,
  selectMapDay,
  selectMapMile,
  type MapDayViewModel,
} from "../lib/map/mapExperience.ts";
import { createRouteIndex, getCoordinateAtMile } from "../lib/map/route.ts";
import "./TrailMapExperience.css";

interface Props {
  days: readonly MapDayViewModel[];
  route: TrailRoute;
  mapStyleUrl: string;
  initialDayId?: string;
}

function createLocalMapStyle(route: TrailRoute) {
  return {
    version: 8 as const,
    sources: {
      "pct-route": {
        type: "geojson" as const,
        data: {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: route.coordinates,
          },
        },
      },
    },
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": "#191d27" },
      },
      {
        id: "pct-route-shadow",
        type: "line" as const,
        source: "pct-route",
        paint: {
          "line-color": "#11151d",
          "line-width": 5,
          "line-opacity": 0.75,
        },
      },
      {
        id: "pct-route-line",
        type: "line" as const,
        source: "pct-route",
        paint: {
          "line-color": "#91e6a5",
          "line-width": 2,
          "line-opacity": 0.95,
        },
      },
    ],
  };
}

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export default function TrailMapExperience({
  days,
  route,
  mapStyleUrl,
  initialDayId,
}: Props) {
  const initialSelection = useMemo(
    () => initialMapSelection(days, initialDayId),
    [days, initialDayId],
  );
  const [selection, setSelection] = useState(initialSelection);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const routeIndex = useMemo(
    () => createRouteIndex(route.coordinates),
    [route.coordinates],
  );
  const selectedDay =
    days.find(({ id }) => id === selection.dayId) ??
    getMapDayForMile(days, selection.mile);
  const selectedKilometers = milesToKilometers(selection.mile);

  useEffect(() => {
    let disposed = false;

    async function createMap() {
      if (!mapContainerRef.current) return;

      try {
        const maplibre = await import("maplibre-gl");
        if (disposed || !mapContainerRef.current) return;

        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style:
            mapStyleUrl === "local" ? createLocalMapStyle(route) : mapStyleUrl,
          bounds: [route.bounds.southwest, route.bounds.northeast],
          fitBoundsOptions: { padding: 44 },
          attributionControl: false,
        });
        mapRef.current = map;

        const markerElement = document.createElement("span");
        markerElement.className = "trail-map-marker";
        markerElement.setAttribute("aria-hidden", "true");
        const marker = new maplibre.Marker({ element: markerElement })
          .setLngLat(
            getCoordinateAtMile(route, initialSelection.mile, routeIndex),
          )
          .addTo(map);
        markerRef.current = marker;

        const addRoute = () => {
          if (map.getSource("pct-route")) return;
          map.addSource("pct-route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.coordinates,
              },
            },
          });
          map.addLayer({
            id: "pct-route-shadow",
            type: "line",
            source: "pct-route",
            paint: {
              "line-color": "#11151d",
              "line-width": 5,
              "line-opacity": 0.75,
            },
          });
          map.addLayer({
            id: "pct-route-line",
            type: "line",
            source: "pct-route",
            paint: {
              "line-color": "#91e6a5",
              "line-width": 2,
              "line-opacity": 0.95,
            },
          });
        };

        map.on("load", addRoute);
        map.on("style.load", addRoute);
        if (map.isStyleLoaded()) addRoute();
        map.on("error", () => {
          if (!map.isStyleLoaded() && mapStyleUrl !== "local") {
            map.setStyle(createLocalMapStyle(route));
          }
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }));
      } catch {
        setMapUnavailable(true);
      }
    }

    void createMap();

    return () => {
      disposed = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [initialSelection.mile, mapStyleUrl, route, routeIndex]);

  useEffect(() => {
    markerRef.current?.setLngLat(
      getCoordinateAtMile(route, selection.mile, routeIndex),
    );
  }, [route, routeIndex, selection.mile]);

  function chooseDay(dayId: string) {
    setSelection(selectMapDay(days, dayId));
  }

  function chooseMile(mile: number) {
    setSelection(selectMapMile(days, mile));
  }

  return (
    <section className="trail-map-experience" aria-label="Carte du parcours">
      <div className="trail-map-stage">
        <div ref={mapContainerRef} className="trail-map-canvas" />
        {mapUnavailable ? (
          <p className="trail-map-fallback">
            La carte ne peut pas être affichée sur cet appareil. Les journées et
            les statistiques restent disponibles.
          </p>
        ) : null}
      </div>

      <aside className="trail-map-panel" aria-live="polite">
        <div className="trail-map-heading">
          <p>{selectedDay.regionLabel}</p>
          <h1>Jour {selectedDay.sequence}</h1>
          <time dateTime={selectedDay.date}>{selectedDay.dateLabel}</time>
          <strong>{selectedDay.locationLabel}</strong>
        </div>

        <div className="trail-map-controls">
          <label htmlFor="map-day">Journée</label>
          <select
            id="map-day"
            value={selectedDay.id}
            onChange={(event) => chooseDay(event.target.value)}
          >
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                Jour {day.sequence} · {day.locationLabel}
              </option>
            ))}
          </select>

          <div className="trail-map-mile-label">
            <label htmlFor="map-mile">Progression</label>
            <output htmlFor="map-mile">
              {formatNumber(selection.mile)} mi
            </output>
          </div>
          <input
            id="map-mile"
            type="range"
            min={days[0]!.mileStart}
            max={route.journalMaxMile}
            step="0.1"
            value={selection.mile}
            onChange={(event) => chooseMile(event.target.valueAsNumber)}
          />
          <div className="trail-map-termini" aria-hidden="true">
            <span>Mexique</span>
            <span>Canada</span>
          </div>
        </div>

        <dl className="trail-map-stats">
          <div>
            <dt>Ce jour</dt>
            <dd>{formatNumber(selectedDay.distanceMiles)} mi</dd>
            <small>{formatNumber(selectedDay.distanceKilometers)} km</small>
          </div>
          <div>
            <dt>Parcourus</dt>
            <dd>{formatNumber(selection.mile)} mi</dd>
            <small>{formatNumber(selectedKilometers)} km</small>
          </div>
          <div>
            <dt>Ascension</dt>
            <dd>{formatNumber(selectedDay.ascentMeters)} m</dd>
          </div>
          <div>
            <dt>Descente</dt>
            <dd>{formatNumber(selectedDay.descentMeters)} m</dd>
          </div>
        </dl>

        <a className="trail-map-journal-link" href={selectedDay.journalHref}>
          Lire le jour {selectedDay.sequence} <span aria-hidden="true">→</span>
        </a>
      </aside>
    </section>
  );
}
