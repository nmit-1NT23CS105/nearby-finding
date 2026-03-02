"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents
} from "react-leaflet";
import L, { DivIcon, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import Supercluster from "supercluster";
import { Feature, Point } from "geojson";
import { NearbyPlace } from "@/lib/types";
import { formatDistanceKm } from "@/lib/utils";

type PlaceProps = {
  cluster: false;
  placeId: string;
  place: NearbyPlace;
};

type ClusterProps = {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: number | string;
};

type PlaceFeature = Feature<Point, PlaceProps>;
type ClusterFeature = Feature<Point, ClusterProps>;

function markerIcon(selected: boolean) {
  return new DivIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:999px;background:${
      selected ? "#0ea5e9" : "#0284c7"
    };border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.25)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function clusterIcon(pointCount: number) {
  const size = pointCount < 10 ? 34 : pointCount < 50 ? 40 : 46;
  return new DivIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:#0369a1;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #e0f2fe;box-shadow:0 2px 10px rgba(0,0,0,.25)">${pointCount}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function BoundsController({
  center,
  radiusKm,
  selectedPlace
}: {
  center: { lat: number; lng: number };
  radiusKm: number;
  selectedPlace?: NearbyPlace | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPlace) {
      map.flyTo([selectedPlace.location.lat, selectedPlace.location.lng], 16, { duration: 0.5 });
      return;
    }

    const radiusMeters = radiusKm * 1000;
    const bounds = L.latLng(center.lat, center.lng).toBounds(radiusMeters * 2);
    map.fitBounds(bounds.pad(0.2), {
      animate: true
    });
  }, [map, center.lat, center.lng, radiusKm, selectedPlace]);

  return null;
}

function ClusterLayer({
  places,
  selectedPlaceId,
  onSelectPlace
}: {
  places: NearbyPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  const map = useMap();
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [zoom, setZoom] = useState(13);

  useMapEvents({
    moveend(event) {
      setBounds(event.target.getBounds());
      setZoom(event.target.getZoom());
    },
    zoomend(event) {
      setBounds(event.target.getBounds());
      setZoom(event.target.getZoom());
    }
  });

  useEffect(() => {
    setBounds(map.getBounds());
    setZoom(map.getZoom());
  }, [map]);

  const points = useMemo<PlaceFeature[]>(
    () =>
      places.map((place) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [place.location.lng, place.location.lat]
        },
        properties: {
          cluster: false,
          placeId: place.placeId,
          place
        }
      })),
    [places]
  );

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<PlaceProps, ClusterProps>({
      radius: 52,
      maxZoom: 18
    });
    index.load(points);
    return index;
  }, [points]);

  const clusters = useMemo(() => {
    if (!bounds) {
      return [] as Array<PlaceFeature | ClusterFeature>;
    }

    return clusterIndex.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom
    ) as Array<PlaceFeature | ClusterFeature>;
  }, [bounds, clusterIndex, zoom]);

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const key = feature.properties.cluster
          ? `cluster-${feature.properties.cluster_id}`
          : feature.properties.placeId;

        if (feature.properties.cluster) {
          const clusterId = feature.properties.cluster_id;
          return (
            <Marker
              key={key}
              position={[lat, lng]}
              icon={clusterIcon(feature.properties.point_count)}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(clusterIndex.getClusterExpansionZoom(clusterId), 18);
                  map.flyTo([lat, lng], expansionZoom, { duration: 0.35 });
                }
              }}
            />
          );
        }

        const place = feature.properties.place;
        return (
          <Marker
            key={key}
            position={[lat, lng]}
            icon={markerIcon(place.placeId === selectedPlaceId)}
            eventHandlers={{
              click: () => onSelectPlace(place.placeId)
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{place.name}</p>
                <p className="text-xs text-slate-600">{place.address}</p>
                <p className="text-xs">{place.category}</p>
                <p className="text-xs">Distance: {formatDistanceKm(place.distanceMeters)}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export function NearbyMap({
  center,
  radiusKm,
  places,
  selectedPlaceId,
  onSelectPlace
}: {
  center: { lat: number; lng: number };
  radiusKm: number;
  places: NearbyPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  const selectedPlace = useMemo(
    () => places.find((place) => place.placeId === selectedPlaceId) || null,
    [places, selectedPlaceId]
  );

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom className="h-full min-h-[420px] w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#0ea5e9", fillColor: "#38bdf8", fillOpacity: 0.12, weight: 1.8 }}
      />

      <ClusterLayer places={places} selectedPlaceId={selectedPlaceId} onSelectPlace={onSelectPlace} />
      <BoundsController center={center} radiusKm={radiusKm} selectedPlace={selectedPlace} />
    </MapContainer>
  );
}
