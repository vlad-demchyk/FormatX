# Дизайн-система та CSS

## Архітектура CSS

FormatX використовує модульну CSS архітектуру з чітким розділенням за зонами відповідальності.

```
styles/
├── tokens.css              # Дизайн-токени (кольори, типографіка, відступи, анімації, z-index)
├── base.css                # Reset, body, кастомний scrollbar
├── app.css                 # Barrel: @import усіх файлів
├── layout/
│   ├── shell.css           # Shell layout: header, tabs, main, responsive media-queries
│   └── viewer.css          # Doc viewer: селектор, контент, MD рендеринг, WASM loading
├── components/
│   ├── buttons.css         # Кнопки: .btn, .btn-primary, .btn-ghost, .btn-icon, .btn-sm
│   ├── cards.css           # Картки: .card, .tile, .badge, .doc-card
│   ├── forms.css           # Форми: .field, .toggle-row, .output-area
│   └── overlays.css        # Оверлеї: .toast, .confirm-*, .preview-*, .selection-toolbar, .pdf-preview
└── features/
    ├── photo.css           # Зображення: .images-*, .resize-*, .img-compare, .metadata-*, @keyframes
    ├── clipboard.css       # Буфер: .clipboard-*, .clipboard-toast
    ├── text.css            # Текст: .sanitizer-*, .dual-panel, .snippets
    ├── account.css         # Акаунт: .account-*, .empty-state
    └── documents.css       # Документи: .documents-placeholder
```

**Принципи:**
- **Layout** — стилі, що відповідають за структуру сторінки (shell, viewer)
- **Components** — перевикористовувані UI-компоненти (кнопки, картки, форми, оверлеї)
- **Features** — стилі, специфічні для конкретних фіч (photo, clipboard, text, account, documents)
- Кожен CSS-файл відповідає за свою зону і підключається через barrel `app.css`

## Токени (tokens.css)

### Світла тема (default)

| Змінна | Значення | Опис |
|--------|----------|------|
| `--brand-indigo` | `#4F46E5` | Основний фірмовий колір |
| `--brand-indigo-dark` | `#6366F1` | Фірмовий для темної теми |
| `--success` | `#10b981` | Зелений (успіх) |
| `--error` | `#f43f5e` | Червоний (помилка) |
| `--bg` | `#ffffff` | Фон сторінки |
| `--surface` | `#f1f3f4` | Фон карток |
| `--text` | `#1a1a1a` | Колір тексту |
| `--text-muted` | `#5f6368` | Приглушений текст |
| `--border` | `#dadce0` | Колір рамок |
| `--brand-accent` | `var(--brand-indigo)` | Акцентний колір |
| `--shadow` | `0 4px 24px rgba(26,26,26,0.08)` | Тінь |
| `--radius` | `12px` | Основний радіус |
| `--font` | `"Segoe UI", system-ui, ...` | Основний шрифт |
| `--font-mono` | `"SF Mono", "Cascadia Code", ...` | Моноширинний шрифт |

### Типографіка

| Токен | Значення |
|-------|----------|
| `--font-size-xs` | `0.68rem` |
| `--font-size-sm` | `0.78rem` |
| `--font-size-md` | `0.85rem` |
| `--font-size-base` | `0.9rem` |
| `--font-size-lg` | `1.05rem` |
| `--font-size-xl` | `1.3rem` |

### Відступи

| Токен | Значення |
|-------|----------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `12px` |
| `--space-lg` | `16px` |
| `--space-xl` | `20px` |
| `--space-2xl` | `24px` |
| `--space-3xl` | `32px` |

### Анімації

| Токен | Значення |
|-------|----------|
| `--anim-fast` | `0.12s` |
| `--anim-normal` | `0.15s` |
| `--anim-slow` | `0.2s` |
| `--anim-slower` | `0.35s` |

### Z-index

| Токен | Значення | Використання |
|-------|----------|-------------|
| `--z-dropdown` | `20` | Випадаючі списки |
| `--z-sticky` | `15` | Sticky елементи |
| `--z-overlay` | `1000` | Оверлеї (toast, preview) |
| `--z-toolbar` | `9999` | Selection toolbar |
| `--z-modal` | `10000` | Модальні вікна |

