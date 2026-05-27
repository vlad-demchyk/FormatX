export function logoSvg(className = ""): string {
  return `<svg class="${className}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20 35h35M20 60h28M20 85h20" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <rect x="62" y="28" width="38" height="38" rx="8" stroke="currentColor" stroke-width="5"/>
    <circle cx="95" cy="88" r="10" fill="currentColor"/>
  </svg>`;
}
