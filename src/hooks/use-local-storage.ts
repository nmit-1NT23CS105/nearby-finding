"use client";

import { useEffect, useRef, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue);
  const [state, setState] = useState<T>(initialRef.current);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setState(JSON.parse(item));
      } else {
        setState(initialRef.current);
      }
    } catch {
      setState(initialRef.current);
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state, isHydrated]);

  return [state, setState, isHydrated] as const;
}
