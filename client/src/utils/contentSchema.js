/*
  CMS content model.
  - DEFAULT_CONTENT is what the site shows until an admin saves their own text in Admin → Content.
    It uses standard poultry-farming information and makes no specific factual claims about the company
    (no capacity, founding year, awards, certifications, staff names or locations). Review and adjust it
    in Admin → Content so every statement matches how the farm actually runs.
  - Every card list has image slots: an uploaded image wins, otherwise a file in client/src/assets/site/
    named <slot>-<n>.jpg (see assets/site/README.md), otherwise a placeholder.
  - CONTENT_SECTIONS describes the admin editor form for each section.
*/

export const DEFAULT_CONTENT = {
  home: {
    hero: {
      eyebrow: 'Quality Poultry · Healthy Food · Brighter Tomorrow',
      titleLine1: 'Quality Poultry.',
      titleLine2: 'Healthy Food.',
      subtitle:
        'Broilers, noilers, fresh eggs and turkeys raised with care, and supplied to homes, restaurants, hotels and retailers.',
      primaryCtaLabel: 'Shop Products',
      primaryCtaLink: '/shop',
      secondaryCtaLabel: 'Bulk Orders',
      secondaryCtaLink: '/bulk-orders',
      image: null,
    },
    pillars: {
      eyebrow: 'Why Tower of Grace',
      title: 'The Pillars of Tower of Grace',
      text: 'Everything we produce is guided by a few simple commitments.',
      items: [
        { title: 'Healthy Birds', text: 'Attentive care, clean water and quality feed at every stage of growth.' },
        { title: 'Hygienic Handling', text: 'Clean processes from the pen to packaging and delivery.' },
        { title: 'Reliable Supply', text: 'Consistent availability for households and business customers.' },
        { title: 'Honest Service', text: 'Clear pricing, clear weights and responsive customer support.' },
      ],
    },
    products: {
      eyebrow: 'What we produce',
      title: 'Our Poultry Products',
      text: 'Choose the size, weight or pack that suits you, then order online.',
    },
    journey: {
      eyebrow: 'Farm to table',
      title: 'From Day-Old Chick to Your Table',
      text: 'Every bird we sell follows the same careful path. Here is what happens before it reaches you.',
      items: [
        {
          title: 'Day-Old Chicks',
          text: 'Each flock starts as healthy day-old chicks from reputable hatcheries. Every delivery gets its own batch code so it can be followed from arrival to sale.',
          image: null,
        },
        {
          title: 'Brooding & Rearing',
          text: 'Chicks are kept warm, dry and well fed in the brooding house for their first weeks, then moved to roomy, well-ventilated pens.',
          image: null,
        },
        {
          title: 'Daily Care & Records',
          text: 'Birds are fed, watered and checked every day. Growth, feed used and any losses are recorded, so each flock is managed on facts.',
          image: null,
        },
        {
          title: 'Ready for You',
          text: 'When a flock reaches its target age and weight it is confirmed ready, then prepared for delivery or farm pickup.',
          image: null,
        },
      ],
    },
    infrastructure: {
      eyebrow: 'Our farm',
      title: 'Modern Infrastructure, Responsible Methods',
      text:
        'Our birds are raised in clean, well-ventilated houses with dry litter, hanging feeders and constant access to fresh drinking water.\n\nFeeding, flock health, feed stock and losses are recorded every day, and access to the pens is controlled to keep disease out. It is simple, disciplined farming — the kind that produces healthy birds and dependable supply.',
      image: null,
      stats: [],
    },
    audience: {
      eyebrow: 'Who we serve',
      title: 'Poultry for Every Kitchen',
      text: 'From a single bird for Sunday lunch to regular supply for a busy restaurant.',
      items: [
        { title: 'Households & Families', text: 'Fresh birds and eggs for everyday meals, weekends and family celebrations.', link: '/shop', linkLabel: 'Shop now', image: null },
        { title: 'Restaurants & Eateries', text: 'Consistent sizes and dependable supply for kitchens that cook every day.', link: '/bulk-orders', linkLabel: 'Request supply', image: null },
        { title: 'Hotels & Event Centres', text: 'Planned deliveries for menus, banquets, conferences and guest breakfasts.', link: '/bulk-orders', linkLabel: 'Request supply', image: null },
        { title: 'Caterers & Party Planners', text: 'Order ahead for weddings, birthdays, naming ceremonies and end-of-year parties.', link: '/bulk-orders', linkLabel: 'Plan an order', image: null },
        { title: 'Supermarkets & Retailers', text: 'Eggs and poultry for your shelves, with regular restocking you can plan around.', link: '/bulk-orders', linkLabel: 'Become a stockist', image: null },
        { title: 'Distributors & Resellers', text: 'Volume supply for businesses that serve their own network of customers.', link: '/bulk-orders', linkLabel: 'Talk to sales', image: null },
      ],
    },
    knowhow: {
      eyebrow: 'Poultry know-how',
      title: 'Good to Know',
      text: 'Simple tips to get the best from your chicken and eggs.',
      items: [
        {
          title: 'Storing Fresh Chicken',
          text: 'Refrigerate chicken as soon as it arrives, or freeze it if you will not cook it within two days.',
          points: 'Fridge: 0–4 °C, cook within 1–2 days\nFreezer: −18 °C or colder\nKeep raw chicken on the lowest shelf',
          link: '/quality-and-hygiene',
          linkLabel: 'Food safety tips',
          image: null,
        },
        {
          title: 'Keeping Eggs Fresh',
          text: 'Eggs keep best in a cool place, pointed end down, away from strong smells.',
          points: 'Store in the fridge or a cool room\nDo not wash eggs until just before use\nDiscard cracked or leaking eggs',
          link: '/quality-and-hygiene',
          linkLabel: 'Food safety tips',
          image: null,
        },
        {
          title: 'Choosing the Right Bird',
          text: 'Broilers are tender and quick to cook; noilers and turkeys have firmer, richer meat for slow cooking and pepper soup.',
          points: 'Pick a weight to match your guests\nOrder early for festive seasons\nAsk us about bulk pricing',
          link: '/products',
          linkLabel: 'See our products',
          image: null,
        },
      ],
    },
    bulk: {
      eyebrow: 'For businesses',
      title: 'Hotels, Caterers & Wholesale',
      text: 'Regular or one-off supply for hotels, restaurants, caterers, supermarkets, retailers and distributors.',
      ctaLabel: 'Request Bulk Supply',
    },
    retail: {
      eyebrow: 'For households',
      title: 'Wholesale & Retail Orders',
      text: 'Order a single bird, a crate of eggs or a family pack — delivered or ready for pickup.',
      ctaLabel: 'Start Shopping',
    },
    gallery: {
      eyebrow: 'Gallery',
      title: 'Life on the Farm',
    },
    contactStrip: {
      title: 'Questions about an order?',
      text: 'Speak with our team on WhatsApp or send us a message.',
    },
  },
  about: {
    heroTitle: 'About Us',
    heroSubtitle: 'Get to know Tower of Grace Farms & Agro-Based Industries Ltd.',
    heroImage: null,
    storyTitle: 'Our Story',
    story:
      'Tower of Grace Farms & Agro-Based Industries Ltd is an agro-based company focused on poultry. We raise broilers, noilers, laying birds for fresh table eggs, and turkeys, and supply them to households, restaurants, hotels, caterers and retailers.\n\nOur approach is simple: healthy birds, clean surroundings, honest weights and dependable supply. Every flock is tracked from the day it arrives on the farm — its age, its feed, its health and its growth — so we always know exactly what we are selling.\n\nWe believe good food starts with good farming, and we are building a farm our customers can trust for years to come.',
    image: null,
    vision:
      'To be a trusted name in Nigerian poultry — known for healthy birds, hygienic produce and dependable supply to every home and business we serve.',
    mission:
      'To produce quality broilers, noilers, eggs and turkeys through responsible farming, strict hygiene and careful record-keeping, and to deliver them to our customers fresh, fairly priced and on time.',
    values: [
      { title: 'Integrity', text: 'We are honest about what we sell, how we produce it and what it weighs.' },
      { title: 'Care', text: 'We care for our birds, our people and our customers.' },
      { title: 'Quality', text: 'We hold every bird and every egg to a consistent standard.' },
      { title: 'Reliability', text: 'We do what we promise, when we promise it.' },
    ],
    services: {
      eyebrow: 'What we do',
      title: 'Our Areas of Work',
      text: 'A focused poultry business, from rearing to delivery.',
      items: [
        { title: 'Broiler Production', text: 'Fast-growing meat birds raised to market weight in clean, ventilated houses, sold in a range of weights.', link: '/products/broilers', linkLabel: 'Shop broilers', image: null },
        { title: 'Noiler Rearing', text: 'Hardy dual-purpose birds with firm, flavourful meat — a favourite for pepper soup and traditional dishes.', link: '/products/noilers', linkLabel: 'Shop noilers', image: null },
        { title: 'Table Egg Production', text: 'Laying birds kept on a steady feeding and lighting routine, with eggs collected, sorted and packed daily.', link: '/products/eggs', linkLabel: 'Shop eggs', image: null },
        { title: 'Turkey Rearing', text: 'Large, meaty birds for festive seasons, celebrations and big family gatherings.', link: '/products/turkeys', linkLabel: 'Shop turkeys', image: null },
        { title: 'Bulk & Contract Supply', text: 'Planned, regular supply for hotels, restaurants, caterers, retailers and distributors.', link: '/bulk-orders', linkLabel: 'Request supply', image: null },
        { title: 'Retail & Delivery', text: 'Order online and choose delivery to your home or business, or collect from the farm.', link: '/shop', linkLabel: 'Start shopping', image: null },
      ],
    },
    approach: {
      eyebrow: 'How we work',
      title: 'Our Farming Approach',
      text: 'The principles behind every flock we raise.',
      items: [
        { title: 'Bird Welfare', text: 'Enough space, fresh air, clean water and balanced feed — healthy, comfortable birds grow well and stay well.', image: null },
        { title: 'Biosecurity', text: 'Controlled entry, footbaths, cleaning between flocks and quick isolation of sick birds keep disease out.', image: null },
        { title: 'Traceability', text: 'Every batch of chicks has its own code. Its age, feed, weight checks and losses are on record from day one.', image: null },
        { title: 'Responsible Farming', text: 'Careful use of feed and water, and proper handling of litter and waste, for a farm that can keep producing well.', image: null },
      ],
    },
  },
  farm: {
    heroTitle: 'Our Farm',
    heroSubtitle: 'Where our poultry is raised.',
    heroImage: null,
    intro:
      'Our farm is organised around the life of the flock — from the brooding house where day-old chicks arrive, to the grow-out pens, the layer house and the runs for our hardier birds. Each area has its own routine for feeding, cleaning and health checks, and access is controlled to keep disease out.',
    sections: [
      {
        title: 'Brooding House',
        text:
          'Day-old chicks spend their first two to three weeks here. The house is kept warm and draught-free — around 32–35 °C in the first week, lowered step by step as the chicks feather up.\n\nClean wood-shaving litter, chick guards, and feeders and drinkers placed close by help every chick start eating and drinking quickly.',
        image: null,
      },
      {
        title: 'Broiler Houses',
        text:
          'Growing birds move to spacious, well-ventilated deep-litter pens with hanging feeders and drinkers. Stocking is kept at a level that lets birds move, eat and rest freely.\n\nLitter is kept dry and topped up, and feeder and drinker heights are raised as the birds grow.',
        image: null,
      },
      {
        title: 'Layer House & Egg Collection',
        text:
          'Laying birds are kept on a steady routine of feed, water and light. Eggs are collected several times a day, sorted, and any cracked or dirty eggs removed before packing into crates.\n\nRegular collection keeps eggs clean and fresh and discourages broodiness and egg eating.',
        image: null,
      },
      {
        title: 'Noiler & Turkey Pens',
        text:
          'Noilers and turkeys are hardier, slower-growing birds. They are housed separately from broilers, with more space per bird, and fed rations suited to their breed and age.',
        image: null,
      },
      {
        title: 'Feed Store',
        text:
          'Feed is kept dry on raised pallets, away from walls, sunlight and rodents, and used first-in, first-out. Every bag bought and every bag fed is recorded, so the store never runs out unnoticed.',
        image: null,
      },
      {
        title: 'Water & Sanitation',
        text:
          'Birds have constant access to clean drinking water. Drinkers are washed daily, water lines are flushed and sanitised, and pens are cleaned and disinfected between flocks.',
        image: null,
      },
    ],
    routine: {
      eyebrow: 'Daily routine',
      title: 'A Day on the Farm',
      text: 'Good poultry farming is a routine done well, every single day.',
      items: [
        { title: 'Morning Checks', text: 'Every pen is walked at first light: bird behaviour, temperature, ventilation, feed and water all checked.', image: null },
        { title: 'Feeding & Water', text: 'Feeders are filled with the right feed for each flock’s age, and drinkers cleaned and refilled.', image: null },
        { title: 'Egg Collection', text: 'Eggs are collected several times a day, sorted and packed while fresh.', image: null },
        { title: 'Cleaning & Litter Care', text: 'Wet or caked litter is replaced, and walkways, footbaths and equipment are cleaned.', image: null },
        { title: 'Evening Round & Records', text: 'A final check of every flock, and the day’s feeding, losses and observations are recorded.', image: null },
      ],
    },
  },
  quality: {
    heroTitle: 'Quality & Hygiene',
    heroSubtitle: 'The standards behind every bird and every egg.',
    heroImage: null,
    intro:
      'Healthy birds and safe food come from clean housing, good feed, fresh water, daily observation and careful handling. These are the standards we work to on the farm, and the tips we share so your food stays safe at home.',
    standards: [
      {
        title: 'Clean Housing',
        text: 'Pens are cleaned and maintained on a regular schedule.',
        points: 'Dry, fresh litter\nGood ventilation\nFull clean-out between flocks',
        image: null,
      },
      {
        title: 'Feed & Water',
        text: 'Birds receive quality feed and clean drinking water.',
        points: 'Feed matched to age and breed\nDry, rodent-free feed storage\nDrinkers washed daily',
        image: null,
      },
      {
        title: 'Health Monitoring',
        text: 'Flocks are observed daily and health issues are addressed promptly.',
        points: 'Daily flock checks\nVaccination on schedule\nSick birds isolated quickly',
        image: null,
      },
      {
        title: 'Careful Packaging',
        text: 'Products are packed hygienically for safe delivery.',
        points: 'Clean crates and packs\nCracked eggs removed\nProducts kept cool on the way',
        image: null,
      },
    ],
    biosecurity: {
      eyebrow: 'Keeping disease out',
      title: 'Biosecurity on the Farm',
      text: 'Most poultry diseases are carried in on shoes, equipment, vehicles, wild birds and rodents. These routines keep them out.',
      items: [
        { title: 'Controlled Entry', text: 'Only essential people enter the pens, and visitors are recorded.' },
        { title: 'Footbaths & Hand-Washing', text: 'Disinfectant footbaths at pen entrances and hand-washing before and after handling birds.' },
        { title: 'Farm Clothing', text: 'Dedicated boots and clothing are worn inside the poultry houses.' },
        { title: 'All-In, All-Out', text: 'Each house holds one age group at a time, so young and older birds do not mix.' },
        { title: 'Cleaning Between Flocks', text: 'Houses are emptied, washed, disinfected and rested before new chicks arrive.' },
        { title: 'Isolation of Sick Birds', text: 'Any bird that looks unwell is separated quickly and observed.' },
        { title: 'Pest & Rodent Control', text: 'Feed is stored securely and the surroundings kept clear to deter rodents and wild birds.' },
        { title: 'Safe Disposal', text: 'Dead birds and waste are disposed of promptly and away from the pens.' },
      ],
    },
    vaccination: {
      eyebrow: 'Flock health',
      title: 'Typical Vaccination Programme',
      text: 'Vaccination protects flocks against the most serious poultry diseases in Nigeria. A typical programme looks like this:',
      rows: [
        { age: 'Day 1', vaccine: 'Marek’s disease', method: 'Injection — usually given at the hatchery' },
        { age: 'Days 7–10', vaccine: 'Newcastle disease (e.g. HB1 / Lasota)', method: 'Eye drop or drinking water' },
        { age: 'Days 12–14', vaccine: 'Infectious bursal disease (Gumboro)', method: 'Drinking water' },
        { age: 'Days 18–21', vaccine: 'Newcastle disease booster (Lasota)', method: 'Drinking water' },
        { age: 'Days 24–28', vaccine: 'Gumboro booster', method: 'Drinking water' },
        { age: 'Weeks 6–8', vaccine: 'Fowl pox (longer-lived birds)', method: 'Wing-web stab' },
        { age: 'Weeks 8–10', vaccine: 'Newcastle disease (Komarov / Lasota)', method: 'Injection or drinking water' },
        { age: 'Before lay', vaccine: 'Newcastle & egg-drop booster (layers)', method: 'Injection' },
      ],
      note: 'For reference only. Each flock’s actual schedule is set with a qualified veterinarian, following the hatchery’s advice and local disease risk.',
    },
    foodSafety: {
      eyebrow: 'At home',
      title: 'Food Safety Tips',
      text: 'How to store, prepare and cook poultry and eggs safely.',
      items: [
        { title: 'Storing Chicken', text: 'Chill or freeze raw poultry straight away.', points: 'Fridge at 0–4 °C; cook within 1–2 days\nFreezer at −18 °C or colder\nKeep raw meat on the bottom shelf, covered', image: null },
        { title: 'Thawing Safely', text: 'Thaw slowly and keep it cold while it thaws.', points: 'Thaw in the fridge, not on the counter\nAllow about a day for a whole bird\nCook thawed chicken promptly — do not refreeze raw', image: null },
        { title: 'Cooking Thoroughly', text: 'Cook poultry all the way through.', points: 'Core temperature of 75 °C\nJuices run clear, no pink meat near the bone\nReheat leftovers until piping hot', image: null },
        { title: 'Storing Eggs', text: 'Keep eggs cool and dry.', points: 'Store pointed end down\nKeep away from strong-smelling foods\nDo not wash until just before use', image: null },
        { title: 'Checking Eggs', text: 'A quick check before cooking.', points: 'Discard cracked or leaking eggs\nFresh eggs sink in water; old eggs float\nCook until whites and yolks are firm', image: null },
        { title: 'Kitchen Hygiene', text: 'Stop germs from spreading in the kitchen.', points: 'Separate boards for raw meat\nWash hands after handling raw poultry or eggs\nClean surfaces with hot, soapy water', image: null },
      ],
    },
  },
  production: {
    heroTitle: 'How We Produce',
    heroSubtitle: 'From day-old chicks to your table.',
    heroImage: null,
    intro:
      'Poultry production is a sequence of stages, and each one matters. Here is how our birds are raised — from the day they arrive as chicks to the day they are ready for your table.',
    steps: [
      {
        title: 'Sourcing Day-Old Chicks',
        text:
          'Chicks and poults come from reputable hatcheries. On arrival they are counted, checked for quality and given a batch code. From then on, their age is tracked automatically from day one.',
        image: null,
      },
      {
        title: 'Brooding (Weeks 0–3)',
        text:
          'Chicks are kept in a warm, draught-free brooding area — about 32–35 °C in the first week, lowered gradually each week. Feed and water are placed within easy reach and the chicks are watched closely.',
        image: null,
      },
      {
        title: 'Rearing & Growing',
        text:
          'As they feather up, birds move to roomy, well-ventilated pens with dry litter. They are fed a starter feed first, then grower or finisher feed matched to their age and type.',
        image: null,
      },
      {
        title: 'Health & Weight Checks',
        text:
          'Flocks are observed every day and vaccinated on schedule. Sample weigh-ins track growth, and feed use and any losses are recorded against each batch.',
        image: null,
      },
      {
        title: 'Ready for Sale',
        text:
          'When a batch reaches its target age and weight it is confirmed ready. Only then is it moved into stock and made available to order — so what you buy is always ready.',
        image: null,
      },
      {
        title: 'Packing & Delivery',
        text:
          'Orders are prepared and packed hygienically, then delivered to your home or business or collected from the farm at an agreed time.',
        image: null,
      },
    ],
    timelines: {
      eyebrow: 'Growing periods',
      title: 'How Long Each Bird Takes',
      text: 'Typical growing periods and uses for the birds we raise.',
      items: [
        { title: 'Broilers', tag: '6–8 weeks', text: 'Fast-growing meat birds with tender, juicy meat.', points: 'Typical live weight 1.8–3 kg\nQuick to cook — roast, fry, grill\nBest for everyday meals and parties', image: null },
        { title: 'Noilers', tag: '3–5 months', text: 'Hardy dual-purpose birds with firmer, tastier meat.', points: 'Raised for meat and eggs\nGreat for pepper soup and stews\nSlower growth, richer flavour', image: null },
        { title: 'Layers & Eggs', tag: 'Lay from ~18–20 weeks', text: 'Laying birds produce table eggs for many months.', points: 'Eggs collected daily\nSold by crate (30 eggs) and pack\nSteady supply all year', image: null },
        { title: 'Turkeys', tag: '4–6 months', text: 'Large birds with plenty of meat for big occasions.', points: 'Ideal for festive seasons\nFeeds a large family or party\nOrder ahead for December', image: null },
      ],
    },
    feeding: {
      eyebrow: 'Nutrition',
      title: 'Feeding Programme',
      text: 'Birds are fed a ration matched to their age and purpose. A typical programme:',
      rows: [
        { phase: 'Broiler starter', age: '0–3 weeks', feed: 'High-protein crumbs or mash for fast early growth', protein: '22–24%' },
        { phase: 'Broiler finisher', age: '4 weeks – market', feed: 'Energy-rich ration to reach market weight', protein: '19–21%' },
        { phase: 'Chick mash', age: '0–8 weeks (layers, noilers)', feed: 'Balanced starter ration for long-lived birds', protein: '18–20%' },
        { phase: 'Grower mash', age: '9–18 weeks', feed: 'Moderate-protein ration for steady frame growth', protein: '15–16%' },
        { phase: 'Layer mash', age: 'From point of lay', feed: 'Extra calcium for strong eggshells', protein: '16–18%' },
        { phase: 'Turkey starter', age: '0–8 weeks', feed: 'Very high-protein ration for young poults', protein: '26–28%' },
      ],
      note: 'Guide values. Actual feeds and amounts follow the manufacturer’s label and the needs of each flock. Clean water is available at all times.',
    },
  },
  shop: {
    guide: {
      eyebrow: 'Buying guide',
      title: 'Ordering Made Easy',
      text: 'A few tips to help you choose.',
      items: [
        { title: 'Pick the Right Weight', text: 'As a rough guide, a 1.5–2 kg broiler serves a family of 4–6; choose 2.5 kg and above for bigger gatherings.', link: '/shop', linkLabel: 'Browse weights', image: null },
        { title: 'Order Ahead for Events', text: 'Weddings, parties and festive seasons need planning. Send a bulk request early so we can reserve your birds.', link: '/bulk-orders', linkLabel: 'Request bulk supply', image: null },
        { title: 'Store It Right', text: 'Refrigerate or freeze poultry as soon as it arrives, and keep eggs cool, pointed end down.', link: '/quality-and-hygiene', linkLabel: 'Food safety tips', image: null },
      ],
    },
    sizes: {
      title: 'Size Guide',
      rows: [
        { size: '1.2–1.5 kg', serves: '3–4 people', use: 'Everyday meals, frying, pepper soup' },
        { size: '1.5–2 kg', serves: '4–6 people', use: 'Family meals, roasting, stews' },
        { size: '2–2.5 kg', serves: '6–8 people', use: 'Grilling, barbecue, small gatherings' },
        { size: '2.5 kg and above', serves: '8+ people', use: 'Parties, events and catering' },
        { size: 'Crate of eggs', serves: '30 eggs', use: 'Households, bakeries, food businesses' },
      ],
      note: 'Serving guide only — actual portions depend on how the bird is cut and cooked.',
    },
    notes: {
      title: 'Good to Know',
      items: [
        { title: 'Freshness & Storage', text: 'Refrigerate poultry as soon as it arrives (0–4 °C) or freeze it at −18 °C. Keep eggs cool, pointed end down.' },
        { title: 'Delivery or Pickup', text: 'Choose delivery to your home or business, or collect from the farm. Our team calls to confirm the time.' },
        { title: 'Payment & Receipts', text: 'Pay with any option shown at checkout. For bank transfers, upload your receipt on your order page and we confirm once received.' },
      ],
    },
  },
  contact: {
    intro: 'Reach our team for orders, deliveries and enquiries.',
    phone: '',
    phoneAlt: '',
    email: '',
    whatsapp: '',
    address: '',
    mapEmbedUrl: '',
    openingHours: [],
    help: {
      eyebrow: 'How can we help?',
      title: 'Find the Right Place',
      items: [
        { title: 'Shop Online', text: 'Browse broilers, noilers, eggs and turkeys, choose your weight or pack, and check out in minutes.', link: '/shop', linkLabel: 'Go to shop', image: null },
        { title: 'Bulk & Wholesale', text: 'Hotels, restaurants, caterers and retailers can request regular or one-off supply.', link: '/bulk-orders', linkLabel: 'Request supply', image: null },
        { title: 'Track an Order', text: 'Follow your order with your order number and email — no account needed.', link: '/track-order', linkLabel: 'Track order', image: null },
      ],
    },
    faqs: [
      { question: 'How do I place an order?', answer: 'Open the shop, choose a product and the weight or pack you want, add it to your cart and check out. You can also call or WhatsApp us and our team will help.' },
      { question: 'Which payment methods do you accept?', answer: 'The payment options available are shown at checkout. If you pay by bank transfer, use your order number as the reference and upload your receipt on your order page — we will confirm as soon as the money is received.' },
      { question: 'Do you deliver?', answer: 'Yes. At checkout you can choose delivery to your home or business, or pickup from the farm. Our team will call to confirm the delivery time.' },
      { question: 'How can I track my order?', answer: 'Use the Track Order page with your order number and email address. If you have an account, your orders are also listed under My Account.' },
      { question: 'Can I order in bulk or on a regular schedule?', answer: 'Yes. Fill in the Bulk Orders form with what you need, how often and where. Our sales team will get back to you with availability and pricing.' },
      { question: 'How fresh are your products?', answer: 'We supply from flocks raised and tracked on our own farm, and eggs are collected daily. Please refrigerate poultry and keep eggs cool as soon as they arrive.' },
      { question: 'Can I visit the farm?', answer: 'To protect our birds from disease, farm visits are by appointment and follow our biosecurity rules. Contact us to arrange a visit or a farm pickup.' },
    ],
  },
  bulk: {
    heroTitle: 'Bulk Orders',
    heroSubtitle: 'Reliable poultry supply for businesses.',
    intro: 'Tell us what you need and our sales team will get back to you with availability and pricing.',
    benefits: [
      { title: 'Consistent supply', text: 'Plan regular deliveries around your business.' },
      { title: 'Choose your weights', text: 'Request the sizes and pack options you need.' },
      { title: 'Dedicated contact', text: 'Work with one point of contact for your orders.' },
      { title: 'Planned in advance', text: 'Flocks are raised to schedule, so large orders can be reserved ahead of time.' },
      { title: 'Traceable batches', text: 'Every flock is recorded from day one — ask us about the batch your order comes from.' },
      { title: 'Clear records', text: 'Every order has a number, a receipt and a clear payment trail.' },
    ],
    buyers: {
      eyebrow: 'Who we supply',
      title: 'Built for Business Buyers',
      text: 'Whatever the size of your operation, we can plan supply around it.',
      items: [
        { title: 'Hotels & Resorts', text: 'Poultry and eggs for restaurants, room service, banquets and breakfast buffets.', image: null },
        { title: 'Restaurants & Fast Food', text: 'Consistent sizes for menus that need every portion to look and cook the same.', image: null },
        { title: 'Caterers & Event Planners', text: 'Reserve birds ahead for weddings, parties, conferences and festive events.', image: null },
        { title: 'Supermarkets & Stores', text: 'Regular restocking of eggs and poultry for your shelves and freezers.', image: null },
        { title: 'Schools & Institutions', text: 'Planned supply for kitchens that feed many people every day.', image: null },
        { title: 'Distributors & Resellers', text: 'Volume supply for businesses that serve their own customer network.', image: null },
      ],
    },
    process: {
      eyebrow: 'How it works',
      title: 'From Request to Delivery',
      items: [
        { title: 'Send Your Request', text: 'Tell us the products, quantities, weights, frequency and delivery location.' },
        { title: 'Get a Quote', text: 'Our sales team confirms availability, pricing and delivery options.' },
        { title: 'Confirm & Schedule', text: 'Agree the order and delivery dates. Birds are reserved for you.' },
        { title: 'Delivery & Follow-Up', text: 'Your order is delivered as agreed, and we check in to plan the next one.' },
      ],
    },
  },
  footer: {
    about: 'Tower of Grace Farms & Agro-Based Industries Ltd produces broilers, noilers, eggs and turkeys for homes and businesses.',
    socials: [],
    copyright: 'Tower of Grace Farms & Agro-Based Industries Ltd. All rights reserved.',
  },
  announcement: {
    enabled: false,
    text: '',
    linkLabel: '',
    link: '',
  },
};

