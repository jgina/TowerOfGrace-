/*
  Image slots for the public pages.

  Every card, hero and feature block on the website has a named slot (e.g. "farm-sections-1").
  The picture shown in a slot is chosen in this order:
    1. an image uploaded by an admin in Admin → Content (always wins);
    2. a file in client/src/assets/site/ named after the slot, e.g. assets/site/farm-sections-1.jpg;
    3. a bundled farm photo, where one fits;
    4. a branded "photo coming soon" placeholder.

  Files dropped into assets/site/ are picked up automatically on the next build — no code change needed.
  See assets/site/README.md for the full list of slot names.
*/

const files = import.meta.glob('./site/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', { eager: true, import: 'default' });

const BY_SLOT = Object.fromEntries(
  Object.entries(files).map(([path, url]) => {
    const slot = path
      .split('/')
      .pop()
      .replace(/\.[^.]+$/, '')
      .toLowerCase();
    return [slot, url];
  })
);

/** The codebase image for a slot, if one has been added to assets/site/. */
export const siteImage = (slot, alt = '') => (slot && BY_SLOT[slot.toLowerCase()] ? { url: BY_SLOT[slot.toLowerCase()], alt } : null);

/** Admin upload → codebase file → bundled photo → null (placeholder). */
export const slotImage = (uploaded, slot, bundled) => {
  if (uploaded?.url) return uploaded;
  return siteImage(slot, bundled?.alt || uploaded?.alt || '') || bundled || null;
};

/** In development, placeholders show which file to add. */
export const slotHint = (slot) => (import.meta.env.DEV && slot ? `assets/site/${slot}.jpg` : undefined);
