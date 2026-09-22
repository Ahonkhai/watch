/* Swizz Clones — catalog data.
   Single source of truth for collections and products. Swap this file for a
   fetch() against a real commerce API and nothing else has to change. */

const COLLECTIONS = [
  {
    id: 'tidewater',
    name: 'Tidewater',
    tagline: 'Dive instruments, 300 m rated',
    blurb:
      'Built around a unidirectional bezel and a case that stays legible at depth. ' +
      'Every Tidewater is pressure-tested twice — once at the movement stage and ' +
      'once fully cased.',
  },
  {
    id: 'meridian',
    name: 'Meridian',
    tagline: 'Field and travel watches',
    blurb:
      'A second time zone, a dial you can read at a glance, and a case slim enough ' +
      'to disappear under a cuff. Made for people who keep two clocks in their head.',
  },
  {
    id: 'loft',
    name: 'Loft',
    tagline: 'Dress watches, quietly made',
    blurb:
      'Thin cases, applied indices, and hand-finished movements visible through a ' +
      'sapphire back. The Loft line is the least loud thing we make.',
  },
  {
    id: 'terrafirma',
    name: 'Terrafirma',
    tagline: 'Expedition-grade, built to be beaten',
    blurb:
      'Titanium cases, drilled lugs, and a movement suspended on a shock cage. ' +
      'Tested from −30 °C to 60 °C because someone, somewhere, will.',
  },
];

