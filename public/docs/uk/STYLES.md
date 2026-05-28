# Дизайн-система та CSS

## Архітектура CSS

FormatX використовує трьохрівневу CSS архітектуру без препроцесорів.

```
styles/
├── tokens.css         # CSS-змінні (кольори, радіуси, тіні)
├── components.css     # UI компоненти (кнопки, картки, форми)
└── app.css            # Layout (shell, header, tabs)
```

## Токени (tokens.css)

### Світла тема (default)

| Змінна | Значення | Опис |
|--------|----------|------|
| `--brand-indigo` | `#4F46E5` | Основний фірмовий колір |
| `--brand-indigo-dark` | `#6366F1` | Фірмовий для темної теми |
| `--charcoal` | `#1a1a1a` | Темний текст |
| `--cloud` | `#f8f9fa` | Світлий фон |
| `--success` | `#10b981` | Зелений (успіх) |
| `--error` | `#f43f5e` | Червоний (помилка) |
| `--bg` | `#ffffff` | Фон сторінки |
| `--surface` | `#f1f3f4` | Фон карток |
| `--text` | `#1a1a1a` | Колір тексту |
| `--text-muted` | `#5f6368` | Приглушений текст |
| `--border` | `#dadce0` | Колір рамок |
| `--brand-accent` | `var(--brand-indigo)` | Акцентний колір |
| `--shadow` | `0 4px 24px rgba(26,26,26,0.08)` | Тінь |
| `--radius` | `12px` | Радіус заокруглення |
| `--font` | `"Segoe UI", system-ui, ...` | Шрифт |

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

## Компоненти (components.css)

### Кнопки

```css
.btn            /* Базова кнопка */
.btn-primary    /* Фірмова кнопка (заливка brand-accent) */
.btn-secondary  /* Вторинна (surface фон) */
.btn-ghost      /* Прозора (border тільки) */
.btn-icon       /* Іконкова (центрування) */
.btn-sm         /* Маленький розмір */
```

### Картки

```css
.card           /* Біла/сіра картка з border-radius + border */
```

### Плитки

```css
.tile           /* Клікабельна плитка з іконкою */
.tile__icon     /* Іконка 48x48 */
```

### Toast

```css
.toast                  /* Фіксоване сповіщення знизу справа */
.toast--success         /* Зелений */
.toast--error           /* Червоний */
.toast.show             /* Анімація появи */
```

### Confirm Dialog

```css
.confirm-overlay        /* Затемнений фон */
.confirm-box            /* Біле модальне вікно */
.confirm-msg            /* Текст повідомлення */
.confirm-actions        /* Рядок кнопок */
```

### Поля введення

```css
.field                  /* Контейнер поля */
.field label            /* Мітка (uppercase, small) */
.field input            /* Текстове поле */
.field select           /* Випадаючий список */
.field textarea         /* Текстова область */
```

### Перемикачі

```css
.toggle-row             /* Рядок з чекбоксом */
.toggle-row input[type="checkbox"]  /* Кастомний toggle */
```

### Layout (app.css)

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

### Інші компоненти

```css
.badge                  /* Лічильник */
.images-drop            /* Зона drag & drop */
.images-items           /* Список файлів */
.images-item            /* Елемент файлу */
.images-item__actions   /* Кнопки дій */
.images-toolbar         /* Панель інструментів */
.doc-cards              /* Сітка секцій документів */
.doc-card               /* Картка секції */
.preview-overlay        /* Overlay попереднього перегляду */
.preview-toolbar        /* Панель інструментів прев'ю */
.preview-body           /* Контейнер контенту */
.preview-image          /* Зображення з масштабуванням */
.preview-iframe         /* Iframe для HTML/MD */
.dual-panel             /* Панель дуального режиму */
.clipboard-list         /* Список clipboard */
.clipboard-item         /* Елемент clipboard */
```

## Анімації

- Кнопки: `transform: scale(0.98)` при натисканні
- Toast: `opacity` + `translateY` (0.2s)
- Clipboard toast: `slideUp` (0.25s ease)
- Картки: `border-color` + `box-shadow` при hover
- Toggle: `translateX` для повзунка (0.15s)

## Safe Area

Використовується `env(safe-area-inset-top)` та `env(safe-area-inset-bottom)` для підтримки notched пристроїв.
