"use client";

import { useSyncExternalStore, useCallback } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-storage", callback);
  };
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (val: T | ((prev: T) => T)) => void] {
  const getSnapshot = useCallback(() => {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let value: T = initialValue;
  if (raw !== null) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = initialValue;
    }
  }

  const setValue = useCallback(
    (action: T | ((prev: T) => T)) => {
      try {
        if (typeof window === "undefined") return;
        const currentItem = window.localStorage.getItem(key);
        let currentVal = initialValue;
        if (currentItem !== null) {
          try {
            currentVal = JSON.parse(currentItem);
          } catch {
            currentVal = initialValue;
          }
        }
        const nextVal = action instanceof Function ? action(currentVal) : action;
        window.localStorage.setItem(key, JSON.stringify(nextVal));
        window.dispatchEvent(new Event("local-storage"));
      } catch (err) {
        console.warn(`Error updating localStorage key "${key}":`, err);
      }
    },
    [key, initialValue]
  );

  return [value, setValue];
}