const list = (name, label, fields, hint) => ({ name, label, type: 'list', fields, hint });
const titleText = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'text', label: 'Text', type: 'textarea' },
];
const image = { name: 'image', label: 'Image', type: 'image' };
const points = { name: 'points', label: 'Bullet points (one per line)', type: 'textarea' };
const link = [
  { name: 'linkLabel', label: 'Button label', type: 'text' },
  { name: 'link', label: 'Button link (e.g. /shop)', type: 'text' },
];
const heading = (prefix) => [
  { name: `${prefix}.eyebrow`, label: 'Small heading', type: 'text' },
  { name: `${prefix}.title`, label: 'Title', type: 'text' },
  { name: `${prefix}.text`, label: 'Intro', type: 'textarea' },
];
const SLOT_HINT = (slot) => `Card images: upload here, or add files named ${slot}-1.jpg, ${slot}-2.jpg… to client/src/assets/site/.`;

export const CONTENT_SECTIONS = [
  {
    key: 'home',
    label: 'Homepage',
    description: 'Hero, pillars, farm-to-table journey, who we serve, tips and call-to-action sections.',
    groups: [
      {
        title: 'Hero',
        fields: [
          { name: 'hero.eyebrow', label: 'Small heading', type: 'text' },
          { name: 'hero.titleLine1', label: 'Headline line 1', type: 'text' },
          { name: 'hero.titleLine2', label: 'Headline line 2 (amber)', type: 'text' },
          { name: 'hero.subtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'hero.primaryCtaLabel', label: 'Primary button label', type: 'text' },
          { name: 'hero.primaryCtaLink', label: 'Primary button link', type: 'text' },
          { name: 'hero.secondaryCtaLabel', label: 'Secondary button label', type: 'text' },
          { name: 'hero.secondaryCtaLink', label: 'Secondary button link', type: 'text' },
          { name: 'hero.image', label: 'Hero image', type: 'image' },
        ],
      },
      {
        title: 'Pillars',
        fields: [...heading('pillars'), list('pillars.items', 'Pillars', titleText)],
      },
      {
        title: 'Products section',
        fields: heading('products'),
      },
      {
        title: 'Farm to table',
        fields: [...heading('journey'), list('journey.items', 'Stages', [...titleText, image], SLOT_HINT('home-journey'))],
      },
      {
        title: 'Infrastructure',
        fields: [
          { name: 'infrastructure.eyebrow', label: 'Small heading', type: 'text' },
          { name: 'infrastructure.title', label: 'Title', type: 'text' },
          { name: 'infrastructure.text', label: 'Text', type: 'textarea', rows: 6 },
          { name: 'infrastructure.image', label: 'Image', type: 'image' },
          list(
            'infrastructure.stats',
            'Key figures',
            [
              { name: 'value', label: 'Value', type: 'text' },
              { name: 'label', label: 'Label', type: 'text' },
            ],
            'Only add verified figures. The block is hidden when empty.'
          ),
        ],
      },
      {
        title: 'Who we serve',
        fields: [...heading('audience'), list('audience.items', 'Customer groups', [...titleText, ...link, image], SLOT_HINT('home-audience'))],
      },
      {
        title: 'Good to know (tips)',
        fields: [...heading('knowhow'), list('knowhow.items', 'Tips', [...titleText, points, ...link, image], SLOT_HINT('home-knowhow'))],
      },
      {
        title: 'Retail & bulk call-to-actions',
        fields: [
          { name: 'retail.eyebrow', label: 'Retail small heading', type: 'text' },
          { name: 'retail.title', label: 'Retail title', type: 'text' },
          { name: 'retail.text', label: 'Retail text', type: 'textarea' },
          { name: 'retail.ctaLabel', label: 'Retail button label', type: 'text' },
          { name: 'bulk.eyebrow', label: 'Bulk small heading', type: 'text' },
          { name: 'bulk.title', label: 'Bulk title', type: 'text' },
          { name: 'bulk.text', label: 'Bulk text', type: 'textarea' },
          { name: 'bulk.ctaLabel', label: 'Bulk button label', type: 'text' },
        ],
      },
      {
        title: 'Gallery & contact strip',
        fields: [
          { name: 'gallery.eyebrow', label: 'Gallery small heading', type: 'text' },
          { name: 'gallery.title', label: 'Gallery title', type: 'text' },
          { name: 'contactStrip.title', label: 'Contact strip title', type: 'text' },
          { name: 'contactStrip.text', label: 'Contact strip text', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'about',
    label: 'About Us',
    description: 'Story, vision, mission, values, what we do and our farming approach.',
    groups: [
      {
        title: 'Page header',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'heroImage', label: 'Header image', type: 'image' },
        ],
      },
      {
        title: 'Story',
        fields: [
          { name: 'storyTitle', label: 'Story title', type: 'text' },
          { name: 'story', label: 'Story', type: 'textarea', rows: 10 },
          { name: 'image', label: 'Story image', type: 'image' },
        ],
      },
      {
        title: 'Vision, mission & values',
        fields: [
          { name: 'vision', label: 'Vision', type: 'textarea' },
          { name: 'mission', label: 'Mission', type: 'textarea' },
          list('values', 'Values', titleText),
        ],
      },
      {
        title: 'What we do',
        fields: [...heading('services'), list('services.items', 'Areas of work', [...titleText, ...link, image], SLOT_HINT('about-services'))],
      },
      {
        title: 'Our farming approach',
        fields: [...heading('approach'), list('approach.items', 'Principles', [...titleText, image], SLOT_HINT('about-approach'))],
      },
    ],
  },
  {
    key: 'farm',
    label: 'Our Farm',
    description: 'Farm overview, facility sections and the daily routine.',
    groups: [
      {
        title: 'Page header',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'heroImage', label: 'Header image', type: 'image' },
          { name: 'intro', label: 'Introduction', type: 'textarea', rows: 6 },
        ],
      },
      { title: 'Farm sections', fields: [list('sections', 'Farm sections', [...titleText, image], SLOT_HINT('farm-sections'))] },
      {
        title: 'A day on the farm',
        fields: [...heading('routine'), list('routine.items', 'Routine', [...titleText, image], SLOT_HINT('farm-routine'))],
      },
    ],
  },
  {
    key: 'quality',
    label: 'Quality & Hygiene',
    description: 'Quality standards, biosecurity, vaccination and food safety. Certifications are managed separately under Certifications.',
    groups: [
      {
        title: 'Page header',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'heroImage', label: 'Header image', type: 'image' },
          { name: 'intro', label: 'Introduction', type: 'textarea', rows: 6 },
        ],
      },
      { title: 'Standards', fields: [list('standards', 'Standards', [...titleText, points, image], SLOT_HINT('quality-standards'))] },
      { title: 'Biosecurity', fields: [...heading('biosecurity'), list('biosecurity.items', 'Measures', titleText)] },
      {
        title: 'Vaccination programme',
        fields: [
          ...heading('vaccination'),
          list('vaccination.rows', 'Schedule', [
            { name: 'age', label: 'Age', type: 'text' },
            { name: 'vaccine', label: 'Vaccine / disease', type: 'text' },
            { name: 'method', label: 'How it is given', type: 'text' },
          ]),
          { name: 'vaccination.note', label: 'Note under the table', type: 'textarea' },
        ],
      },
      {
        title: 'Food safety tips',
        fields: [...heading('foodSafety'), list('foodSafety.items', 'Tips', [...titleText, points, image], SLOT_HINT('quality-foodsafety'))],
      },
    ],
  },
  {
    key: 'production',
    label: 'How We Produce',
    description: 'Production steps, growing periods and the feeding programme.',
    groups: [
      {
        title: 'Page header',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'heroImage', label: 'Header image', type: 'image' },
          { name: 'intro', label: 'Introduction', type: 'textarea', rows: 6 },
        ],
      },
      { title: 'Steps', fields: [list('steps', 'Production steps', [...titleText, image], SLOT_HINT('production-steps'))] },
      {
        title: 'Growing periods',
        fields: [
          ...heading('timelines'),
          list('timelines.items', 'Birds', [...titleText, { name: 'tag', label: 'Badge (e.g. 6–8 weeks)', type: 'text' }, points, image], SLOT_HINT('production-timelines')),
        ],
      },
      {
        title: 'Feeding programme',
        fields: [
          ...heading('feeding'),
          list('feeding.rows', 'Feeding phases', [
            { name: 'phase', label: 'Phase', type: 'text' },
            { name: 'age', label: 'Age', type: 'text' },
            { name: 'feed', label: 'Feed', type: 'text' },
            { name: 'protein', label: 'Crude protein', type: 'text' },
          ]),
          { name: 'feeding.note', label: 'Note under the table', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'shop',
    label: 'Products Page',
    description: 'Buying guide and size guide on the Our Products page, and the notes shown on every product page.',
    groups: [
      { title: 'Buying guide', fields: [...heading('guide'), list('guide.items', 'Guide cards', [...titleText, ...link, image], SLOT_HINT('shop-guide'))] },
      {
        title: 'Size guide',
        fields: [
          { name: 'sizes.title', label: 'Title', type: 'text' },
          list('sizes.rows', 'Sizes', [
            { name: 'size', label: 'Size', type: 'text' },
            { name: 'serves', label: 'Serves', type: 'text' },
            { name: 'use', label: 'Best for', type: 'text' },
          ]),
          { name: 'sizes.note', label: 'Note under the table', type: 'textarea' },
        ],
      },
      {
        title: 'Product page notes',
        fields: [{ name: 'notes.title', label: 'Title', type: 'text' }, list('notes.items', 'Notes (shown on every product page)', titleText)],
      },
    ],
  },
  {
    key: 'contact',
    label: 'Contact Details',
    description: 'Phone, email, address, WhatsApp, map, opening hours, help cards and FAQs.',
    groups: [
      {
        title: 'Contact details',
        fields: [
          { name: 'intro', label: 'Introduction', type: 'textarea' },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'phoneAlt', label: 'Alternative phone', type: 'text' },
          { name: 'email', label: 'Email', type: 'text' },
          { name: 'whatsapp', label: 'WhatsApp number (international format, e.g. 234...)', type: 'text' },
          { name: 'address', label: 'Address', type: 'textarea' },
          {
            name: 'mapEmbedUrl',
            label: 'Google Maps embed URL',
            type: 'text',
            hint: 'In Google Maps: Share → Embed a map → copy only the src="..." URL.',
          },
        ],
      },
      {
        title: 'Opening hours',
        fields: [
          list('openingHours', 'Opening hours', [
            { name: 'days', label: 'Days', type: 'text' },
            { name: 'hours', label: 'Hours', type: 'text' },
          ]),
        ],
      },
      {
        title: 'Help cards',
        fields: [
          { name: 'help.eyebrow', label: 'Small heading', type: 'text' },
          { name: 'help.title', label: 'Title', type: 'text' },
          list('help.items', 'Cards', [...titleText, ...link, image], SLOT_HINT('contact-help')),
        ],
      },
      {
        title: 'Frequently asked questions',
        fields: [
          list('faqs', 'Questions', [
            { name: 'question', label: 'Question', type: 'text' },
            { name: 'answer', label: 'Answer', type: 'textarea' },
          ]),
        ],
      },
    ],
  },
  {
    key: 'bulk',
    label: 'Bulk Orders Page',
    description: 'Text, buyer cards and the ordering process on the bulk order page.',
    groups: [
      {
        title: 'Bulk orders',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'intro', label: 'Introduction', type: 'textarea' },
          list('benefits', 'Benefits', titleText),
        ],
      },
      { title: 'Who we supply', fields: [...heading('buyers'), list('buyers.items', 'Buyer types', [...titleText, image], SLOT_HINT('bulk-buyers'))] },
      {
        title: 'How it works',
        fields: [
          { name: 'process.eyebrow', label: 'Small heading', type: 'text' },
          { name: 'process.title', label: 'Title', type: 'text' },
          list('process.items', 'Steps', titleText),
        ],
      },
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Footer text and social links.',
    groups: [
      {
        title: 'Footer',
        fields: [
          { name: 'about', label: 'Short company description', type: 'textarea' },
          { name: 'copyright', label: 'Copyright line', type: 'text' },
          list('socials', 'Social links', [
            { name: 'platform', label: 'Platform', type: 'select', options: ['Facebook', 'Instagram', 'X', 'LinkedIn', 'YouTube', 'TikTok'] },
            { name: 'url', label: 'URL', type: 'text' },
          ]),
        ],
      },
    ],
  },
  {
    key: 'announcement',
    label: 'Announcement Bar',
    description: 'Optional message shown above the header on every page.',
    groups: [
      {
        title: 'Announcement',
        fields: [
          { name: 'enabled', label: 'Show announcement', type: 'boolean' },
          { name: 'text', label: 'Message', type: 'text' },
          { name: 'linkLabel', label: 'Link label', type: 'text' },
          { name: 'link', label: 'Link URL', type: 'text' },
        ],
      },
    ],
  },
];

// Deep-merges saved CMS data over defaults. Arrays from saved data replace default arrays entirely.
export function mergeContent(defaults, saved) {
  if (saved === undefined || saved === null) return defaults;
  if (Array.isArray(defaults) || Array.isArray(saved)) return saved;
  if (typeof defaults !== 'object' || typeof saved !== 'object') return saved;
  const result = { ...defaults };
  Object.keys(saved).forEach((key) => {
    result[key] = mergeContent(defaults?.[key], saved[key]);
  });
  return result;
}

export const getPath = (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const clone = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cursor = clone;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = { ...(cursor[key] || {}) };
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
  return clone;
}
