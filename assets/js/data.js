/* Catalogue.
 *
 * This is a dealer in authentic pre-owned watches, so every entry is ONE
 * specific watch: it has a year, a condition, a set, and a stock of one. It is
 * not a product line with variants.
 *
 * ── READ THIS BEFORE LISTING ──────────────────────────────────────────────
 * The entries below are REAL references with published manufacturer
 * specifications, used as a working placeholder so the site has something
 * accurate to render. They are NOT your stock.
 *
 * Before any of this goes live:
 *   1. Replace these with the watches you actually hold.
 *   2. Verify every figure against the watch in hand and its papers. A
 *      specification copied from a spec sheet is not a description of the
 *      item you are selling.
 *   3. Set `price` from your own valuation. The figures here are indicative
 *      of the secondary market and will be wrong for your stock.
 *   4. Add photographs of the actual watch to `images`. Until you do, the
 *      listing shows a "photography to follow" panel rather than a stand-in
 *      picture, because a generic image of a different watch is a lie about
 *      what you are selling.
 * ──────────────────────────────────────────────────────────────────────────
 */

/* Brands. `id` is used in URLs and filters. */
const COLLECTIONS = [
  { id: 'rolex', name: 'Rolex', blurb: 'Submariner, GMT-Master, Daytona.' },
  { id: 'omega', name: 'Omega', blurb: 'Speedmaster and Seamaster.' },
  { id: 'tudor', name: 'Tudor', blurb: 'Black Bay and Pelagos.' },
  { id: 'cartier', name: 'Cartier', blurb: 'Santos, Tank, Ballon Bleu.' },
  { id: 'iwc', name: 'IWC', blurb: 'Pilot, Portugieser, Ingenieur.' },
  { id: 'audemars-piguet', name: 'Audemars Piguet', blurb: 'Royal Oak.' },
  { id: 'patek-philippe', name: 'Patek Philippe', blurb: 'Nautilus, Calatrava, Aquanaut.' },
  { id: 'panerai', name: 'Panerai', blurb: 'Luminor and Radiomir.' },
  { id: 'breitling', name: 'Breitling', blurb: 'Navitimer and Superocean.' },
];

const CONDITIONS = ['Unworn', 'Excellent', 'Very good', 'Good'];
const SETS = ['Full set', 'Watch and box', 'Watch and papers', 'Watch only'];

