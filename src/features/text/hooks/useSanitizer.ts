import { useCallback, useEffect, useRef, useState } from "react";
import {
  sanitize,
  sanitizeClasses,
  trimAndSanitize,
  type SanitizeOptions,
} from "../../sanitizer/logic";
import { getSettings, saveSettings } from "../../../lib/db";
import type { AppSettings, SanitizerSettings } from "../../../lib/db";

export interface SanitizerState {
  options: SanitizeOptions;
  input: string;
  output: string;
  classInput: string;
  classOutput: string;
}

function optionsFromSettings(s: SanitizerSettings): SanitizeOptions {
  return { ...s };
}

function settingsFromOptions(o: SanitizeOptions): SanitizerSettings {
  return { ...o };
}

const defaults: SanitizerState = {
  options: {
    mode: "replace",
    formatMode: "titleCase",
    charToReplace: "/",
    replaceWith: "space",
    spacing: "none",
    removeArgs: 0,
    removeTrailing: 0,
  },
  input: "",
  output: "",
  classInput: "",
  classOutput: "",
};

export function useSanitizer() {
  const [state, setState] = useState<SanitizerState>(defaults);
  const [ready, setReady] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load persisted options on mount
  useEffect(() => {
    void getSettings().then((s: AppSettings) => {
      setState((prev) => {
        const options = optionsFromSettings(s.sanitizer);
        return { ...prev, options, output: sanitize(prev.input, options) };
      });
      setReady(true);
    });
  }, []);

  // Persist options whenever they change (debounced 300ms)
  useEffect(() => {
    if (!ready) return;
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => {
      void getSettings().then((s: AppSettings) => {
        s.sanitizer = settingsFromOptions(state.options);
        return saveSettings(s);
      });
    }, 300);
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, [state.options, ready]);

  const updateOptions = useCallback((patch: Partial<SanitizeOptions>) => {
    setState((prev) => {
      const next = { ...prev, options: { ...prev.options, ...patch } };
      return { ...next, output: sanitize(next.input, next.options) };
    });
  }, []);

  const updateInput = useCallback((input: string) => {
    setState((prev) => ({
      ...prev,
      input,
      output: sanitize(input, prev.options),
    }));
  }, []);

  const updateClassInput = useCallback((classInput: string) => {
    setState((prev) => ({
      ...prev,
      classInput,
      classOutput: sanitizeClasses(classInput),
    }));
  }, []);

  const convert = useCallback(() => {
    setState((prev) => ({
      ...prev,
      output: sanitize(prev.input, prev.options),
      classOutput: sanitizeClasses(prev.classInput),
    }));
  }, []);

  const getConvertResult = useCallback(
    () => sanitize(state.input, state.options),
    [state.input, state.options],
  );

  const getTrimResult = useCallback(
    () => trimAndSanitize(state.input, state.options),
    [state.input, state.options],
  );

  const getClassResult = useCallback(
    () => sanitizeClasses(state.classInput),
    [state.classInput],
  );

  return {
    state,
    ready,
    updateOptions,
    updateInput,
    updateClassInput,
    convert,
    getConvertResult,
    getTrimResult,
    getClassResult,
  };
}
