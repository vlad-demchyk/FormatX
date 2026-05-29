/**
 * Централізований контролер анімації видалення елементів
 * (слайд + fade + shrink) та схлопування контейнера (знизу вгору).
 *
 * Архітектурне рішення описане в `docs/uk/ANIMATION.md`.
 *
 * Фази: idle → removing → collapsing → idle
 *
 * Використання:
 *   const ctrl = new AnimationController({ onRemove, onCollapseEnd });
 *   ctrl.startRemove(id);
 *   ctrl.isRemoving(id);
 *   ctrl.endRemove(id);   // викликається з onAnimationEnd
 *   ctrl.phase            // 'idle' | 'removing' | 'collapsing'
 */

export type AnimPhase = "idle" | "removing" | "collapsing";

export interface AnimCallbacks {
  /** Викликається коли анімація видалення елемента завершена */
  onRemove: (id: string) => void;
  /** Викликається коли анімація схлопування контейнера завершена */
  onCollapseEnd: () => void;
}

export interface AnimConfig {
  /** Затримка між стартом анімацій елементів (stagger), ms — за замовчуванням 80 */
  staggerMs?: number;
  /** Тривалість анімації видалення, ms — за замовчуванням 450 */
  removeMs?: number;
  /** Тривалість анімації схлопування, ms — за замовчуванням 400 */
  collapseMs?: number;
}

type Listener = () => void;

export class AnimationController {
  private removing = new Set<string>();
  private _phase: AnimPhase = "idle";
  private readonly config: Required<AnimConfig>;
  private readonly listeners = new Set<Listener>();
  private callbacks: AnimCallbacks;
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: AnimCallbacks, config?: AnimConfig) {
    this.callbacks = callbacks;
    this.config = {
      staggerMs: config?.staggerMs ?? 80,
      removeMs: config?.removeMs ?? 450,
      collapseMs: config?.collapseMs ?? 400,
    };
  }

  /** Оновити колбеки (наприклад при ре-рендері батьківського компонента) */
  updateCallbacks(callbacks: AnimCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Підписатися на зміни стану */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  /* ── Геттери ── */

  get phase(): AnimPhase {
    return this._phase;
  }

  get removingCount(): number {
    return this.removing.size;
  }

  isRemoving(id: string): boolean {
    return this.removing.has(id);
  }

  /* ── Управління анімацією ── */

  /**
   * Почати анімацію видалення елемента.
   * Викликається при кліку на кнопку видалення.
   */
  startRemove(id: string): void {
    this.removing.add(id);
    this._phase = "removing";
    this.notify();
  }

  /**
   * Анімоване очищення всіх елементів (clear queue).
   * Кожен елемент стартує зі stagger-затримкою.
   */
  clearAll(ids: string[]): void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      // Використовуємо setTimeout для stagger-ефекту
      setTimeout(() => {
        this.startRemove(id);
      }, i * this.config.staggerMs);
    }
  }

  /**
   * Завершити анімацію видалення елемента.
   * Викликається з `onAnimationEnd` на DOM-елементі.
   * Після завершення всіх видалень автоматично запускає схлопування.
   */
  endRemove(id: string): void {
    this.removing.delete(id);
    this.callbacks.onRemove(id);
    this.notify();

    // Якщо всі елементи видалені — запускаємо схлопування
    if (this.removing.size === 0 && this._phase === "removing") {
      this._phase = "collapsing";
      this.notify();

      this.collapseTimer = setTimeout(() => {
        this._phase = "idle";
        this.callbacks.onCollapseEnd();
        this.notify();
        this.collapseTimer = null;
      }, this.config.collapseMs);
    }
  }

  /** Скинути всі анімації (наприклад при екстреному очищенні) */
  reset(): void {
    if (this.collapseTimer !== null) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    this.removing.clear();
    this._phase = "idle";
    this.notify();
  }
}
