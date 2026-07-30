import { useCallback, useEffect, useRef, useState } from "react";

import {
  limitSearchInput,
  normalizeSearchQuery,
  SEARCH_DEBOUNCE_MS,
  SEARCH_QUERY_MAX_LENGTH,
} from "@/lib/search";

interface UseDebouncedSearchOptions {
  initialValue?: string;
  delayMs?: number;
  maxLength?: number;
  onDebouncedChange?: (query: string) => void;
}

interface UseDebouncedSearchResult {
  value: string;
  debouncedValue: string;
  isDebouncing: boolean;
  onChange: (value: string) => void;
  commit: (value?: string) => string;
  clear: () => string;
}

export function useDebouncedSearch({
  initialValue = "",
  delayMs = SEARCH_DEBOUNCE_MS,
  maxLength = SEARCH_QUERY_MAX_LENGTH,
  onDebouncedChange,
}: UseDebouncedSearchOptions = {}): UseDebouncedSearchResult {
  const normalizedInitialValue = limitSearchInput(initialValue, maxLength);
  const [value, setValue] = useState(normalizedInitialValue);
  const [debouncedValue, setDebouncedValue] = useState(() =>
    normalizeSearchQuery(normalizedInitialValue, maxLength),
  );
  const callbackRef = useRef(onDebouncedChange);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  useEffect(() => {
    const nextValue = limitSearchInput(initialValue, maxLength);
    const nextQuery = normalizeSearchQuery(nextValue, maxLength);

    setValue((currentValue) =>
      currentValue === nextValue ? currentValue : nextValue,
    );
    setDebouncedValue((currentQuery) =>
      currentQuery === nextQuery ? currentQuery : nextQuery,
    );
  }, [initialValue, maxLength]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const nextQuery = normalizeSearchQuery(value, maxLength);
    if (nextQuery === debouncedValue) {
      return;
    }

    timerRef.current = setTimeout(() => {
      setDebouncedValue(nextQuery);
      callbackRef.current?.(nextQuery);
      timerRef.current = null;
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [debouncedValue, delayMs, maxLength, value]);

  const onChange = useCallback(
    (nextValue: string) => {
      setValue(limitSearchInput(nextValue, maxLength));
    },
    [maxLength],
  );

  const commit = useCallback(
    (nextValue = value) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const limitedValue = limitSearchInput(nextValue, maxLength);
      const nextQuery = normalizeSearchQuery(limitedValue, maxLength);
      setValue(limitedValue);
      setDebouncedValue(nextQuery);
      callbackRef.current?.(nextQuery);
      return nextQuery;
    },
    [maxLength, value],
  );

  const clear = useCallback(() => commit(""), [commit]);

  return {
    value,
    debouncedValue,
    isDebouncing: normalizeSearchQuery(value, maxLength) !== debouncedValue,
    onChange,
    commit,
    clear,
  };
}
