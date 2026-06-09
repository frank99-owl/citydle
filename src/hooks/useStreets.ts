import { useState, useCallback, useRef } from "react";
import { Street, Bounds } from "@/types";
import { TRANSLATIONS, Language } from "@/lib/i18n";

export function useStreets(
  lang: Language,
  onError?: (message: string) => void,
) {
  const [streets, setStreets] = useState<Street[]>([]);
  const [loading, setLoading] = useState(false);
  const [noStreetsFound, setNoStreetsFound] = useState(false);
  const fetchIdRef = useRef(0);
  const streetsRef = useRef<Street[]>([]);

  const fetchStreets = useCallback(
    async (targetBounds: Bounds): Promise<Street[]> => {
      setLoading(true);
      setNoStreetsFound(false);
      const currentFetchId = ++fetchIdRef.current;

      try {
        const res = await fetch("/api/streets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bounds: targetBounds }),
        });
        const data = await res.json();

        if (currentFetchId !== fetchIdRef.current) return [];

        if (data.error) {
          onError?.(TRANSLATIONS[lang].alertFetchFail);
          return [];
        }

        const formattedStreets: Street[] = (data.streets || []).map(
          (s: any) => ({
            name: s.name,
            guessed: false,
            geometry: s.geometry,
            aliases: s.aliases,
          }),
        );

        if (formattedStreets.length === 0) {
          setNoStreetsFound(true);
        }

        setStreets(formattedStreets);
        streetsRef.current = formattedStreets;
        return formattedStreets;
      } catch (err) {
        if (currentFetchId !== fetchIdRef.current) return [];
        console.error(err);
        onError?.(TRANSLATIONS[lang].alertFetchFail);
        return [];
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [lang, onError],
  );

  const updateStreetGuessed = useCallback((name: string) => {
    setStreets((prev) => {
      const updated = prev.map((s) =>
        s.name.toLowerCase().trim() === name.toLowerCase().trim()
          ? { ...s, guessed: true }
          : s,
      );
      streetsRef.current = updated;
      return updated;
    });
  }, []);

  const clearStreets = useCallback(() => {
    setStreets([]);
    streetsRef.current = [];
  }, []);

  const cancelFetch = useCallback(() => {
    fetchIdRef.current++;
  }, []);

  return {
    streets,
    streetsRef,
    loading,
    noStreetsFound,
    fetchStreets,
    updateStreetGuessed,
    clearStreets,
    cancelFetch,
  };
}
