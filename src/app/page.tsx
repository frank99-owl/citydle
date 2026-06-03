'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { PRESETS } from '@/lib/constants';
import { TRANSLATIONS, Language } from '@/lib/i18n';
import { Bounds, HistoryEntry, Favorite, MapProvider, Difficulty, View } from '@/types';

// Hooks
import { useMapProvider } from '@/hooks/useMapProvider';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import { useStreets } from '@/hooks/useStreets';
import { useGameLogic } from '@/hooks/useGameLogic';

// Components
import { GameMap } from '@/components/map/GameMap';
import { LobbyOverlay } from '@/components/lobby/LobbyOverlay';
import { GameSidebar } from '@/components/game/GameSidebar';
import { SettlementView } from '@/components/settlement/SettlementView';

function GameApp() {
  const searchParams = useSearchParams();

  // Language state
  const [lang, setLang] = useState<Language>('en');

  // Lobby records lists
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // Determine initial states based on query parameters
  const hasBoundsParams = searchParams.get('south') && searchParams.get('west') && searchParams.get('north') && searchParams.get('east');
  const isCustomParam = searchParams.get('custom') === '1';

  // Navigation / View State
  const [view, setView] = useState<View>((hasBoundsParams || isCustomParam) ? 'game' : 'lobby');
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

  // Custom mode location search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Initialize hooks
  const {
    mapProvider,
    updateMapProvider,
    toMapLatLng,
    toGameLatLng,
    convertCoordinate,
    getTileConfig,
    prevProviderRef,
  } = useMapProvider();

  const {
    mapRef,
    mapContainerId,
    mapLoaded,
    drawBounds,
    fitToBounds,
    drawStreets,
    revealStreet,
    revealMissedStreets,
    drawHint,
    clearHint,
    clearAllLayers,
    setupDrawing,
    syncTileLayer,
    shiftMapCenter,
  } = useLeafletMap({ toMapLatLng });

  const {
    streets,
    streetsRef,
    loading,
    fetchStreets,
    updateStreetGuessed,
    clearStreets,
    cancelFetch,
  } = useStreets(lang);

  const {
    guess,
    setGuess,
    guessedCount,
    streak,
    maxStreak,
    showResult,
    setShowResult,
    isSaved,
    setIsSaved,
    hintsUsed,
    hintClue,
    hintClueRef,
    difficulty,
    difficultyRef,
    showResultRef,
    loadDifficulty,
    updateDifficulty,
    getHint: getGameHint,
    clearHint: clearGameHint,
    checkGuess,
    endGame,
    resetGame,
    calculateBadge,
  } = useGameLogic();

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
    loadDifficulty();
  }, [loadDifficulty]);

  // Toggle language
  const toggleLanguage = useCallback(() => {
    const newLang = lang === 'en' ? 'zh' : 'en';
    setLang(newLang);
    localStorage.setItem('cartographer_lang', newLang);
  }, [lang]);

  // Update URL params
  const updateURLParams = useCallback((params: { name?: string; south?: number; west?: number; north?: number; east?: number; custom?: string } | null) => {
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
  }, []);

  // Fetch history & favorites list
  const fetchHistoryAndFavorites = useCallback(() => {
    fetch('/api/history').then(r => r.json()).then(d => {
      setHistory(d.history || []);
      setHighScore(d.highScore || 0);
    }).catch(console.error);

    fetch('/api/favorites').then(r => r.json()).then(d => {
      setFavorites(d.favorites || []);
    }).catch(console.error);
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchHistoryAndFavorites();
  }, [fetchHistoryAndFavorites]);

  // Sync tile layer when provider changes
  useEffect(() => {
    const config = getTileConfig();
    syncTileLayer(config.url, config.options);
  }, [mapProvider, mapLoaded, getTileConfig, syncTileLayer]);

  // Redraw layers when mapProvider or difficulty changes
  useEffect(() => {
    if (!mapLoaded) return;

    // Shift map center when provider changes
    shiftMapCenter(prevProviderRef.current, mapProvider, convertCoordinate);
    prevProviderRef.current = mapProvider;

    // Redraw bounds and streets
    drawBounds(bounds);
    drawStreets(streets, showResult);

    // Redraw hint if active
    if (hintClue && hintClue.geom && difficulty === 'easy') {
      drawHint(hintClue.geom);
    } else {
      clearHint();
    }
  }, [mapProvider, mapLoaded, difficulty, bounds, streets, showResult, hintClue, drawBounds, drawStreets, drawHint, clearHint, shiftMapCenter, convertCoordinate, prevProviderRef]);

  // Fit to bounds when bounds change
  useEffect(() => {
    if (bounds) {
      fitToBounds(bounds);
      drawBounds(bounds);
    }
  }, [bounds, fitToBounds, drawBounds]);

  // Setup Geoman drawing for custom mode
  useEffect(() => {
    const enabled = view === 'game' && customMode && !gameStarted;
    setupDrawing(enabled, (drawnBounds) => {
      setBounds(drawnBounds);
    }, mapProvider);
  }, [view, customMode, gameStarted, mapLoaded, setupDrawing, mapProvider]);

  // Handle hint with map drawing
  const handleGetHint = useCallback(() => {
    const hint = getGameHint(streets);
    if (hint && hint.geom && difficulty === 'easy') {
      drawHint(hint.geom);
    }
  }, [getGameHint, streets, difficulty, drawHint]);

  // Handle guess submit with map reveal
  const handleGuessSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    checkGuess(
      guess,
      streets,
      revealStreet,
      (streak) => {
        confetti({
          particleCount: Math.min(30 + streak * 15, 180),
          spread: Math.min(40 + streak * 10, 100),
          origin: { y: 0.6 }
        });
      },
      endGame
    );
  }, [checkGuess, guess, streets, revealStreet, endGame]);

  // Handle end game
  const handleEndGame = useCallback(async () => {
    endGame();
    revealMissedStreets(streets);

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapName,
          score: guessedCount,
          totalStreets: streets.length,
          completionRate: streets.length > 0 ? guessedCount / streets.length : 0,
          maxStreak,
        }),
      });
    } catch (err) {
      console.error('Failed to save score history', err);
    }
  }, [endGame, revealMissedStreets, streets, mapName, guessedCount, maxStreak]);

  // Start game with preset
  const startGame = useCallback((preset: typeof PRESETS[0]) => {
    const presetName = lang === 'zh' ? preset.name.split(' ')[0] : preset.name.split(' ').slice(1).join(' ') || preset.name;
    setMapName(presetName);
    setCustomMode(false);
    setBounds(preset.bounds);
    setShowResult(false);
    clearGameHint();
    clearHint();

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

    setTimeout(() => setIsTransitioning(false), 600);
  }, [lang, clearGameHint, clearHint, fetchStreets, updateURLParams]);

  // Start from favorite
  const startFromFavorite = useCallback((fav: Favorite) => {
    setMapName(fav.name);
    setCustomMode(false);
    setBounds(fav.bounds);
    setShowResult(false);
    clearGameHint();
    clearHint();

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

    setTimeout(() => setIsTransitioning(false), 600);
  }, [clearGameHint, clearHint, fetchStreets, updateURLParams]);

  // Start custom area mode
  const startCustomAreaMode = useCallback(() => {
    setMapName(lang === 'zh' ? '自定义区域' : 'Custom Area');
    setCustomMode(true);
    setBounds(null);
    clearStreets();
    setShowResult(false);
    clearGameHint();
    clearHint();

    setIsTransitioning(true);
    setView('game');
    setGameStarted(false);

    updateURLParams({
      custom: '1',
      name: lang === 'zh' ? '自定义区域' : 'Custom Area',
    });

    setTimeout(() => setIsTransitioning(false), 600);
  }, [lang, clearStreets, clearGameHint, clearHint, updateURLParams]);

  // Handle start custom game
  const handleStartCustomGame = useCallback(() => {
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
  }, [bounds, mapName, lang, fetchStreets]);

  // Return to lobby
  const returnToLobby = useCallback(() => {
    cancelFetch();
    setIsTransitioning(true);
    setView('lobby');
    setGameStarted(false);
    setCustomMode(false);
    clearStreets();
    setShowResult(false);
    resetGame();
    clearAllLayers();

    updateURLParams(null);
    fetchHistoryAndFavorites();

    setTimeout(() => setIsTransitioning(false), 600);
  }, [cancelFetch, clearStreets, resetGame, clearAllLayers, updateURLParams, fetchHistoryAndFavorites]);

  // Handle exit to lobby with confirmation
  const handleExitToLobby = useCallback(() => {
    if (window.confirm(TRANSLATIONS[lang].confirmExit)) {
      returnToLobby();
    }
  }, [lang, returnToLobby]);

  // Save map to favorites
  const handleSaveMap = useCallback(async () => {
    if (!bounds) return;
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: mapName, bounds }),
      });
      if (res.ok) {
        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, [bounds, mapName, setIsSaved]);

  // Delete favorite
  const deleteFavorite = useCallback(async (id: number) => {
    await fetch(`/api/favorites?id=${id}`, { method: 'DELETE' });
    setFavorites(prev => prev.filter(f => f.id !== id));
  }, []);

  // Handle search submit
  const handleSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
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
        alert(TRANSLATIONS[lang].customSearchNoResults);
      }
    } catch (err) {
      console.error(err);
      alert(TRANSLATIONS[lang].customSearchNoResults);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, lang, toMapLatLng, mapRef]);

  // Calculate badge
  const badge = calculateBadge(streets.length);
  const t = TRANSLATIONS[lang];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>

      {/* Background Map View */}
      <GameMap mapContainerId={mapContainerId} />

      {/* Lobby Landing UI */}
      <LobbyOverlay
        lang={lang}
        view={view}
        presets={PRESETS}
        history={history}
        highScore={highScore}
        favorites={favorites}
        mapProvider={mapProvider}
        difficulty={difficulty}
        onToggleLanguage={toggleLanguage}
        onSelectPreset={startGame}
        onStartCustom={startCustomAreaMode}
        onStartFavorite={startFromFavorite}
        onDeleteFavorite={deleteFavorite}
        onProviderChange={updateMapProvider}
        onDifficultyChange={updateDifficulty}
      />

      {/* Game Sidebar */}
      <GameSidebar
        lang={lang}
        view={view}
        customMode={customMode}
        gameStarted={gameStarted}
        loading={loading}
        showResult={showResult}
        mapName={mapName}
        streets={streets}
        guessedCount={guessedCount}
        streak={streak}
        guess={guess}
        isSaved={isSaved}
        hintsUsed={hintsUsed}
        hintClue={hintClue}
        difficulty={difficulty}
        mapProvider={mapProvider}
        searchQuery={searchQuery}
        searchLoading={searchLoading}
        onToggleLanguage={toggleLanguage}
        onGuessChange={setGuess}
        onGuessSubmit={handleGuessSubmit}
        onGetHint={handleGetHint}
        onSave={handleSaveMap}
        onForfeit={handleEndGame}
        onExit={handleExitToLobby}
        onBackToLobby={returnToLobby}
        onStartCustomGame={handleStartCustomGame}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onMapNameChange={setMapName}
        onDifficultyChange={updateDifficulty}
        onMapProviderChange={updateMapProvider}
      />

      {/* Settlement View (inside sidebar when showing results) */}
      {showResult && (
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
            boxShadow: '4px 0 15px rgba(0,0,0,0.3)',
          }}
        >
          <SettlementView
            lang={lang}
            streets={streets}
            guessedCount={guessedCount}
            maxStreak={maxStreak}
            hintsUsed={hintsUsed}
            difficulty={difficulty}
            badge={badge}
            onBackToLobby={returnToLobby}
          />
        </aside>
      )}

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