const PRODUCTS = [
  {
    id: 'tidewater-300',
    name: 'Tidewater 300',
    collection: 'tidewater',
    price: 1450,
    tagline: 'The one we are known for.',
    description:
      'The watch that paid for our workshop. A 40 mm steel diver with a ceramic ' +
      'bezel, a matte black dial, and enough lume to read it an hour into a night ' +
      'dive. Nothing on it is decorative.',
    badge: 'Bestseller',
    art: {
      case: 'steel', dial: '#101418', accent: '#C8A45C', bezel: 'dive',
      bezelColor: '#1B2026', hands: 'sword', lume: '#BFE8D9',
    },
    straps: [
      { id: 'bracelet', name: 'Steel bracelet', color: '#9BA3AB', type: 'bracelet' },
      { id: 'rubber', name: 'Black rubber', color: '#15181C', type: 'rubber' },
      { id: 'nato', name: 'Slate NATO', color: '#3C454E', type: 'nato' },
    ],
    specs: {
      'Case diameter': '40 mm',
      'Lug-to-lug': '47.5 mm',
      'Thickness': '11.8 mm',
      'Case material': '316L stainless steel',
      'Crystal': 'Sapphire, double AR',
      'Movement': 'Sellita SW200-1, automatic',
      'Power reserve': '38 hours',
      'Water resistance': '300 m',
      'Lug width': '20 mm',
    },
    size: 40, movement: 'automatic', stock: 12,
  },
  {
    id: 'tidewater-gmt',
    name: 'Tidewater GMT',
    collection: 'tidewater',
    price: 1890,
    tagline: 'Depth rating, second time zone.',
    description:
      'We kept the 300 m case and added a true traveller GMT — the local hour hand ' +
      'jumps forward or back without stopping the seconds. The bezel is 24-hour, ' +
      'so you can track a third zone if you are really committed.',
    art: {
      case: 'steel', dial: '#0E1B2A', finish: 'sunburst', accent: '#E06B4A', bezel: 'gmt',
      bezelColor: '#16283C', hands: 'sword', lume: '#BFE8D9',
    },
    straps: [
      { id: 'bracelet', name: 'Steel bracelet', color: '#9BA3AB', type: 'bracelet' },
      { id: 'leather', name: 'Tan leather', color: '#8A5A33', type: 'leather' },
    ],
    specs: {
      'Case diameter': '41 mm',
      'Lug-to-lug': '48 mm',
      'Thickness': '12.4 mm',
      'Case material': '316L stainless steel',
      'Crystal': 'Sapphire, double AR',
      'Movement': 'Soprod C125, automatic GMT',
      'Power reserve': '42 hours',
      'Water resistance': '300 m',
      'Lug width': '20 mm',
    },
    size: 41, movement: 'automatic', stock: 6,
  },
  {
    id: 'tidewater-bronze',
    name: 'Tidewater Bronze',
    collection: 'tidewater',
    price: 1680,
    tagline: 'Ages the way you do.',
    description:
      'CuSn8 bronze case that patinas to whatever your wrist and your climate decide. ' +
      'The caseback is titanium, so the part touching skin never turns green. ' +
      'Limited to 300 pieces a year.',
    badge: 'Limited',
    art: {
      case: 'bronze', dial: '#1D2A21', finish: 'sunburst', accent: '#D8B978', bezel: 'dive',
      bezelColor: '#2A3A2E', hands: 'sword', lume: '#E4D3A0',
    },
    straps: [
      { id: 'leather', name: 'Oiled brown leather', color: '#6E4526', type: 'leather' },
      { id: 'nato', name: 'Olive NATO', color: '#4A5039', type: 'nato' },
    ],
    specs: {
      'Case diameter': '42 mm',
      'Lug-to-lug': '49 mm',
      'Thickness': '13 mm',
      'Case material': 'CuSn8 bronze, titanium back',
      'Crystal': 'Sapphire, box profile',
      'Movement': 'Sellita SW200-1, automatic',
      'Power reserve': '38 hours',
      'Water resistance': '300 m',
      'Lug width': '22 mm',
    },
    size: 42, movement: 'automatic', stock: 3,
  },
  {
    id: 'meridian-38',
    name: 'Meridian 38',
    collection: 'meridian',
    price: 980,
    tagline: 'A field watch with the volume turned down.',
    description:
      'Sandblasted steel, a sector dial, and syringe hands. At 38 mm and 10.2 mm ' +
      'thick it fits under anything, which is the entire point of a field watch ' +
      'people actually wear.',
    badge: 'Bestseller',
    art: {
      case: 'steel', dial: '#E8E3D8', accent: '#1B1F24', bezel: 'fixed',
      bezelColor: '#A8B0B8', hands: 'syringe', lume: '#C9B283',
    },
    straps: [
      { id: 'leather', name: 'Grey suede', color: '#6B6E70', type: 'leather' },
      { id: 'nato', name: 'Khaki NATO', color: '#7C7351', type: 'nato' },
      { id: 'bracelet', name: 'Steel bracelet', color: '#9BA3AB', type: 'bracelet' },
    ],
    specs: {
      'Case diameter': '38 mm',
      'Lug-to-lug': '45 mm',
      'Thickness': '10.2 mm',
      'Case material': '316L stainless steel, sandblasted',
      'Crystal': 'Sapphire, box profile',
      'Movement': 'Miyota 9039, automatic',
      'Power reserve': '42 hours',
      'Water resistance': '100 m',
      'Lug width': '19 mm',
    },
    size: 38, movement: 'automatic', stock: 21,
  },
  {
    id: 'meridian-worldtimer',
    name: 'Meridian Worldtimer',
    collection: 'meridian',
    price: 2350,
    tagline: 'Twenty-four cities, one crown.',
    description:
      'A rotating city ring under a fired-enamel dial. Set your home city at noon ' +
      'and every other time zone reads off the chapter ring. The most complicated ' +
      'thing we build, and still only 11.6 mm thick.',
    art: {
      case: 'steel', dial: '#16324F', finish: 'sunburst', accent: '#D6C08A', bezel: 'worldtimer',
      bezelColor: '#25415E', hands: 'dauphine', lume: '#D9E8F0',
    },
    straps: [
      { id: 'leather', name: 'Navy alligator-grain', color: '#22334A', type: 'leather' },
      { id: 'bracelet', name: 'Steel bracelet', color: '#9BA3AB', type: 'bracelet' },
    ],
    specs: {
      'Case diameter': '39.5 mm',
      'Lug-to-lug': '46 mm',
      'Thickness': '11.6 mm',
      'Case material': '316L stainless steel, polished',
      'Crystal': 'Sapphire, double AR',
      'Movement': 'La Joux-Perret G101 with worldtime module',
      'Power reserve': '68 hours',
      'Water resistance': '50 m',
      'Lug width': '20 mm',
    },
    size: 39.5, movement: 'automatic', stock: 4,
  },
  {
    id: 'meridian-quartz',
    name: 'Meridian Quartz',
    collection: 'meridian',
    price: 420,
    tagline: 'Set it once a year. Forget it.',
    description:
      'The same sector dial as the 38, driven by a thermocompensated quartz movement ' +
      'accurate to ±10 seconds a year. Our answer to everyone who asked for something ' +
      'they could leave in a drawer.',
    art: {
      case: 'steel', dial: '#1A1D21', accent: '#BFC5CB', bezel: 'fixed',
      bezelColor: '#8E979F', hands: 'syringe', lume: '#C9B283',
    },
    straps: [
      { id: 'nato', name: 'Black NATO', color: '#1C1F23', type: 'nato' },
      { id: 'leather', name: 'Black leather', color: '#26282B', type: 'leather' },
    ],
    specs: {
      'Case diameter': '37 mm',
      'Lug-to-lug': '44 mm',
      'Thickness': '8.4 mm',
      'Case material': '316L stainless steel',
      'Crystal': 'Sapphire, single AR',
      'Movement': 'ETA F06.415, thermocompensated quartz',
      'Battery life': '5 years',
      'Water resistance': '100 m',
      'Lug width': '18 mm',
    },
    size: 37, movement: 'quartz', stock: 40,
  },
  {
    id: 'loft-ultrathin',
    name: 'Loft Ultrathin',
    collection: 'loft',
    price: 2780,
    tagline: 'Six point eight millimetres.',
    description:
      'A hand-wound dress watch with a grand-feu enamel dial and blued steel hands. ' +
      'The movement is finished by one watchmaker start to finish, and the caseback ' +
      'is sapphire so you can check their work.',
    art: {
      case: 'gold', dial: '#F2EDE3', accent: '#2A3550', bezel: 'thin',
      bezelColor: '#C9A44E', hands: 'dauphine', lume: null,
    },
    straps: [
      { id: 'leather', name: 'Black alligator-grain', color: '#1E1E20', type: 'leather' },
      { id: 'leather-brown', name: 'Chestnut leather', color: '#5E3A22', type: 'leather' },
    ],
    specs: {
      'Case diameter': '38 mm',
      'Lug-to-lug': '44.5 mm',
      'Thickness': '6.8 mm',
      'Case material': '18k rose gold',
      'Crystal': 'Sapphire, double AR, sapphire caseback',
      'Movement': 'Swizz cal. 2, hand-wound',
      'Power reserve': '72 hours',
      'Water resistance': '30 m',
      'Lug width': '19 mm',
    },
    size: 38, movement: 'hand-wound', stock: 2,
  },
  {
    id: 'loft-sector',
    name: 'Loft Sector',
    collection: 'loft',
    price: 1240,
    tagline: 'A 1940s dial, drawn again from scratch.',
    description:
      'Two-tone sector dial, printed rather than applied, with a small seconds ' +
      'register at six. We redrew the numerals rather than copying a vintage ' +
      'reference — they are ours, and they are better spaced.',
    art: {
      case: 'steel', dial: '#EFE9DC', accent: '#232323', bezel: 'thin',
      bezelColor: '#AEB5BC', hands: 'leaf', lume: null, subdial: true,
    },
    straps: [
      { id: 'leather', name: 'Cognac leather', color: '#7A4A24', type: 'leather' },
      { id: 'leather-black', name: 'Black leather', color: '#26282B', type: 'leather' },
    ],
    specs: {
      'Case diameter': '36.5 mm',
      'Lug-to-lug': '43 mm',
      'Thickness': '9.1 mm',
      'Case material': '316L stainless steel, polished',
      'Crystal': 'Sapphire, box profile',
      'Movement': 'Sellita SW261-1, automatic small seconds',
      'Power reserve': '38 hours',
      'Water resistance': '50 m',
      'Lug width': '18 mm',
    },
    size: 36.5, movement: 'automatic', stock: 9,
  },
  {
    id: 'loft-moonphase',
    name: 'Loft Moonphase',
    collection: 'loft',
    price: 3150,
    tagline: 'Accurate to a day every 122 years.',
    description:
      'An aventurine moonphase disc at twelve, cut from a single slab so the ' +
      'flecking is different on every watch. The correction is set through the ' +
      'crown — no pushers, no tools, no tiny hole in the case.',
    badge: 'New',
    art: {
      case: 'steel', dial: '#151B2E', finish: 'sunburst', accent: '#D6C08A', bezel: 'thin',
      bezelColor: '#AEB5BC', hands: 'dauphine', lume: null, moon: true,
    },
    straps: [
      { id: 'leather', name: 'Midnight alligator-grain', color: '#1B2136', type: 'leather' },
      { id: 'bracelet', name: 'Steel bracelet', color: '#9BA3AB', type: 'bracelet' },
    ],
    specs: {
      'Case diameter': '39 mm',
      'Lug-to-lug': '45.5 mm',
      'Thickness': '10.4 mm',
      'Case material': '316L stainless steel',
      'Crystal': 'Sapphire, double AR, sapphire caseback',
      'Movement': 'La Joux-Perret G100 with moonphase module',
      'Power reserve': '68 hours',
      'Water resistance': '50 m',
      'Lug width': '20 mm',
    },
    size: 39, movement: 'automatic', stock: 5,
  },
  {
    id: 'terrafirma-ti',
    name: 'Terrafirma Ti',
    collection: 'terrafirma',
    price: 1620,
    tagline: 'Grade 5 titanium. Drilled lugs. No apologies.',
    description:
      'The movement sits on a silicone shock cage, the lugs are drilled so you can ' +
      'change straps in a tent with a paperclip, and the crown guards are machined ' +
      'from the case rather than welded on.',
    badge: 'Bestseller',
    art: {
      case: 'titanium', dial: '#23282C', accent: '#E0A33C', bezel: 'fixed',
      bezelColor: '#6F7679', hands: 'sword', lume: '#D8C48A',
    },
    straps: [
      { id: 'nato', name: 'Coyote NATO', color: '#7A6A4F', type: 'nato' },
      { id: 'rubber', name: 'Graphite rubber', color: '#2A2E32', type: 'rubber' },
      { id: 'bracelet', name: 'Titanium bracelet', color: '#878D90', type: 'bracelet' },
    ],
    specs: {
      'Case diameter': '41 mm',
      'Lug-to-lug': '47 mm',
      'Thickness': '11.9 mm',
      'Case material': 'Grade 5 titanium, bead-blasted',
      'Crystal': 'Sapphire, double AR',
      'Movement': 'Miyota 9015, automatic, shock-mounted',
      'Power reserve': '42 hours',
      'Water resistance': '200 m',
      'Lug width': '22 mm',
    },
    size: 41, movement: 'automatic', stock: 15,
  },
  {
    id: 'terrafirma-alpine',
    name: 'Terrafirma Alpine',
    collection: 'terrafirma',
    price: 1980,
    tagline: 'Tested from −30 °C to 60 °C.',
    description:
      'A compressor-style case with an internal rotating bezel driven by a second ' +
      'crown, so nothing snags on a pack strap. The lubricants are rated for cold ' +
      'that would stop an ordinary movement dead.',
    art: {
      case: 'titanium', dial: '#1C2B24', finish: 'sunburst', accent: '#E8E2D2', bezel: 'compressor',
      bezelColor: '#5F6A64', hands: 'sword', lume: '#BFE8D9',
    },
    straps: [
      { id: 'rubber', name: 'Black rubber', color: '#15181C', type: 'rubber' },
      { id: 'nato', name: 'Forest NATO', color: '#3A4A3C', type: 'nato' },
    ],
    specs: {
      'Case diameter': '42 mm',
      'Lug-to-lug': '48.5 mm',
      'Thickness': '13.2 mm',
      'Case material': 'Grade 5 titanium',
      'Crystal': 'Sapphire, double AR',
      'Movement': 'Sellita SW200-1, low-temperature lubricants',
      'Power reserve': '38 hours',
      'Water resistance': '200 m',
      'Lug width': '22 mm',
    },
    size: 42, movement: 'automatic', stock: 7,
  },
  {
    id: 'terrafirma-solar',
    name: 'Terrafirma Solar',
    collection: 'terrafirma',
    price: 690,
    tagline: 'Ten months of darkness on a full charge.',
    description:
      'A solar movement under a translucent dial, which means no battery changes and ' +
      'no winding. Leave it in a drawer for most of a year and it will still be ' +
      'running when you find it.',
    badge: 'New',
    art: {
      case: 'black', dial: '#2C3338', accent: '#5FD3A8', bezel: 'fixed',
      bezelColor: '#22262A', hands: 'syringe', lume: '#8FE8C4',
    },
    straps: [
      { id: 'rubber', name: 'Black rubber', color: '#15181C', type: 'rubber' },
      { id: 'nato', name: 'Charcoal NATO', color: '#31363B', type: 'nato' },
    ],
    specs: {
      'Case diameter': '40 mm',
      'Lug-to-lug': '46 mm',
      'Thickness': '10.8 mm',
      'Case material': 'DLC-coated stainless steel',
      'Crystal': 'Sapphire, single AR',
      'Movement': 'Seiko VS75, solar quartz',
      'Full-charge reserve': '10 months',
      'Water resistance': '100 m',
      'Lug width': '20 mm',
    },
    size: 40, movement: 'solar', stock: 26,
  },
];

const SHIPPING_FLAT = 25;
const FREE_SHIPPING_OVER = 1500;
