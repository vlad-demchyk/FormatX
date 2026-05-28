import pinRaw from "/assets/icons/sidekickicons_pin-16-solid.svg?raw";

export const pinIcon = pinRaw
  .replace(/fill="#6366F1"/gi, 'fill="currentColor"')
  .replace(/stroke="#6366F1"/gi, 'stroke="currentColor"')
  .replace(/\s(width|height)="\d+"/g, " ");
