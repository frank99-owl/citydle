'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { PRESETS, ACHIEVEMENTS, Bounds, Street } from '@/lib/constants';
import { TRANSLATIONS, Language } from '@/lib/i18n';
import { wgs84togcj02, gcj02towgs84 } from '@/lib/coord';

interface HistoryEntry {
  id: number;
  map_name: string;
  score: number;
  total_streets: number;
  completion_rate: number;
  max_streak: number;
  played_at: string;
}

interface Favorite {
  id: number;
  name: string;
  cityName?: string;
  bounds: { south: number; west: number; north: number; east: number };
}

function GameApp() {
  const searchParams = useSearchParams();

  // Language state
  const [lang, setLang] = useState<Language>('en');

  // Lobby records lists
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');

  // Determine initial states based on query parameters to prevent layout shifting
  const hasBoundsParams = searchParams.get('south') && searchParams.get('west') && searchParams.get('north') && searchParams.get('east');
  const isCustomParam = searchParams.get('custom') === '1';

  // Navigation / View State
  const [view, setView] = useState<'lobby' | 'game'>(
    (hasBoundsParams || isCustomParam) ? 'game' : 'lobby'
  );
  const [customMode, setCustomMode] = useState(isCustomParam);
  const [gameStarted, setGameStarted] = useState(!!hasBoundsParams);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Active game logic states
  const [mapName, setMapName] = useState(searchParams.get('name') || 'Custom Area');
  const [bounds, setBounds] = useState<Bounds | null>(() => {
    const s = searchParams.get('south');
    const w = searchParams.get('west');
    const n = searchParams.get('north');
    const e = searchParams.get('east');
    if (s && w && n && e) {
      return {
        south: parseFloat(s),
        west: parseFloat(w),
        north: parseFloat(n),
        east: parseFloat(e),
      };
    }
    return null;
  });
  const [streets, setStreets] = useState<Street[]>([]);
  const [guess, setGuess] = useState('');
  const [guessedCount, setGuessedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Map settings and difficulty states
  const [mapProvider, setMapProvider] = useState<'cartodb' | 'cartodb-dark' | 'osm' | 'amap'>('cartodb-dark');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('hard');
  const [hintClue, setHintClue] = useState<{ name: string; pattern: string; geom?: number[][] } | null>(null);
  const [hintsUsed, setHintsUsed] = useState<number>(0);

  // Custom mode location search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Leaflet refs
  const mapRef = useRef<any>(null);
  const mapContainerId = 'game-map';
  const geojsonLayersRef = useRef<{ [key: string]: any }>({});
  const drawLayerRef = useRef<any>(null);
  const boundsLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const hintLayerRef = useRef<any>(null);
  const mapProviderRef = useRef<'cartodb' | 'cartodb-dark' | 'osm' | 'amap'>('cartodb-dark');
  const prevProviderRef = useRef<'cartodb' | 'cartodb-dark' | 'osm' | 'amap'>('cartodb-dark');
  
  const streetsRef = useRef<Street[]>([]);
  const boundsRef = useRef<Bounds | null>(null);
  const showResultRef = useRef<boolean>(false);
  const hintClueRef = useRef<any>(null);
  const difficultyRef = useRef<'easy' | 'medium' | 'hard'>('hard');

  const inputRef = useRef<HTMLInputElement>(null);
  const fetchIdRef = useRef(0);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Sync refs to avoid stale event handler closures
  useEffect(() => { mapProviderRef.current = mapProvider; }, [mapProvider]);
  useEffect(() => { streetsRef.current = streets; }, [streets]);
  useEffect(() => { boundsRef.current = bounds; }, [bounds]);
  useEffect(() => { showResultRef.current = showResult; }, [showResult]);
  useEffect(() => { hintClueRef.current = hintClue; }, [hintClue]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // Sync language and settings with localStorage on load
  useEffect(() => {
    const savedLang = localStorage.getItem('cartographer_lang') as Language;
    if (savedLang) {
      setLang(savedLang);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.includes('zh') || browserLang.includes('cn')) {
        setLang('zh');
      }
    }

    const savedProvider = localStorage.getItem('cartographer_provider') as any;
    if (savedProvider === 'cartodb-dark') {
      setMapProvider('cartodb-dark');
      prevProviderRef.current = 'cartodb-dark';
    } else {
      setMapProvider('cartodb-dark');
      prevProviderRef.current = 'cartodb-dark';
      localStorage.setItem('cartographer_provider', 'cartodb-dark');
    }
    const savedDifficulty = localStorage.getItem('cartographer_difficulty') as any;
    if (savedDifficulty && ['easy', 'medium', 'hard'].includes(savedDifficulty)) {
      setDifficulty(savedDifficulty);
    }
  }, []);

  // Update language preference
  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'zh' : 'en';
    setLang(newLang);
    localStorage.setItem('cartographer_lang', newLang);
  };

  const updateMapProvider = (provider: 'cartodb' | 'cartodb-dark' | 'osm' | 'amap') => {
    setMapProvider(provider);
    localStorage.setItem('cartographer_provider', provider);
  };

  const updateDifficulty = (diff: 'easy' | 'medium' | 'hard') => {
    setDifficulty(diff);
    localStorage.setItem('cartographer_difficulty', diff);
    if (diff === 'hard') {
      clearActiveHint();
    }
  };

  // Coordinate helpers depending on the selected provider
  const toMapLatLng = (lat: number, lng: number): [number, number] => {
    if (mapProvider === 'amap') {
      const [gcjLng, gcjLat] = wgs84togcj02(lng, lat);
      return [gcjLat, gcjLng];
    }
    return [lat, lng];
  };

  const toGameLatLng = (lat: number, lng: number): [number, number] => {
    if (mapProvider === 'amap') {
      const [wgsLng, wgsLat] = gcj02towgs84(lng, lat);
      return [wgsLat, wgsLng];
    }
    return [lat, lng];
  };

  const convertCoordinate = (lat: number, lng: number, oldP: string, newP: string): [number, number] => {
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
  };

  const clearActiveHint = () => {
    setHintClue(null);
    if (hintLayerRef.current) {
      if (hintLayerRef.current._pulseInterval) {
        clearInterval(hintLayerRef.current._pulseInterval);
      }
      if (mapRef.current) {
        mapRef.current.removeLayer(hintLayerRef.current);
      }
      hintLayerRef.current = null;
    }
  };

  const generateHintPattern = (name: string): string => {
    const words = name.split(' ');
    const patternWords = words.map(word => {
      if (word.length === 0) return '';
      const firstChar = word[0];
      const rest = word.slice(1);
      const restHidden = rest.replace(/[a-zA-Z]/g, '_');
      return firstChar + restHidden;
    });
    return patternWords.join(' ');
  };

  const handleGetHint = () => {
    const unguessed = streets.filter(s => !s.guessed);
    if (unguessed.length === 0) {
      alert(TRANSLATIONS[lang].hintLimitReached);
      return;
    }

    const randomStreet = unguessed[Math.floor(Math.random() * unguessed.length)];
    const pattern = generateHintPattern(randomStreet.name);

    setHintsUsed(prev => prev + 1);
    
    const nextHintClue = {
      name: randomStreet.name,
      pattern: pattern,
      geom: randomStreet.geometry,
    };
    setHintClue(nextHintClue);

    if (difficulty === 'easy' && randomStreet.geometry && randomStreet.geometry.length > 0) {
      const map = mapRef.current;
      if (map) {
        import('leaflet').then((L) => {
          if (hintLayerRef.current) {
            if (hintLayerRef.current._pulseInterval) {
              clearInterval(hintLayerRef.current._pulseInterval);
            }
            map.removeLayer(hintLayerRef.current);
            hintLayerRef.current = null;
          }

          const mappedGeom = randomStreet.geometry!.map(([lat, lng]) => toMapLatLng(lat, lng));
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
      }
    }
  };

  // Fetch history & favorites list on mount
  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(d => {
      setHistory(d.history || []);
      setHighScore(d.highScore || 0);
    }).catch(console.error);

    fetch('/api/favorites').then(r => r.json()).then(d => {
      setFavorites(d.favorites || []);
    }).catch(console.error);
  }, []);

  // Auto-focus guess input
  useEffect(() => {
    if (view === 'game' && gameStarted && !loading && !showResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view, gameStarted, loading, showResult]);

  // Synchronize state with query params (lightweight, doesn't reload page)
  const updateURLParams = (params: { name?: string; south?: number; west?: number; north?: number; east?: number; custom?: string } | null) => {
    if (typeof window === 'undefined') return;
    if (!params) {
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) {
        urlParams.set(key, val.toString());
      }
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  };

  // Triggered when entering with coordinates or bounds changed
  useEffect(() => {
    if (bounds && gameStarted && streets.length === 0 && !loading) {
      fetchStreets(bounds);
    }
  }, [bounds, gameStarted]);

  // Initialize Leaflet Map in the background
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

      // Start with a reasonable global/London default view in the background
      const defaultCenter: [number, number] = [51.5155, -0.0922];
      const defaultZoom = 14;

      mapInstance = L.map(mapContainerId, {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
      }).setView(defaultCenter, defaultZoom);

      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstance);

      mapRef.current = mapInstance;
      setMapLoaded(true);

      // Register rectangle drawing hooks for Geoman
      mapInstance.on('pm:create', (e: any) => {
        if (drawLayerRef.current) {
          mapInstance.removeLayer(drawLayerRef.current);
        }
        const layer = e.layer;
        drawLayerRef.current = layer;
        
        const leafletBounds = layer.getBounds();
        const provider = mapProviderRef.current;
        
        let s = leafletBounds.getSouth();
        let w = leafletBounds.getWest();
        let n = leafletBounds.getNorth();
        let eLng = leafletBounds.getEast();
        
        if (provider === 'amap') {
          const [wgsLng1, wgsLat1] = gcj02towgs84(w, s);
          const [wgsLng2, wgsLat2] = gcj02towgs84(eLng, n);
          s = Math.min(wgsLat1, wgsLat2);
          n = Math.max(wgsLat1, wgsLat2);
          w = Math.min(wgsLng1, wgsLng2);
          eLng = Math.max(wgsLng1, wgsLng2);
        }

        const drawnBounds: Bounds = {
          south: s,
          west: w,
          north: n,
          east: eLng,
        };
        setBounds(drawnBounds);
      });

      // If initial bounds already exist in state (e.g. from URL load), fit them immediately
      if (bounds) {
        const provider = mapProviderRef.current;
        let s = bounds.south;
        let w = bounds.west;
        let n = bounds.north;
        let eLng = bounds.east;

        if (provider === 'amap') {
          const [lngG1, latG1] = wgs84togcj02(w, s);
          const [lngG2, latG2] = wgs84togcj02(eLng, n);
          s = latG1;
          w = lngG1;
          n = latG2;
          eLng = lngG2;
        }

        const corner1 = L.latLng(s, w);
        const corner2 = L.latLng(n, eLng);
        const leafletBounds = L.latLngBounds(corner1, corner2);
        mapInstance.fitBounds(leafletBounds, {
          paddingTopLeft: [400, 20],
          paddingBottomRight: [20, 20],
          animate: false,
        });

        // Draw initial bounding box area border
        boundsLayerRef.current = L.rectangle(leafletBounds, {
          color: '#423023',
          weight: 2,
          fill: true,
          fillColor: '#f4ebd0',
          fillOpacity: 0.1,
          dashArray: '5, 5',
          interactive: false,
        }).addTo(mapInstance);
      }
    };

    initMap();

    return () => {
      active = false;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Sync Geoman drawing toolbar based on game states
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.pm) return;

    if (view === 'game' && customMode && !gameStarted) {
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
    } else {
      map.pm.removeControls();
      if (drawLayerRef.current) {
        map.removeLayer(drawLayerRef.current);
        drawLayerRef.current = null;
      }
    }
  }, [view, customMode, gameStarted, mapLoaded]);

  // Tile Layer Loading (CartoDB Dark Theme only)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    import('leaflet').then((L) => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      const url = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
      const options = {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        keepBuffer: 6,
        updateWhenIdle: true,
        updateWhenZooming: false,
      };

      tileLayerRef.current = L.tileLayer(url, options).addTo(map);
    });
  }, [mapLoaded]);

  // Redraw layers when mapProvider or difficulty changes to adjust coordinate projections
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    import('leaflet').then((L) => {
      // Shift map center when transitioning between providers to align physical coordinates
      const center = map.getCenter();
      const oldP = prevProviderRef.current;
      const newP = mapProvider;
      if (oldP !== newP) {
        const [newLat, newLng] = convertCoordinate(center.lat, center.lng, oldP, newP);
        map.setView([newLat, newLng], map.getZoom(), { animate: false });
        prevProviderRef.current = newP;
      }

      const activeBounds = boundsRef.current;
      const activeStreets = streetsRef.current;
      const isSettled = showResultRef.current;
      const currentHint = hintClueRef.current;

      // 1. Redraw bounds layer (if we have active bounds)
      if (boundsLayerRef.current) {
        map.removeLayer(boundsLayerRef.current);
        boundsLayerRef.current = null;
      }
      if (activeBounds) {
        const sw = toMapLatLng(activeBounds.south, activeBounds.west);
        const ne = toMapLatLng(activeBounds.north, activeBounds.east);
        const leafletBounds = L.latLngBounds(
          L.latLng(sw[0], sw[1]),
          L.latLng(ne[0], ne[1])
        );

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

      // 2. Redraw street polylines using current streets list
      Object.values(geojsonLayersRef.current).forEach(layer => map.removeLayer(layer));
      geojsonLayersRef.current = {};

      activeStreets.forEach(street => {
        if (street.geometry && street.geometry.length > 0) {
          const mappedGeom = street.geometry.map(([lat, lng]) => toMapLatLng(lat, lng));
          let color = '#8a3324';
          let opacity = 0;
          if (street.guessed) {
            color = '#3a5f43';
            opacity = 0.8;
          } else if (isSettled) {
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

      // 3. Redraw active hint layer
      if (hintLayerRef.current) {
        if (hintLayerRef.current._pulseInterval) {
          clearInterval(hintLayerRef.current._pulseInterval);
        }
        map.removeLayer(hintLayerRef.current);
        hintLayerRef.current = null;
      }

      if (currentHint && currentHint.geom && difficulty === 'easy') {
        const mappedGeom = currentHint.geom.map(([lat, lng]: number[]) => toMapLatLng(lat, lng));
        const layer = L.polyline(mappedGeom, {
          color: '#f59e0b',
          weight: 8,
          opacity: 0.8,
          dashArray: '10, 10',
          interactive: false,
        }).addTo(map);

        hintLayerRef.current = layer;

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
      }
    });
  }, [mapProvider, mapLoaded, difficulty]);

  // Adjust map bounds and draw box border when bounds change
  useEffect(() => {
    if (!mapRef.current || !bounds) return;

    import('leaflet').then((L) => {
      // Clear previous bounds
      if (boundsLayerRef.current) {
        mapRef.current.removeLayer(boundsLayerRef.current);
        boundsLayerRef.current = null;
      }

      const sw = toMapLatLng(bounds.south, bounds.west);
      const ne = toMapLatLng(bounds.north, bounds.east);
      const corner1 = L.latLng(sw[0], sw[1]);
      const corner2 = L.latLng(ne[0], ne[1]);
      const leafletBounds = L.latLngBounds(corner1, corner2);
      
      // Auto center with offset padding to avoid hiding behind the sidebar
      mapRef.current.fitBounds(leafletBounds, {
        paddingTopLeft: [400, 20],
        paddingBottomRight: [20, 20],
        animate: true,
        duration: 1.0,
      });

      // Draw active bounding box area border
      boundsLayerRef.current = L.rectangle(leafletBounds, {
        color: '#423023',
        weight: 2,
        fill: true,
        fillColor: '#f4ebd0',
        fillOpacity: 0.1,
        dashArray: '5, 5',
        interactive: false,
      }).addTo(mapRef.current);
    });
  }, [bounds]);

  // Fetch street vectors from server
  const fetchStreets = async (targetBounds: Bounds) => {
    setLoading(true);
    const currentFetchId = ++fetchIdRef.current;
    try {
      const res = await fetch('/api/streets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bounds: targetBounds }),
      });
      const data = await res.json();
      
      if (currentFetchId !== fetchIdRef.current) return;

      if (data.error) {
        alert(TRANSLATIONS[lang].alertFetchFail);
        return;
      }

      const formattedStreets: Street[] = data.streets.map((s: any) => ({
        name: s.name,
        guessed: false,
        geometry: s.geometry,
      }));

      setStreets(formattedStreets);
      setGuessedCount(0);
      setStreak(0);
      setMaxStreak(0);
      setIsSaved(false);
      setHintsUsed(0);
      clearActiveHint();

      // Clean old paths and draw hidden vector lines
      if (mapRef.current) {
        Object.values(geojsonLayersRef.current).forEach(layer => mapRef.current.removeLayer(layer));
        geojsonLayersRef.current = {};

        import('leaflet').then((L) => {
          if (currentFetchId !== fetchIdRef.current) return;
          formattedStreets.forEach(street => {
            if (street.geometry && street.geometry.length > 0) {
              const mappedGeom = street.geometry.map(([lat, lng]) => toMapLatLng(lat, lng));
              const polyline = L.polyline(mappedGeom, {
                color: '#8a3324',
                weight: 4,
                opacity: 0, // start invisible until guessed
                interactive: false,
              }).addTo(mapRef.current);

              geojsonLayersRef.current[street.name.toLowerCase().trim()] = polyline;
            }
          });
        });
      }
    } catch (err) {
      if (currentFetchId !== fetchIdRef.current) return;
      console.error(err);
      alert(TRANSLATIONS[lang].alertFetchFail);
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Action handlers
  const startGame = (preset: typeof PRESETS[0]) => {
    const presetName = lang === 'zh' ? preset.name.split(' ')[0] : preset.name.split(' ').slice(1).join(' ') || preset.name;
    setMapName(presetName);
    setCustomMode(false);
    setBounds(preset.bounds);
    setShowResult(false);
    clearActiveHint();

    // Pan map early in background
    if (mapRef.current) {
      import('leaflet').then((L) => {
        const sw = toMapLatLng(preset.bounds.south, preset.bounds.west);
        const ne = toMapLatLng(preset.bounds.north, preset.bounds.east);
        mapRef.current.fitBounds(L.latLngBounds(L.latLng(sw[0], sw[1]), L.latLng(ne[0], ne[1])), {
          paddingTopLeft: [400, 20],
          paddingBottomRight: [20, 20],
          animate: true,
          duration: 1.0,
        });
      });
    }

    fetchStreets(preset.bounds);

    setIsTransitioning(true);
    setView('game');
    setGameStarted(true);

    updateURLParams({
      name: presetName,
      south: preset.bounds.south,
      west: preset.bounds.west,
      north: preset.bounds.north,
      east: preset.bounds.east,
    });

    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  const startFromFavorite = (fav: Favorite) => {
    setMapName(fav.name);
    setCustomMode(false);
    setBounds(fav.bounds);
    setShowResult(false);
    clearActiveHint();

    if (mapRef.current) {
      import('leaflet').then((L) => {
        const sw = toMapLatLng(fav.bounds.south, fav.bounds.west);
        const ne = toMapLatLng(fav.bounds.north, fav.bounds.east);
        mapRef.current.fitBounds(L.latLngBounds(L.latLng(sw[0], sw[1]), L.latLng(ne[0], ne[1])), {
          paddingTopLeft: [400, 20],
          paddingBottomRight: [20, 20],
          animate: true,
          duration: 1.0,
        });
      });
    }

    fetchStreets(fav.bounds);

    setIsTransitioning(true);
    setView('game');
    setGameStarted(true);

    updateURLParams({
      name: fav.name,
      south: fav.bounds.south,
      west: fav.bounds.west,
      north: fav.bounds.north,
      east: fav.bounds.east,
    });

    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  const startCustomAreaMode = () => {
    setMapName(lang === 'zh' ? '自定义区域' : 'Custom Area');
    setCustomMode(true);
    setBounds(null);
    setStreets([]);
    setGuessedCount(0);
    setShowResult(false);
    clearActiveHint();

    setIsTransitioning(true);
    setView('game');
    setGameStarted(false);

    updateURLParams({
      custom: '1',
      name: lang === 'zh' ? '自定义区域' : 'Custom Area',
    });

    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  const handleStartCustomGame = () => {
    if (!bounds) {
      alert(TRANSLATIONS[lang].alertNoBounds);
      return;
    }
    if (!mapName.trim()) {
      alert(TRANSLATIONS[lang].alertNoName);
      return;
    }
    setGameStarted(true);
    fetchStreets(bounds);
  };

  const returnToLobby = () => {
    fetchIdRef.current++;
    setLoading(false);
    setIsTransitioning(true);
    setView('lobby');
    setGameStarted(false);
    setCustomMode(false);
    setStreets([]);
    setGuessedCount(0);
    setBounds(null);
    setShowResult(false);
    clearActiveHint();

    // Clear map layers
    if (boundsLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(boundsLayerRef.current);
      boundsLayerRef.current = null;
    }
    if (drawLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(drawLayerRef.current);
      drawLayerRef.current = null;
    }
    Object.values(geojsonLayersRef.current).forEach(layer => {
      if (mapRef.current) mapRef.current.removeLayer(layer);
    });
    geojsonLayersRef.current = {};

    updateURLParams(null);

    // Refresh history & favorites list on lobby return
    fetch('/api/history').then(r => r.json()).then(d => {
      setHistory(d.history || []);
      setHighScore(d.highScore || 0);
    }).catch(console.error);

    fetch('/api/favorites').then(r => r.json()).then(d => {
      setFavorites(d.favorites || []);
    }).catch(console.error);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  const handleExitToLobby = () => {
    if (window.confirm(TRANSLATIONS[lang].confirmExit)) {
      returnToLobby();
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGuess = guess.toLowerCase().trim();
    if (!cleanGuess) return;

    let found = false;
    const updatedStreets = streets.map(street => {
      if (street.name.toLowerCase().trim() === cleanGuess) {
        if (!street.guessed) {
          found = true;
          // Reveal on map
          const layer = geojsonLayersRef.current[cleanGuess];
          if (layer) {
            layer.setStyle({ opacity: 0.8, color: '#3a5f43' }); // Dark green
            const bounds = layer.getBounds();
            mapRef.current.panTo(bounds.getCenter());
          }
          return { ...street, guessed: true };
        }
      }
      return street;
    });

    if (found) {
      const newGuessedCount = guessedCount + 1;
      setGuessedCount(newGuessedCount);
      setStreets(updatedStreets);
      setGuess('');

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }

      if (newStreak > 1) {
        confetti({
          particleCount: Math.min(30 + newStreak * 15, 180),
          spread: Math.min(40 + newStreak * 10, 100),
          origin: { y: 0.6 }
        });
      }

      if (hintClue && hintClue.name.toLowerCase().trim() === cleanGuess) {
        clearActiveHint();
      }

      if (newGuessedCount === streets.length) {
        handleEndGame();
      }
    } else {
      setStreak(0);
      setGuess('');
    }
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleEndGame = async () => {
    setShowResult(true);
    const completionRate = streets.length > 0 ? guessedCount / streets.length : 0;

    streets.forEach(street => {
      if (!street.guessed) {
        const layer = geojsonLayersRef.current[street.name.toLowerCase().trim()];
        if (layer) {
          layer.setStyle({ opacity: 0.8, color: '#8a3324' }); // Crimson for missed streets
        }
      }
    });

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapName,
          score: guessedCount,
          totalStreets: streets.length,
          completionRate,
          maxStreak,
        }),
      });
    } catch (err) {
      console.error('Failed to save score history', err);
    }
  };

  const handleSaveMap = async () => {
    if (!bounds) return;
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mapName,
          bounds,
        }),
      });
      if (res.ok) {
        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFavorite = async (id: number) => {
    await fetch(`/api/favorites?id=${id}`, { method: 'DELETE' });
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        throw new Error('Search failed');
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const place = data[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        
        if (mapRef.current) {
          const mapCoords = toMapLatLng(lat, lon);
          mapRef.current.setView(mapCoords, 14);
          
          if (place.boundingbox && place.boundingbox.length === 4) {
            const s = parseFloat(place.boundingbox[0]);
            const n = parseFloat(place.boundingbox[1]);
            const w = parseFloat(place.boundingbox[2]);
            const e = parseFloat(place.boundingbox[3]);
            import('leaflet').then((L) => {
              const sw = toMapLatLng(s, w);
              const ne = toMapLatLng(n, e);
              const boundsObj = L.latLngBounds(L.latLng(sw[0], sw[1]), L.latLng(ne[0], ne[1]));
              mapRef.current.fitBounds(boundsObj, {
                paddingTopLeft: [400, 20],
                paddingBottomRight: [20, 20],
              });
            });
          }
        }
      } else {
        alert(t.customSearchNoResults);
      }
    } catch (err) {
      console.error(err);
      alert(t.customSearchNoResults);
    } finally {
      setSearchLoading(false);
    }
  };

  const activeBadge = () => {
    const rate = streets.length > 0 ? guessedCount / streets.length : 0;
    if (rate >= 0.8) return ACHIEVEMENTS[2];
    if (rate >= 0.5) return ACHIEVEMENTS[1];
    if (rate >= 0.1) return ACHIEVEMENTS[0];
    return null;
  };

  const badgeObj = activeBadge();
  const t = TRANSLATIONS[lang];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      
      {/* Background Map View (Z-Index: 0) */}
      <section style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div id={mapContainerId} style={{ height: '100%', width: '100%' }} />

        {/* Vintage Paper Map Filter Overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle, transparent 40%, rgba(44,37,25,0.2) 100%)',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      </section>

      {/* Lobby Landing UI (Fades and scales up in transition) */}
      <div 
        className="lobby-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 10,
          background: 'radial-gradient(ellipse at top, #2c2519 0%, #1a1610 60%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem 1rem',
          overflowY: 'auto',
          transition: 'opacity 0.6s ease, transform 0.6s ease, visibility 0.6s',
          opacity: view === 'lobby' ? 1 : 0,
          transform: view === 'lobby' ? 'scale(1)' : 'scale(1.05)',
          visibility: view === 'lobby' ? 'visible' : 'hidden',
          pointerEvents: view === 'lobby' ? 'auto' : 'none',
        }}
      >
        {/* Language Toggle Button in Top Right */}
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 100,
        }}>
          <button
            onClick={toggleLanguage}
            className="vintage-btn"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
              textShadow: 'none',
            }}
          >
            {lang === 'en' ? '中文 🇨🇳' : 'English 🇬🇧'}
          </button>
        </div>

        {/* Decorative corner ornaments */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
          <div key={pos} style={{
            position: 'fixed',
            [pos.includes('top') ? 'top' : 'bottom']: '1.5rem',
            [pos.includes('left') ? 'left' : 'right']: '1.5rem',
            width: '80px', height: '80px',
            border: '2px solid rgba(197,160,89,0.3)',
            borderRadius: pos.includes('top-left') ? '60% 0 0 0' : pos.includes('top-right') ? '0 60% 0 0' : pos.includes('bottom-left') ? '0 0 0 60%' : '0 0 60% 0',
            pointerEvents: 'none',
          }} />
        ))}

        {/* Hero Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', zIndex: 1, padding: '0 1rem' }}>
          <div style={{
            fontSize: '0.75rem',
            letterSpacing: '0.4em',
            color: '#c5a059',
            fontFamily: 'var(--font-cinzel), serif',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}>{t.subtitle}</div>
          <h1 style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
            fontWeight: 900,
            color: '#f4ebd0',
            letterSpacing: '0.05em',
            lineHeight: 1.1,
            margin: '0.25rem 0',
            textShadow: '0 0 40px rgba(197,160,89,0.4)',
          }}>Financial Street</h1>
          <h1 style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
            fontWeight: 900,
            color: '#c5a059',
            letterSpacing: '0.05em',
            lineHeight: 1.1,
            margin: '0 0 0.75rem',
            textShadow: '0 0 40px rgba(197,160,89,0.6)',
          }}>Cartographer</h1>
          <p style={{
            fontFamily: 'var(--font-im-fell), Georgia, serif',
            fontStyle: 'italic',
            color: 'rgba(244,235,208,0.6)',
            fontSize: '1.1rem',
            maxWidth: '650px',
            margin: '0 auto',
            lineHeight: 1.4,
          }}>{t.desc}</p>

          {/* High Score Banner */}
          {highScore > 0 && (
            <div style={{
              display: 'inline-block',
              marginTop: '1.25rem',
              padding: '0.4rem 1.2rem',
              border: '1px solid #c5a059',
              borderRadius: '2px',
              color: '#c5a059',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-cinzel), serif',
              letterSpacing: '0.15em',
            }}>
              🏆 {t.highScore}：{highScore} {lang === 'zh' ? '条街道' : 'streets'}
            </div>
          )}
        </div>

        {/* City Preset Cards */}
        <section style={{ width: '100%', maxWidth: '1100px', zIndex: 1, marginBottom: '3rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#c5a059',
            fontSize: '0.8rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: '1.5rem',
            opacity: 0.8,
          }}>{t.selectCenter}</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1.25rem',
          }}>
            {PRESETS.map(preset => {
              const nameDisplay = lang === 'zh' ? preset.name : preset.name.split(' ').slice(1).join(' ') || preset.name;
              const subtitleDisplay = lang === 'zh' ? preset.subtitle : preset.subtitle;
              return (
                <button
                  key={preset.id}
                  id={`preset-${preset.id}`}
                  onClick={() => startGame(preset)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(244,235,208,0.08) 0%, rgba(197,160,89,0.05) 100%)',
                    border: '1px solid rgba(197,160,89,0.35)',
                    borderRadius: '4px',
                    padding: '1.75rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    color: '#f4ebd0',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(197,160,89,0.2) 0%, rgba(197,160,89,0.08) 100%)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#c5a059';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 30px rgba(197,160,89,0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(244,235,208,0.08) 0%, rgba(197,160,89,0.05) 100%)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(197,160,89,0.35)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{preset.emoji}</div>
                  <div style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    letterSpacing: '0.05em',
                    marginBottom: '0.35rem',
                  }}>{nameDisplay}</div>
                  <div style={{
                    fontFamily: 'var(--font-im-fell), Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: '0.8rem',
                    color: 'rgba(197,160,89,0.8)',
                  }}>{subtitleDisplay}</div>
                </button>
              );
            })}
          </div>

          {/* Custom area button */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              id="custom-area-btn"
              onClick={startCustomAreaMode}
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: '0.85rem',
                letterSpacing: '0.15em',
                color: 'rgba(244,235,208,0.5)',
                background: 'none',
                border: '1px dashed rgba(197,160,89,0.3)',
                padding: '0.6rem 1.8rem',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#c5a059';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#c5a059';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(244,235,208,0.5)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(197,160,89,0.3)';
              }}
            >
              {t.customArea}
            </button>
          </div>
        </section>

        {/* Lobby Map Settings & Difficulty Section */}
        <section className="vintage-panel" style={{
          width: '100%',
          maxWidth: '900px',
          zIndex: 1,
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(244,235,208,0.08) 0%, rgba(197,160,89,0.05) 100%)',
          border: '1px solid rgba(197,160,89,0.3)',
          borderRadius: '4px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#c5a059',
            fontSize: '1rem',
            letterSpacing: '0.15em',
            margin: '0 0 1.25rem 0',
            textAlign: 'center',
            textTransform: 'uppercase',
          }}>
            ⚙️ {t.mapSettingsTitle}
          </h3>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
          }}>
            {/* Difficulty Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '360px' }}>
              <label style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: '0.8rem',
                color: 'rgba(244,235,208,0.7)',
                letterSpacing: '0.1em',
                textAlign: 'center',
              }}>
                ⚖️ {t.difficultyLabel}
              </label>
              <select
                value={difficulty}
                onChange={(e) => updateDifficulty(e.target.value as any)}
                style={{
                  padding: '0.6rem 1rem',
                  background: '#1a1610',
                  color: '#f4ebd0',
                  border: '1px solid rgba(197,160,89,0.45)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-serif), serif',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <option value="easy">{t.difficultyEasy}</option>
                <option value="medium">{t.difficultyMedium}</option>
                <option value="hard">{t.difficultyHard}</option>
              </select>
            </div>
          </div>
        </section>

        {/* History & Favorites Tabs */}
        <section style={{ width: '100%', maxWidth: '900px', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: '0', marginBottom: '0', borderBottom: '1px solid rgba(197,160,89,0.3)' }}>
            {(['history', 'favorites'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  padding: '0.6rem 1.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #c5a059' : '2px solid transparent',
                  color: activeTab === tab ? '#c5a059' : 'rgba(244,235,208,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                }}
              >
                {tab === 'history' ? t.historyTab : t.favoritesTab}
              </button>
            ))}
          </div>

          <div style={{
            background: 'rgba(244,235,208,0.04)',
            border: '1px solid rgba(197,160,89,0.2)',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            minHeight: '120px',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '1rem',
          }}>
            {activeTab === 'history' && (
              history.length === 0 ? (
                <p style={{ color: 'rgba(244,235,208,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                  {t.noHistory}
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: 'rgba(197,160,89,0.7)', fontFamily: 'var(--font-cinzel), serif', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                      <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>{t.tableMap}</th>
                      <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem' }}>{t.tableScore}</th>
                      <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem' }}>{t.tableCompletion}</th>
                      <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem' }}>{t.tableStreak}</th>
                      <th style={{ textAlign: 'right', padding: '0.3rem 0.5rem' }}>{t.tableTime}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid rgba(197,160,89,0.1)', color: 'rgba(244,235,208,0.7)' }}>
                        <td style={{ padding: '0.4rem 0.5rem' }}>{h.map_name}</td>
                        <td style={{ textAlign: 'center', padding: '0.4rem 0.5rem', color: '#c5a059', fontFamily: 'var(--font-cinzel), serif' }}>{h.score}</td>
                        <td style={{ textAlign: 'center', padding: '0.4rem 0.5rem' }}>{(h.completion_rate * 100).toFixed(1)}%</td>
                        <td style={{ textAlign: 'center', padding: '0.4rem 0.5rem' }}>🔥 {h.max_streak}</td>
                        <td style={{ textAlign: 'right', padding: '0.4rem 0.5rem', fontSize: '0.75rem', opacity: 0.5 }}>
                          {new Date(h.played_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {activeTab === 'favorites' && (
              favorites.length === 0 ? (
                <p style={{ color: 'rgba(244,235,208,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                  {t.noFavorites}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {favorites.map(fav => (
                    <div key={fav.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      background: 'rgba(197,160,89,0.05)',
                      border: '1px solid rgba(197,160,89,0.15)',
                      borderRadius: '3px',
                    }}>
                      <div>
                        <span style={{ color: '#f4ebd0', fontSize: '0.9rem' }}>⭐ {fav.name}</span>
                        {fav.cityName && <span style={{ color: 'rgba(197,160,89,0.6)', fontSize: '0.75rem', marginLeft: '0.5rem', fontStyle: 'italic' }}>{fav.cityName}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => startFromFavorite(fav)}
                          style={{ background: '#c5a059', color: '#2c2519', border: 'none', borderRadius: '2px', padding: '0.25rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-cinzel), serif' }}
                        >{t.startBtn}</button>
                        <button
                          onClick={() => deleteFavorite(fav.id)}
                          style={{ background: 'none', color: 'rgba(138,51,36,0.7)', border: '1px solid rgba(138,51,36,0.4)', borderRadius: '2px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}
                        >{t.deleteBtn}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: '3rem', color: 'rgba(244,235,208,0.2)', fontSize: '0.75rem', fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.1em', zIndex: 1 }}>
          Powered by OpenStreetMap & Overpass API
        </footer>
      </div>

      {/* Control Panel / Sidebar for Active Game (Slides in from the left) */}
      <aside 
        className="vintage-panel" 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '380px',
          height: '100%',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: '1.5rem',
          borderLeft: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          borderRadius: 0,
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: view === 'game' ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: '4px 0 15px rgba(0,0,0,0.3)',
        }}
      >
        {/* Banner header */}
        <div style={{ borderBottom: '1px solid rgba(66,48,35,0.3)', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="vintage-title" style={{ fontSize: '1.25rem', color: '#2c2519', margin: '0 0 0.25rem' }}>{t.title}</h2>
            <div className="vintage-subtitle" style={{ fontSize: '0.85rem' }}>{lang === 'zh' ? 'Financial Street Cartographer' : '世界金融中心 Street Guesser'}</div>
          </div>
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="vintage-btn"
            style={{
              padding: '0.2rem 0.6rem',
              fontSize: '0.7rem',
              marginTop: '0.25rem',
              textShadow: 'none',
            }}
          >
            {lang === 'en' ? '中' : 'EN'}
          </button>
        </div>

        {/* Custom Mode Setup */}
        {customMode && !gameStarted && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 className="vintage-title" style={{ fontSize: '1rem', margin: 0 }}>{t.customSetupTitle}</h3>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#4e3629' }}>
              {t.customSetupDesc}
            </p>

            {/* City Search Bar */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-cinzel)', display: 'block' }}>{t.customSearchLabel}</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.customSearchPlaceholder}
                  disabled={searchLoading}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.5rem',
                    border: '1px solid var(--wood-border)',
                    background: '#fcfaf2',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="submit"
                  className="vintage-btn"
                  disabled={searchLoading}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    boxShadow: 'none',
                    textShadow: 'none',
                  }}
                >
                  {searchLoading ? t.customSearchLoading : t.customSearchBtn}
                </button>
              </div>
            </form>

            <div>
              <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-cinzel)', display: 'block', marginBottom: '0.4rem' }}>{t.customNameLabel}</label>
              <input
                type="text"
                value={mapName}
                onChange={e => setMapName(e.target.value)}
                placeholder={t.customNamePlaceholder}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--wood-border)',
                  background: '#fcfaf2',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <button
              onClick={handleStartCustomGame}
              className="vintage-btn"
              style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}
            >
              {t.customInitBtn}
            </button>
            <button
              onClick={returnToLobby}
              style={{
                background: 'none', border: '1px solid #8a3324', color: '#8a3324',
                padding: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-cinzel)',
                fontSize: '0.8rem',
              }}
            >
              {t.backHome}
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px', height: '40px',
              border: '3px solid rgba(197,160,89,0.3)',
              borderTop: '3px solid #c5a059',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center' }}>{t.loadingStreets}</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <button
              onClick={returnToLobby}
              style={{
                marginTop: '1.5rem',
                background: 'none', border: '1px solid rgba(66,48,35,0.4)', color: '#4e3629',
                padding: '0.4rem 1rem', cursor: 'pointer', fontFamily: 'var(--font-cinzel)',
                fontSize: '0.75rem',
              }}
            >
              {t.backHome}
            </button>
          </div>
        )}

        {/* Active Game Console */}
        {gameStarted && !loading && !showResult && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Stats area */}
            <div style={{
              background: '#e6dfc7', padding: '1rem', borderRadius: '2px',
              border: '1px solid rgba(66,48,35,0.2)', marginBottom: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--font-cinzel)' }}>{t.currentMap}:</span>
                <strong style={{ fontSize: '0.9rem' }}>{mapName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--font-cinzel)' }}>{t.guessedStreets}:</span>
                <strong style={{ fontSize: '1.1rem', color: '#3a5f43' }}>{guessedCount} / {streets.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--font-cinzel)' }}>{t.completionRate}:</span>
                <strong>{streets.length > 0 ? (guessedCount / streets.length * 100).toFixed(1) : 0}%</strong>
              </div>
            </div>

            {/* Mini Settings Selection in game */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              <select
                value={difficulty}
                onChange={(e) => updateDifficulty(e.target.value as any)}
                style={{
                  padding: '0.4rem 0.5rem',
                  background: '#fcfaf2',
                  color: 'var(--ink-dark)',
                  border: '1px solid var(--wood-border)',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-serif), serif',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <option value="easy">{lang === 'zh' ? '简单难度 (提示)' : 'Easy (Hints)'}</option>
                <option value="medium">{lang === 'zh' ? '中等难度 (首字母)' : 'Medium (Letters)'}</option>
                <option value="hard">{lang === 'zh' ? '困难难度 (无提示)' : 'Hard (Blind)'}</option>
              </select>
            </div>

            {/* Hint Clue Console Widget */}
            {difficulty !== 'hard' && (
              <div style={{
                background: '#fcfaf2',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                border: '1px solid var(--wood-border)',
                boxShadow: 'inset 0 0 10px rgba(44, 37, 25, 0.05)',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleGetHint}
                    className="vintage-btn"
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      boxShadow: 'none',
                      textShadow: 'none',
                    }}
                  >
                    {t.getHintBtn}
                  </button>
                  <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--ink-sepia)' }}>
                    {t.hintUsageText.replace('{count}', hintsUsed.toString())}
                  </span>
                </div>

                {hintClue && (
                  <div style={{
                    marginTop: '0.4rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(197, 160, 89, 0.1)',
                    borderLeft: '3px solid #c5a059',
                    fontSize: '0.85rem',
                    color: 'var(--ink-dark)',
                    fontFamily: 'monospace',
                  }}>
                    <strong style={{ fontFamily: 'var(--font-cinzel), serif', display: 'block', fontSize: '0.75rem', color: '#c5a059', marginBottom: '0.2rem' }}>
                      {t.hintClueTitle}
                    </strong>
                    <div style={{ wordBreak: 'break-all' }}>
                      {t.hintClueText.replace('{pattern}', hintClue.pattern).replace('{length}', hintClue.name.length.toString())}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Streak component */}
            <div className={`vintage-panel ${streak > 0 ? 'streak-active' : ''}`} style={{
              padding: '0.75rem', textAlign: 'center', marginBottom: '1.5rem',
              background: streak > 0 ? '#fdf8eb' : '#f4ebd0',
              transition: 'all 0.3s',
            }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', color: 'var(--ink-sepia)' }}>
                {t.currentStreak}
              </span>
              <span style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-cinzel)', color: streak > 0 ? '#c5a059' : 'var(--ink-dark)' }}>
                {streak}
              </span>
            </div>

            {/* Input Form */}
            <form onSubmit={handleGuessSubmit} style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-cinzel)', display: 'block', marginBottom: '0.4rem' }}>
                {t.inputLabel}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  ref={inputRef}
                  placeholder={t.inputPlaceholder}
                  disabled={showResult}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    border: '2px solid var(--wood-border)',
                    background: '#fcfaf2',
                    fontSize: '0.95rem',
                  }}
                />
                <button type="submit" className="vintage-btn" style={{ padding: '0 1rem' }}>{t.submitBtn}</button>
              </div>
            </form>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(66,48,35,0.15)', borderRadius: '2px', background: '#fbf8f0', padding: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-cinzel)', borderBottom: '1px solid rgba(66,48,35,0.1)', paddingBottom: '0.25rem', marginBottom: '0.5rem', color: '#c5a059' }}>
                {t.unlockedStreets} ({guessedCount})
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                {streets.filter(s => s.guessed).map((s, idx) => (
                  <li key={idx} style={{ padding: '0.2rem 0.4rem', borderBottom: '1px dashed rgba(66,48,35,0.08)', color: '#3a5f43' }}>
                    ✓ {s.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Save / Forfeit Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleSaveMap}
                  disabled={isSaved}
                  style={{
                    flex: 1, padding: '0.5rem', cursor: 'pointer',
                    border: '1px solid #c5a059', background: isSaved ? 'none' : '#c5a059',
                    color: isSaved ? '#c5a059' : '#2c2519',
                    fontFamily: 'var(--font-cinzel)', fontSize: '0.75rem',
                  }}
                >
                  {isSaved ? t.savedMapBtn : t.saveMapBtn}
                </button>
                <button
                  onClick={handleEndGame}
                  style={{
                    flex: 1, padding: '0.5rem', cursor: 'pointer',
                    border: '1px solid #8a3324', background: '#8a3324',
                    color: '#f4ebd0',
                    fontFamily: 'var(--font-cinzel)', fontSize: '0.75rem',
                  }}
                >
                  {t.forfeitBtn}
                </button>
              </div>
              <button
                onClick={handleExitToLobby}
                style={{
                  width: '100%', padding: '0.5rem', cursor: 'pointer',
                  border: '1px solid rgba(66,48,35,0.4)', background: 'none',
                  color: '#4e3629',
                  fontFamily: 'var(--font-cinzel)', fontSize: '0.75rem',
                }}
              >
                {t.backHome}
              </button>
            </div>
          </div>
        )}

        {/* Settle / Game Result Screen */}
        {showResult && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <h3 className="vintage-title" style={{ fontSize: '1.25rem', color: '#8a3324', marginBottom: '0.5rem' }}>
                {t.settleTitle}
              </h3>
              
              {/* Badge illustration depending on performance */}
              {badgeObj ? (
                <div style={{ margin: '1.5rem 0' }}>
                  <div style={{
                    width: '120px', height: '120px', margin: '0 auto',
                    borderRadius: '8px', overflow: 'hidden',
                    border: '2px solid #c5a059',
                    boxShadow: '0 4px 15px rgba(197,160,89,0.3)',
                    position: 'relative'
                  }}>
                    <img 
                      src="/achievement_badges_1779288909438.png" 
                      alt={badgeObj.name}
                      style={{
                        width: '300%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        left: badgeObj.tier === 'bronze' ? '0' : badgeObj.tier === 'silver' ? '-100%' : '-200%',
                        top: 0
                      }}
                    />
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.1rem', margin: '0.75rem 0 0.25rem', color: '#c5a059' }}>
                    {lang === 'zh' ? t[`${badgeObj.id}Badge` as keyof typeof t] : badgeObj.name}
                  </h4>
                  <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#4e3629', margin: 0 }}>
                    {t[`${badgeObj.id}Desc` as keyof typeof t]}
                  </p>
                </div>
              ) : (
                <div style={{ padding: '1.5rem 0', color: '#8a3324', fontStyle: 'italic' }}>
                  {t.badgeNotEarned}
                </div>
              )}

              <table style={{ width: '100%', marginTop: '1rem', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(66,48,35,0.1)' }}>
                    <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>{t.unlockedLabel}:</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>{guessedCount}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(66,48,35,0.1)' }}>
                    <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>{t.totalLabel}:</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>{streets.length}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(66,48,35,0.1)' }}>
                    <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>{t.exploreLabel}:</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold', color: '#8a3324' }}>
                      {streets.length > 0 ? (guessedCount / streets.length * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  {difficulty !== 'hard' && (
                    <tr style={{ borderBottom: '1px solid rgba(66,48,35,0.1)' }}>
                      <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>
                        {lang === 'zh' ? '已用提示' : 'Hints Used'}:
                      </td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold', color: '#8a3324' }}>
                        {hintsUsed}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '0.4rem', textAlign: 'left', color: 'rgba(66,48,35,0.7)' }}>{t.maxStreakLabel}:</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold', color: '#c5a059' }}>🔥 {maxStreak}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={returnToLobby}
                className="vintage-btn"
                style={{ width: '100%', padding: '0.6rem' }}
              >
                {t.backHome}
              </button>
            </div>
          </div>
        )}
      </aside>

    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#2c2519', color: '#f4ebd0' }}>
        Loading...
      </div>
    }>
      <GameApp />
    </Suspense>
  );
}
