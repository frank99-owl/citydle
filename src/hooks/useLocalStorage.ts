import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // Read initial value from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, [key]);

  // Sync across tabs via the `storage` event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        if (e.newValue === null) {
          setValue(defaultValue);
        } else {
          setValue(JSON.parse(e.newValue));
        }
      } catch {
        setValue(defaultValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, defaultValue]);

  const setStoredValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch {
        // ignore storage errors
      }
    },
    [key],
  );

  return [value, setStoredValue];
}
