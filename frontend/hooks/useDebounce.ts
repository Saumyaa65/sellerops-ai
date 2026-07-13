"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced version of the value that only updates
 * after the specified delay has elapsed without a new value.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
