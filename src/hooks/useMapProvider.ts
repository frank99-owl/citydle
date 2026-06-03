import { useState, useCallback, useRef, useEffect } from 'react';
import { MapProvider } from '@/types';
import { wgs84togcj02, gcj02towgs84 } from '@/lib/coord';

export function useMapProvider(initialProvider: MapProvider = 'cartodb-dark') {
  const [mapProvider, setMapProvider] = useState<MapProvider>(initialProvider);
  const prevProviderRef = useRef<MapProvider>(initialProvider);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cartographer_provider') as MapProvider;
    if (saved && ['cartodb', 'cartodb-dark', 'osm', 'amap'].includes(saved)) {
      setMapProvider(saved);
      prevProviderRef.current = saved;
    }
  }, []);

  const updateMapProvider = useCallback((provider: MapProvider) => {
    setMapProvider(provider);
    localStorage.setItem('cartographer_provider', provider);
  }, []);

  // Convert WGS-84 to map display coordinates (GCJ-02 for amap)
  const toMapLatLng = useCallback((lat: number, lng: number): [number, number] => {
    if (mapProvider === 'amap') {
      const [gcjLng, gcjLat] = wgs84togcj02(lng, lat);
      return [gcjLat, gcjLng];
    }
    return [lat, lng];
  }, [mapProvider]);

  // Convert map display coordinates back to WGS-84
  const toGameLatLng = useCallback((lat: number, lng: number): [number, number] => {
    if (mapProvider === 'amap') {
      const [wgsLng, wgsLat] = gcj02towgs84(lng, lat);
      return [wgsLat, wgsLng];
    }
    return [lat, lng];
  }, [mapProvider]);

  // Convert coordinates when switching between providers
  const convertCoordinate = useCallback((lat: number, lng: number, oldP: string, newP: string): [number, number] => {
    let wgsLat = lat;
    let wgsLng = lng;
    if (oldP === 'amap') {
      const [lngW, latW] = gcj02towgs84(lng, lat);
      wgsLat = latW;
      wgsLng = lngW;
    }
    if (newP === 'amap') {
      const [lngG, latG] = wgs84togcj02(wgsLng, wgsLat);
      return [latG, lngG];
    }
    return [wgsLat, wgsLng];
  }, []);

  // Get tile layer URL and options for current provider
  const getTileConfig = useCallback(() => {
    let url = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
    let options: Record<string, any> = {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
      keepBuffer: 6,
      updateWhenIdle: true,
      updateWhenZooming: false,
    };

    if (mapProvider === 'cartodb') {
      url = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
    } else if (mapProvider === 'osm') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      options.attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    } else if (mapProvider === 'amap') {
      url = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
      options.attribution = '&copy; <a href="https://www.amap.com/">AutoNavi</a>';
      options.subdomains = '1234';
    }

    return { url, options };
  }, [mapProvider]);

  return {
    mapProvider,
    updateMapProvider,
    toMapLatLng,
    toGameLatLng,
    convertCoordinate,
    getTileConfig,
    prevProviderRef,
  };
}