### Радіуси

| Токен | Значення |
|-------|----------|
| `--radius-sm` | `6px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `10px` |
| `--radius` | `12px` |
| `--radius-full` | `999px` |

### Темна тема (`[data-theme="dark"]`)

| Змінна | Значення |
|--------|----------|
| `--brand-accent` | `var(--brand-indigo-dark)` = `#6366F1` |
| `--bg` | `#121212` |
| `--surface` | `#1e1e1e` |
| `--text` | `#e0e0e0` |
| `--text-muted` | `#9aa0a6` |
| `--border` | `#3c4043` |
| `--shadow` | `0 4px 24px rgba(0,0,0,0.35)` |

## Компоненти

### Кнопки (`components/buttons.css`)

```css
.btn            /* Базова кнопка */
.btn-primary    /* Фірмова кнопка (заливка brand-accent) */
.btn-secondary  /* Вторинна (surface фон) */
.btn-ghost      /* Прозора (border тільки) */
.btn-icon       /* Іконкова (центрування) */
.btn-sm         /* Маленький розмір */
.btn--icon-label/* Іконка + текст */
```

### Картки (`components/cards.css`)

```css
.card           /* Базова картка (surface фон, border-radius) */
.tile           /* Клікабельна плитка з іконкою */
.doc-card       /* Картка секції в grid */
.doc-cards      /* Grid контейнер для карток секцій */
```

### Форми (`components/forms.css`)

```css
.field          /* Контейнер поля */
.field label    /* Мітка (uppercase, small) */
.toggle-row     /* Рядок з кастомним toggle */
.output-area    /* Область виводу */
```

### Оверлеї (`components/overlays.css`)

```css
.toast               /* Сповіщення */
.confirm-overlay     /* Діалог підтвердження */
.preview-overlay     /* Повноекранний перегляд */
.preview-toolbar     /* Панель інструментів прев'ю */
.selection-toolbar   /* Плаваючий тулбар виділення */
.pdf-preview         /* PDF перегляд */
```

## Layout

### Shell (`layout/shell.css`)

```css
.shell                  /* Головний контейнер (flex column, 100vh) */
.shell-header           /* Фіксований header (sticky top) */
.shell-header__brand    /* Лого + назва */
.shell-header__title    /* Назва поточної сторінки */
.shell-header__actions  /* Кнопки дій (тема, account) */
.shell-tabs-wrap        /* Контейнер навігації */
.shell-tabs             /* Панель вкладок (flex) */
.shell-tab              /* Вкладка */
.shell-tab__icon        /* Іконка вкладки */
.shell-tab__label       /* Назва вкладки */
.shell-main             /* Основний контент */
```

### Viewer (`layout/viewer.css`)

```css
.doc-viewer             /* Контейнер перегляду документів */
.doc-viewer__selector   /* Випадаючий селектор */
.doc-viewer__content    /* Область контенту */
.doc-content            /* Стилі MD-рендерингу (h1-h6, code, table) */
.doc-wasm-loading       /* Індикатор завантаження WASM */
```

## Feature-специфічні стилі

### Photo (`features/photo.css`)
```css
.images-drop, .images-toolbar, .images-items, .images-item, .images-thumb
.format-bar, .format-per-file
.resize-*, .img-compare, .resize-gallery
.metadata-*
.image-options, .image-options__tab
.status-ready, .status-err, .status-wait
```

### Clipboard (`features/clipboard.css`)
```css
.clipboard-list, .clipboard-item, .clipboard-toast
```

### Text (`features/text.css`)
```css
.sanitizer-grid, .sanitizer-actions, .snippets
.dual-panels, .dual-panel
```

### Account (`features/account.css`)
```css
.account-list, .account-item, .empty-state
```

## Анімації

- Кнопки: `transform: scale(0.98)` при натисканні
- Toast: `opacity` + `translateY` (0.2s)
- Clipboard toast: `slideUp` (0.25s ease)
- Картки: `border-color` + `box-shadow` при hover
- Toggle: `translateX` для повзунка (0.15s)

## Safe Area

Використовується `env(safe-area-inset-top)` та `env(safe-area-inset-bottom)` для підтримки notched пристроїв.
