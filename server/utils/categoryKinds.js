/*
  What kind of stock a product category holds.
  - eggs:          egg packs (losses are broken / spoiled eggs)
  - prepared-meat: dressed, cut or cooked meat (not live birds — no feeding, no flock batches)
  - anything else: live birds
*/
const EGGS = 'eggs';
const PREPARED_MEAT = 'prepared-meat';
const NOT_LIVE_BIRDS = [EGGS, PREPARED_MEAT];

const isLiveBirds = (slug) => !NOT_LIVE_BIRDS.includes(slug);

// MongoDB expression: true when the document's categorySlug is a live-bird category.
const liveBirdsExpr = { $not: [{ $in: ['$categorySlug', NOT_LIVE_BIRDS] }] };

module.exports = { EGGS, PREPARED_MEAT, NOT_LIVE_BIRDS, isLiveBirds, liveBirdsExpr };
