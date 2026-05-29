# Система анімації FormatX

## Огляд

`AnimationController` — централізований клас для керування анімацією
видалення елементів (слайд + fade + shrink) та схлопуванням контейнера
(знизу вгору). Розташований у `src/lib/animation/AnimationController.ts`.

React-обгортка: `src/features/photo/hooks/useAnimationController.ts`.

---

## Архітектурні рішення

### Чому клас, а не хук?

Анімація — це стан, який існує незалежно від React-рендерів.
Клас дозволяє тримати логіку в чистому JS і не залежати від
життєвого циклу компонента.

Один екземпляр класу можна перевикористовувати в різних
компонентах (список черги, список конвертації, тощо), просто
обгорнувши його в хук `useAnimationController`.

### Фазова модель (idle → removing → collapsing)

```
idle ──── startRemove(id) ────→ removing ──── всі endRemove ────→ collapsing ──── таймер ────→ idle
```

- **`idle`** — немає активних анімацій, контейнер стабільний.
- **`removing`** — один або більше елементів анімують видалення.
  Фаза триває, доки всі елементи не завершать CSS-анімацію.
- **`collapsing`** — після видалення останнього елемента контейнер
  схлопується знизу вгору (CSS `animation`). Після завершення —
  автоматичний перехід в `idle`.

Така модель дозволяє батьківському компоненту реагувати на
фази через `phase` геттер і підсвічувати потрібні CSS-класи.

### Чому CSS Animation, а не Transition?

- `@keyframes` дає точний контроль над ключовими кадрами
  (слайд, fade, shrink), що неможливо з transitions.
- Анімація запускається додаванням/видаленням CSS-класу —
  `onAnimationEnd` на DOM-елементі сигналізує про завершення.
- Така архітектура дозволяє змінювати візуальний ефект без
  зміни TypeScript-логіки.

### Колбеки

- **`onRemove(id)`** — викликається після завершення CSS-анімації
  елемента. Дозволяє відкласти реальне видалення зі стану
  (React `setState`) до моменту, коли анімація відтворилась.
- **`onCollapseEnd()`** — викликається після схлопування контейнера.
  Дозволяє приховати/розмонтувати контейнер після анімації.
- Розділення "почати анімацію" і "завершити видалення" дає
  змогу контролеру керувати чергою анімацій, а колбекам —
  виконувати бізнес-логіку (оновити стан, скоригувати індекс).

### Stagger (затримка між елементами)

`staggerMs` визначає затримку між стартом анімацій сусідніх
елементів. Наприклад, при масовому видаленні кожен наступний
елемент починає анімацію на `staggerMs` пізніше.

`clearAll(ids)` — анімоване очищення всіх елементів черги.
Кожен елемент стартує зі stagger-затримкою через `setTimeout`.
Після завершення всіх анімацій автоматично запускається
схлопування контейнера.

---

## Типова послідовність викликів

```
1. Клік × → startRemove(id)
   → CSS клас `.is-removing` додається
   → CSS animation «removeItem» запускається

2. animationend → endRemove(id)
   → onRemove(id) — реальне видалення зі стейту
   → Якщо це був останній елемент → phase = 'collapsing'
     → CSS клас `.is-collapsing` додається контейнеру
     → CSS animation «collapseCard» запускається

3. setTimeout(collapseMs) → phase = 'idle'
   → onCollapseEnd() — контейнер ховається
```

---

## CSS-анімації

### `removeItem` — видалення елемента

```css
@keyframes addItem {
  0%   { opacity: 0; transform: translateY(-6px) scaleY(0.92);
         max-height: 0; margin: 0; padding: 0; border-width: 0; }
  60%  { opacity: 0.8; }
  100% { opacity: 1; transform: translateY(0) scaleY(1); }
}
```

- Застосовується на `.images-item` за замовчуванням
- Відтворюється один раз при монтуванні DOM-елемента
- React створює новий DOM-вузол тільки для нових `item.id` (key),
  тому анімація не повторюється при ре-рендерах

### `removeItem` — видалення елемента

```css
@keyframes removeItem {
  0%   { transform: translateX(0);      opacity: 1;    filter: blur(0); }
  30%  { transform: translateX(-25%);   opacity: 1;    filter: blur(0); }
  60%  { transform: translateX(-60%);   opacity: 0.4;  filter: blur(1.5px); }
  100% { transform: translateX(-100%);  opacity: 0;    filter: blur(4px);
         max-height: 0; margin: 0; padding: 0; border-width: 0; }
}
```

- 0–30%: слайд вліво, без змін
- 30–60%: слайд продовжується, з'являється blur
- 60–100%: фінальний слайд + blur + обнулення розмірів

### `collapseCard` — схлопування контейнера

```css
@keyframes collapseCard {
  0%   { opacity: 1;    filter: blur(0);   transform: scaleY(1) translateY(0); }
  40%  { opacity: 0.5;  filter: blur(2px); transform: scaleY(0.5) translateY(-10px); }
  100% { opacity: 0;    filter: blur(6px); transform: scaleY(0) translateY(-25px);
         max-height: 0; margin: 0; padding: 0; }
}
```

- `scaleY(1→0)` з `transform-origin: top` — верх залишається на місці,
  низ піднімається догори.
- `translateY(0→-25px)` — зміщення вгору.
- `filter: blur(0→6px)` — плавне розмиття.
- `opacity` згасає паралельно.

---

## Використання з React

```tsx
const ctrl = useAnimationController(
  {
    onRemove: (id) => removeItem(id),
    onCollapseEnd: () => setShowCards(false),
  },
  { staggerMs: 80, removeMs: 450, collapseMs: 400 },
);

// В JSX:
<div className={`images-item${ctrl.isRemoving(id) ? ' is-removing' : ''}`}
     onAnimationEnd={() => ctrl.isRemoving(id) && ctrl.endRemove(id)} />

// Контейнер:
<div className={`card resize-collapse${ctrl.phase === 'collapsing' ? ' is-collapsing' : ''}`} />
```

### Чому ref + forceUpdate, а не useState?

`AnimationController` — це клас, його стан (Set, phase) існує
в пам'яті незалежно від React. Якщо зберігати сам стан в
`useState`, доведеться дублювати й синхронізувати — це
призведе до багів при одночасних анімаціях.

`useRef` тримає єдиний екземпляр контролера протягом життя
компонента. `forceUpdate` (через лічильник) лише каже React
перерендеритись, коли контролер сповіщає про зміну.

### Чому `updateCallbacks`?

`callbacks` (`onRemove`, `onCollapseEnd`) залежать від поточних
пропсів/стейту компонента. При кожному ре-рендері ми оновлюємо
колбеки в контролері, щоб він викликав актуальні версії.
