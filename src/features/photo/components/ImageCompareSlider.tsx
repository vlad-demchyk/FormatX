import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  /** URL of the "before" image (original) */
  beforeSrc: string;
  /** URL of the "after" image (resized) */
  afterSrc: string;
  /** Label shown above the before side */
  beforeLabel: string;
  /** Label shown above the after side */
  afterLabel: string;
  /** Before size text */
  beforeSize: string;
  /** After size text */
  afterSize: string;
}

/**
 * Side-by-side image comparison with a draggable vertical divider.
 */
export function ImageCompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  beforeSize,
  afterSize,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50); // percentage from left
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    draggingRef.current = true;
  }, []);

  useEffect(() => {
    const onMove = (clientX: number) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      setPosition((x / rect.width) * 100);
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0]!.clientX);

    const onUp = () => { draggingRef.current = false; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  return (
    <div className="img-compare" ref={containerRef}>
      {/* After image defines container size (positioned normally) */}
      <img src={afterSrc} alt="after" className="img-compare__sizer" draggable={false} />

      {/* After label */}
      <span className="img-compare__label img-compare__label--after">{afterLabel} · {afterSize}</span>

      {/* Before label (outside clipped container so background isn't cut) */}
      <span className="img-compare__label img-compare__label--before">{beforeLabel} · {beforeSize}</span>

      {/* Before (clipped on the right by the divider position) */}
      <div
        className="img-compare__before"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={beforeSrc} alt="before" className="img-compare__img" draggable={false} />
      </div>

      {/* Draggable divider */}
      <div
        className="img-compare__divider"
        style={{ left: `${position}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="img-compare__handle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
