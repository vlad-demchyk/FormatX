import { useCallback, useState } from "react";
import {
  sanitize,
  sanitizeClasses,
  trimAndSanitize,
  type SanitizeOptions,
} from "../../sanitizer/logic";

export interface SanitizerState {
  options: SanitizeOptions;
  input: string;
  output: string;
  classInput: string;
  classOutput: string;
}

const defaults: SanitizerState = {
  options: { charToReplace: "/", replaceWith: "space", spacing: "none", removeArgs: 0 },
  input: "",
  output: "",
  classInput: "",
  classOutput: "",
};

export function useSanitizer() {
  const [state, setState] = useState<SanitizerState>(defaults);

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
    updateOptions,
    updateInput,
    updateClassInput,
    convert,
    getConvertResult,
    getTrimResult,
    getClassResult,
  };
}