const PRODUCTS = [
  {
    id: 'rolex-126610ln',
    collection: 'rolex',
    name: 'Submariner Date',
    reference: '126610LN',
    year: 2023,
    condition: 'Unworn',
    set: 'Full set',
    price: 14200,
    tagline: 'Oystersteel on Oyster bracelet, black Cerachrom bezel.',
    description:
      'Unworn 2023 example with stickers intact, supplied with the original ' +
      'box, card and hang tags. Purchased from an authorised dealer; the card ' +
      'is dated and matches the case number.',
    images: [],
    specs: {
      'Case diameter': '41 mm',
      'Case material': 'Oystersteel',
      'Bezel': 'Unidirectional, black Cerachrom insert',
      'Movement': 'Rolex calibre 3235, automatic',
      'Power reserve': 'Approximately 70 hours',
      'Water resistance': '300 m',
      'Bracelet': 'Oyster, folding Oysterlock clasp with Glidelock',
    },
    size: 41, movement: 'automatic',
  },
  {
    id: 'rolex-126710blnr',
    collection: 'rolex',
    name: 'GMT-Master II',
    reference: '126710BLNR',
    year: 2021,
    condition: 'Excellent',
    set: 'Full set',
    price: 17800,
    tagline: 'Blue and black bezel on Jubilee bracelet.',
    description:
      'Worn sparingly and kept in a collection. Light surface marks to the ' +
      'clasp consistent with the stated condition, bracelet stretch minimal. ' +
      'Original box and card present.',
    images: [],
    specs: {
      'Case diameter': '40 mm',
      'Case material': 'Oystersteel',
      'Bezel': 'Bidirectional 24-hour, two-colour Cerachrom insert',
      'Movement': 'Rolex calibre 3285, automatic',
      'Power reserve': 'Approximately 70 hours',
      'Water resistance': '100 m',
      'Bracelet': 'Jubilee, folding Oysterlock clasp',
    },
    size: 40, movement: 'automatic',
  },
  {
    id: 'rolex-116500ln',
    collection: 'rolex',
    name: 'Cosmograph Daytona',
    reference: '116500LN',
    year: 2019,
    condition: 'Very good',
    set: 'Watch and papers',
    price: 27500,
    tagline: 'White dial, black Cerachrom bezel. Discontinued reference.',
    description:
      'Honest example of the discontinued 116500LN with visible wear to the ' +
      'bracelet and a light scratch on the case flank, photographed in detail. ' +
      'Card present, outer box not included.',
    images: [],
    specs: {
      'Case diameter': '40 mm',
      'Case material': 'Oystersteel',
      'Bezel': 'Fixed, black Cerachrom with tachymetric scale',
      'Movement': 'Rolex calibre 4130, automatic chronograph',
      'Power reserve': 'Approximately 72 hours',
      'Water resistance': '100 m',
      'Bracelet': 'Oyster, folding Oysterlock clasp',
    },
    size: 40, movement: 'automatic',
  },
  {
    id: 'omega-31030425001002',
    collection: 'omega',
    name: 'Speedmaster Moonwatch Professional',
    reference: '310.30.42.50.01.002',
    year: 2022,
    condition: 'Excellent',
    set: 'Full set',
    price: 6400,
    tagline: 'Hesalite crystal, co-axial Master Chronometer.',
    description:
      'The current-generation Moonwatch on the Hesalite crystal specification. ' +
      'Worn occasionally, no notable marks. Complete with the full presentation ' +
      'box, warranty card and extra strap.',
    images: [],
    specs: {
      'Case diameter': '42 mm',
      'Case material': 'Stainless steel',
      'Crystal': 'Hesalite, domed',
      'Movement': 'Omega calibre 3861, manual winding',
      'Power reserve': '50 hours',
      'Water resistance': '50 m',
      'Certification': 'METAS Master Chronometer',
    },
    size: 42, movement: 'manual',
  },
  {
    id: 'omega-21030422001001',
    collection: 'omega',
    name: 'Seamaster Diver 300M',
    reference: '210.30.42.20.01.001',
    year: 2020,
    condition: 'Excellent',
    set: 'Full set',
    price: 4300,
    tagline: 'Black ceramic bezel, laser-engraved wave dial.',
    description:
      'Regularly worn but carefully kept, with light marks to the bracelet ' +
      'only. Box, card and manuals present. Bracelet full length with all ' +
      'removed links included.',
    images: [],
    specs: {
      'Case diameter': '42 mm',
      'Case material': 'Stainless steel',
      'Bezel': 'Unidirectional, black ceramic with enamel scale',
      'Movement': 'Omega calibre 8800, automatic',
      'Power reserve': '55 hours',
      'Water resistance': '300 m',
      'Certification': 'METAS Master Chronometer',
    },
    size: 42, movement: 'automatic',
  },
  {
    id: 'tudor-79030n',
    collection: 'tudor',
    name: 'Black Bay Fifty-Eight',
    reference: '79030N',
    year: 2022,
    condition: 'Unworn',
    set: 'Full set',
    price: 3450,
    tagline: 'Thirty-nine millimetres, in-house Manufacture calibre.',
    description:
      'Unworn with protective stickers in place, on the riveted steel ' +
      'bracelet. Supplied with the original box, warranty card and the ' +
      'additional fabric strap.',
    images: [],
    specs: {
      'Case diameter': '39 mm',
      'Case material': 'Stainless steel',
      'Bezel': 'Unidirectional, black anodised aluminium insert',
      'Movement': 'Tudor Manufacture calibre MT5402, automatic',
      'Power reserve': 'Approximately 70 hours',
      'Water resistance': '200 m',
      'Certification': 'COSC chronometer',
    },
    size: 39, movement: 'automatic',
  },
  {
    id: 'cartier-wssa0018',
    collection: 'cartier',
    name: 'Santos de Cartier, large model',
    reference: 'WSSA0018',
    year: 2021,
    condition: 'Excellent',
    set: 'Full set',
    price: 6100,
    tagline: 'QuickSwitch bracelet with the interchangeable leather strap.',
    description:
      'Large model in steel with both the steel bracelet and the leather ' +
      'strap, each fitted with the QuickSwitch system. Minor marks to the ' +
      'bracelet, case sharp. Box and certificate present.',
    images: [],
    specs: {
      'Case size': '39.8 mm x 47.5 mm',
      'Case material': 'Stainless steel',
      'Movement': 'Cartier calibre 1847 MC, automatic',
      'Power reserve': 'Approximately 40 hours',
      'Water resistance': '100 m',
      'Bracelet': 'Steel with QuickSwitch, plus leather strap',
      'Crystal': 'Sapphire',
    },
    size: 39.8, movement: 'automatic',
  },
  {
    id: 'iwc-iw329301',
    collection: 'iwc',
    name: "Big Pilot's Watch 43",
    reference: 'IW329301',
    year: 2022,
    condition: 'Excellent',
    set: 'Full set',
    price: 7900,
    tagline: 'The 43 mm case, on the EasX-CHANGE bracelet.',
    description:
      'The smaller 43 mm Big Pilot with the soft-iron inner case. Supplied on ' +
      'the steel bracelet with the quick-change system, plus the original ' +
      'leather strap, box and papers.',
    images: [],
    specs: {
      'Case diameter': '43 mm',
      'Case material': 'Stainless steel',
      'Movement': 'IWC-manufactured calibre 82100, automatic',
      'Power reserve': '60 hours',
      'Water resistance': '100 m',
      'Crystal': 'Sapphire, secured against drops in pressure',
      'Bracelet': 'Steel with EasX-CHANGE, plus leather strap',
    },
    size: 43, movement: 'automatic',
  },
  {
    id: 'ap-15500st',
    collection: 'audemars-piguet',
    name: 'Royal Oak Selfwinding',
    reference: '15500ST.OO.1220ST.03',
    year: 2021,
    condition: 'Excellent',
    set: 'Full set',
    price: 38500,
    tagline: 'Forty-one millimetres, blue Grande Tapisserie dial.',
    description:
      'Worn lightly and kept boxed. Brushed surfaces crisp with no ' +
      'polishing, bevels sharp. Complete with box, certificate and the ' +
      'original purchase documentation.',
    images: [],
    specs: {
      'Case diameter': '41 mm',
      'Case material': 'Stainless steel',
      'Dial': 'Blue, Grande Tapisserie pattern',
      'Movement': 'Audemars Piguet calibre 4302, automatic',
      'Power reserve': 'Approximately 70 hours',
      'Water resistance': '50 m',
      'Bracelet': 'Integrated steel with AP folding clasp',
    },
    size: 41, movement: 'automatic',
  },
  {
    id: 'patek-5711-1a-010',
    collection: 'patek-philippe',
    name: 'Nautilus',
    reference: '5711/1A-010',
    year: 2019,
    condition: 'Very good',
    set: 'Full set',
    price: 92000,
    tagline: 'Blue dial, discontinued in 2021.',
    description:
      'The blue-dial steel Nautilus, discontinued in 2021. Light wear ' +
      'consistent with careful use, no polishing. Complete with box, ' +
      'certificate of origin and setting pin.',
    images: [],
    specs: {
      'Case diameter': '40 mm',
      'Case material': 'Stainless steel',
      'Dial': 'Blue with horizontal embossing',
      'Movement': 'Patek Philippe calibre 26-330 S C, automatic',
      'Power reserve': '35 to 45 hours',
      'Water resistance': '120 m',
      'Bracelet': 'Integrated steel with fold-over clasp',
    },
    size: 40, movement: 'automatic',
  },
  {
    id: 'panerai-pam01312',
    collection: 'panerai',
    name: 'Luminor Marina',
    reference: 'PAM01312',
    year: 2022,
    condition: 'Excellent',
    set: 'Full set',
    price: 6200,
    tagline: 'Forty-four millimetres, three-day movement.',
    description:
      'Brushed steel case with the crown-protecting bridge, on the original ' +
      'leather strap with a spare rubber strap included. Box, papers and the ' +
      'strap-change tool present.',
    images: [],
    specs: {
      'Case diameter': '44 mm',
      'Case material': 'Brushed stainless steel',
      'Movement': 'Panerai calibre P.9010, automatic',
      'Power reserve': '3 days',
      'Water resistance': '300 m',
      'Crystal': 'Sapphire, anti-reflective',
      'Strap': 'Leather, with additional rubber strap',
    },
    size: 44, movement: 'automatic',
  },
  {
    id: 'breitling-ab0138241c1p1',
    collection: 'breitling',
    name: 'Navitimer B01 Chronograph 43',
    reference: 'AB0138241C1P1',
    year: 2023,
    condition: 'Unworn',
    set: 'Full set',
    price: 7600,
    tagline: 'In-house B01 chronograph with the slide rule bezel.',
    description:
      'Unworn, stickered, on the alligator strap with folding clasp. ' +
      'Supplied with the full box set and warranty documentation dated 2023.',
    images: [],
    specs: {
      'Case diameter': '43 mm',
      'Case material': 'Stainless steel',
      'Bezel': 'Bidirectional, circular slide rule',
      'Movement': 'Breitling calibre 01, automatic chronograph',
      'Power reserve': 'Approximately 70 hours',
      'Water resistance': '30 m',
      'Certification': 'COSC chronometer',
    },
    size: 43, movement: 'automatic',
  },
];

/* Every listing is a single watch. */
PRODUCTS.forEach((p) => { p.stock = 1; });

const SHIPPING_FLAT = 0;          // insured delivery quoted per order
const FREE_SHIPPING_OVER = 0;

/* Where "Order on Telegram" points. Set this to the real account or channel. */
const TELEGRAM_HANDLE = 'swizzclones';
