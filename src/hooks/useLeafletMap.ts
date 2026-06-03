import { useRef, useState, useEffect, useCallback } from 'react';
import { Bounds, Street, MapProvider } from '@/types';
import { gcj02towgs84 } from '@/lib/coord';

interface UseLeafletMapOptions {
  toMapLatLng: (lat: number, lng: number) => [number, number];
}

export function useLeafletMap({ toMapLatLng }: UseLeafletMapOptions) {
  const mapRef = useRef<any>(null);
  const mapContainerId = 'game-map';
  const geojsonLayersRef = useRef<Record<string, any>>({});
  const drawLayerRef = useRef<any>(null);
  const boundsLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const hintLayerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let L: any;
    let mapInstance: any;
    let active = true;

    const initMap = async () => {
      L = await import('leaflet');
      await import('@geoman-io/leaflet-geoman-free');

      if (!active) return;

      const container = document.getElementById(mapContainerId);
      if (!container || (container as any)._leaflet_id) return;

      const defaultCenter: [number, number] = [51.5155, -0.0922];
      const defaultZoom = 14;

      mapInstance = L.map(mapContainerId, {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
      }).setView(defaultCenter, defaultZoom);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

      mapRef.current = mapInstance;
      setMapLoaded(true);
    };

    initMap();

    return () => {
      active = false;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Sync tile layer
  const syncTileLayer = useCallback((url: string, options: Record<string, any>) => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    import('leaflet').then((L) => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
      tileLayerRef.current = L.tileLayer(url, options).addTo(map);
    });
  }, [mapLoaded]);

  // Draw bounds rectangle
  const drawBounds = useCallback((bounds: Bounds | null) => {
    const map = mapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      if (boundsLayerRef.current) {
        map.removeLayer(boundsLayerRef.current);
        boundsLayerRef.current = null;
      }
      if (bounds) {
        const sw = toMapLatLng(bounds.south, bounds.west);
        const ne = toMapLatLng(bounds.north, bounds.east);
        const leafletBounds = L.latLngBounds(L.latLng(sw[0], sw[1]), L.latLng(ne[0], ne[1]));

        boundsLayerRef.current = L.rectangle(leafletBounds, {
          color: '#423023',
          weight: 2,
          fill: true,
          fillColor: '#f4ebd0',
          fillOpacity: 0.1,
          dashArray: '5, 5',
          interactive: false,
        }).addTo(map);
      }
    });
  }, [toMapLatLng]);

  // Fit map to bounds with padding
  const fitToBounds = useCallback((bounds: Bounds, animate = true) => {
    const map = mapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      const sw = toMapLatLng(bounds.south, bounds.west);
      const ne = toMapLatLng(bounds.north, bounds.east);
      const leafletBounds = L.latLngBounds(L.latLng(sw[0], sw[1]), L.latLng(ne[0], ne[1]));
      map.fitBounds(leafletBounds, {
        paddingTopLeft: [400, 20],
        paddingBottomRight: [20, 20],
        animate,
        duration: animate ? 1.0 : undefined,
      });
    });
  }, [toMapLatLng]);

  // Draw street polylines
  const drawStreets = useCallback((streets: Street[], showResult: boolean) => {
    const map = mapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      Object.values(geojsonLayersRef.current).forEach(layer => map.removeLayer(layer));
      geojsonLayersRef.current = {};

      streets.forEach(street => {
        if (street.geometry && street.geometry.length > 0) {
          const mappedGeom = street.geometry.map(([lat, lng]) => toMapLatLng(lat, lng));
          let color = '#8a3324';
          let opacity = 0;
          if (street.guessed) {
            color = '#3a5f43';
            opacity = 0.8;
          } else if (showResult) {
            color = '#8a3324';
            opacity = 0.8;
          }

          const polyline = L.polyline(mappedGeom, {
            color,
            weight: 4,
            opacity,
            interactive: false,
          }).addTo(map);

          geojsonLayersRef.current[street.name.toLowerCase().trim()] = polyline;
        }
      });
    });
  }, [toMapLatLng]);

  // Reveal a guessed street
  const revealStreet = useCallback((name: string) => {
    const layer = geojsonLayersRef.current[name.toLowerCase().trim()];
    if (layer && mapRef.current) {
      layer.setStyle({ opacity: 0.8, color: '#3a5f43' });
      const bounds = layer.getBounds();
      mapRef.current.panTo(bounds.getCenter());
    }
  }, []);

  // Reveal missed streets on settlement
  const revealMissedStreets = useCallback((streets: Street[]) => {
    streets.forEach(street => {
      if (!street.guessed) {
        const layer = geojsonLayersRef.current[street.name.toLowerCase().trim()];
        if (layer) {
          layer.setStyle({ opacity: 0.8, color: '#8a3324' });
        }
      }
    });
  }, []);

  // Draw hint layer with pulsing animation
  const drawHint = useCallback((geom: number[][]) => {
    const map = mapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      if (hintLayerRef.current) {
        if (hintLayerRef.current._pulseInterval) {
          clearInterval(hintLayerRef.current._pulseInterval);
        }
        map.removeLayer(hintLayerRef.current);
        hintLayerRef.current = null;
      }

      const mappedGeom = geom.map(([lat, lng]) => toMapLatLng(lat, lng));
      const layer = L.polyline(mappedGeom, {
        color: '#f59e0b',
        weight: 8,
        opacity: 0.8,
        dashArray: '10, 10',
        interactive: false,
      }).addTo(map);

      hintLayerRef.current = layer;

      const bounds = layer.getBounds();
      map.panTo(bounds.getCenter());

      let goingUp = false;
      const intervalId = setInterval(() => {
        if (!layer || !map.hasLayer(layer)) {
          clearInterval(intervalId);
          return;
        }
        const currentOpacity = layer.options.opacity || 0.8;
        let nextOpacity = goingUp ? currentOpacity + 0.15 : currentOpacity - 0.15;
        if (nextOpacity >= 0.9) {
          nextOpacity = 0.9;
          goingUp = false;
        } else if (nextOpacity <= 0.2) {
          nextOpacity = 0.2;
          goingUp = true;
        }
        layer.setStyle({ opacity: nextOpacity });
      }, 150);

      (layer as any)._pulseInterval = intervalId;
    });
  }, [toMapLatLng]);

  // Clear hint layer
  const clearHint = useCallback(() => {
    const map = mapRef.current;
    if (hintLayerRef.current) {
      if (hintLayerRef.current._pulseInterval) {
        clearInterval(hintLayerRef.current._pulseInterval);
      }
      if (map) {
        map.removeLayer(hintLayerRef.current);
      }
      hintLayerRef.current = null;
    }
  }, []);

  // Clear all game layers
  const clearAllLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (boundsLayerRef.current) {
      map.removeLayer(boundsLayerRef.current);
      boundsLayerRef.current = null;
    }
    if (drawLayerRef.current) {
      map.removeLayer(drawLayerRef.current);
      drawLayerRef.current = null;
    }
    Object.values(geojsonLayersRef.current).forEach(layer => map.removeLayer(layer));
    geojsonLayersRef.current = {};
    clearHint();
  }, [clearHint]);

  // Setup Geoman drawing
  const setupDrawing = useCallback((enabled: boolean, onDraw: (bounds: Bounds) => void, mapProvider: MapProvider) => {
    const map = mapRef.current;
    if (!map || !map.pm) return;

    if (enabled) {
      map.pm.addControls({
        position: 'topleft',
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawRectangle: true,
        drawPolygon: false,
        drawCircle: false,
        editMode: false,
        dragMode: false,
        cutPolygon: false,
        removalMode: true,
      });

      // Remove existing handler
      map.off('pm:create');
      map.on('pm:create', (e: any) => {
        if (drawLayerRef.current) {
          map.removeLayer(drawLayerRef.current);
        }
        const layer = e.layer;
        drawLayerRef.current = layer;

        const leafletBounds = layer.getBounds();
        let s = leafletBounds.getSouth();
        let w = leafletBounds.getWest();
        let n = leafletBounds.getNorth();
        let eLng = leafletBounds.getEast();

        if (mapProvider === 'amap') {
          const [lngW1, latW1] = gcj02towgs84(w, s);
          const [lngW2, latW2] = gcj02towgs84(eLng, n);
          s = Math.min(latW1, latW2);
          n = Math.max(latW1, latW2);
          w = Math.min(lngW1, lngW2);
          eLng = Math.max(lngW1, lngW2);
        }

        onDraw({ south: s, west: w, north: n, east: eLng });
      });
    } else {
      map.pm.removeControls();
      map.off('pm:create');
      if (drawLayerRef.current) {
        map.removeLayer(drawLayerRef.current);
        drawLayerRef.current = null;
      }
    }
  }, []);

  // Shift map center when provider changes
  const shiftMapCenter = useCallback((oldProvider: string, newProvider: string, convertFn: (lat: number, lng: number, oldP: string, newP: string) => [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    const center = map.getCenter();
    if (oldProvider !== newProvider) {
      const [newLat, newLng] = convertFn(center.lat, center.lng, oldProvider, newProvider);
      map.setView([newLat, newLng], map.getZoom(), { animate: false });
    }
  }, []);

  return {
    mapRef,
    mapContainerId,
    mapLoaded,
    geojsonLayersRef,
    drawLayerRef,
    boundsLayerRef,
    tileLayerRef,
    hintLayerRef,
    syncTileLayer,
    drawBounds,
    fitToBounds,
    drawStreets,
    revealStreet,
    revealMissedStreets,
    drawHint,
    clearHint,
    clearAllLayers,
    setupDrawing,
    shiftMapCenter,
  };
}
