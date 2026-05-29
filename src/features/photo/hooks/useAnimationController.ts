import { useEffect, useRef, useState } from "react";
import {
  AnimationController,
  type AnimCallbacks,
  type AnimConfig,
} from "../../../lib/animation/AnimationController";

/**
 * React-обгортка над AnimationController.
 * Архітектурне рішення: `docs/uk/ANIMATION.md`.
 *
 * @example
 * ```tsx
 * const ctrl = useAnimationController(
 *   { onRemove, onCollapseEnd },
 *   { staggerMs: 80 },
 * );
 * ```
 */
export function useAnimationController(
  callbacks: AnimCallbacks,
  config?: AnimConfig,
): AnimationController {
  const [, tick] = useState(0);
  const ctrlRef = useRef<AnimationController | null>(null);

  if (!ctrlRef.current) {
    ctrlRef.current = new AnimationController(callbacks, config);
  }

  // Оновлювати колбеки при кожному ре-рендері
  ctrlRef.current.updateCallbacks(callbacks);

  useEffect(() => {
    const ctrl = ctrlRef.current!;
    return ctrl.subscribe(() => tick((n) => n + 1));
  }, []);

  return ctrlRef.current;
}
