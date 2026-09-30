# Website image slots

Drop photos into this folder, named after a slot, and they appear on the website automatically
on the next build (or immediately with `npm run dev`). No code changes are needed.

- Formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`
- Name = slot name + extension, e.g. `farm-sections-1.jpg`
- Landscape photos around 1600 × 1200 px work best; keep each file under ~400 KB.
- An image uploaded in **Admin → Content** always takes priority over a file here.
- While running `npm run dev`, empty slots show their file name on the placeholder.

Numbered slots follow the order of the cards on the page (1 = first card). If cards are
reordered in Admin → Content, the numbered files follow the position, not the card.

## Page headers and feature images

| Slot | Where |
| --- | --- |
| `home-hero` | Homepage hero background |
| `home-infrastructure` | Homepage "Our farm" block |
| `about-hero`, `about-story` | About Us header and story image |
| `farm-hero` | Our Farm header |
| `quality-hero` | Quality & Hygiene header |
| `production-hero` | How We Produce header |
| `products-hero` | Our Products header |
| `bulk-hero` | Bulk Orders header |
| `contact-hero` | Contact header |
| `gallery-hero` | Gallery header |
| `category-broilers`, `category-noilers`, `category-eggs`, `category-turkeys` | Product line photos (used when a category has no uploaded image) |

## Card images

| Slot | Page · section | Cards |
| --- | --- | --- |
| `home-journey-1` … `-4` | Home · From Day-Old Chick to Your Table | Day-old chicks, Brooding & rearing, Daily care & records, Ready for you |
| `home-audience-1` … `-6` | Home · Who we serve | Households, Restaurants, Hotels, Caterers, Supermarkets, Distributors |
| `home-knowhow-1` … `-3` | Home · Good to know | Storing chicken, Keeping eggs fresh, Choosing the right bird |
| `about-services-1` … `-6` | About · What we do | Broilers, Noilers, Table eggs, Turkeys, Bulk supply, Retail & delivery |
| `about-approach-1` … `-4` | About · Our farming approach | Bird welfare, Biosecurity, Traceability, Responsible farming |
| `farm-sections-1` … `-6` | Our Farm · farm areas | Brooding house, Broiler houses, Layer house, Noiler & turkey pens, Feed store, Water & sanitation |
| `farm-routine-1` … `-5` | Our Farm · A day on the farm | Morning checks, Feeding, Egg collection, Cleaning, Evening round |
| `quality-standards-1` … `-4` | Quality · standards | Clean housing, Feed & water, Health monitoring, Careful packaging |
| `quality-foodsafety-1` … `-6` | Quality · Food safety tips | Storing chicken, Thawing, Cooking, Storing eggs, Checking eggs, Kitchen hygiene |
| `production-steps-1` … `-6` | How We Produce · steps | Sourcing, Brooding, Rearing, Health checks, Ready for sale, Packing & delivery |
| `production-timelines-1` … `-4` | How We Produce · growing periods | Broilers, Noilers, Layers & eggs, Turkeys |
| `shop-guide-1` … `-3` | Our Products · buying guide | Right weight, Order ahead, Store it right |
| `bulk-buyers-1` … `-6` | Bulk Orders · who we supply | Hotels, Restaurants, Caterers, Supermarkets, Institutions, Distributors |
| `contact-help-1` … `-3` | Contact · help cards | Shop online, Bulk & wholesale, Track an order |
