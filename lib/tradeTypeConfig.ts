// Central trade-type configuration.
//
// Every trade type defines what it sells, which prediction lenses are
// relevant, and how weather should bias demand. Components read from
// here rather than hard-coding "if tradeType === 'Coffee'", so adding a
// new trade is one entry rather than touching every screen.
//
// New trade types should be added here AND to TRADE_CATEGORIES in
// types/cogs.ts (which controls which menu/COGS categories show up).

/** Canonical kind a prediction component should render. */
export type PredictionKind =
  | 'drink_split'      // hot vs iced split (coffee, beverage-led traders)
  | 'food_attach'      // mains + sides/drinks attachment forecast
  | 'cold_demand'      // weather-heavy cold/frozen (ice cream, soft serve)
  | 'morning_bake'     // bakery — morning peak, weather mostly secondary
  | 'evening_sweet'    // dessert — evening + family demand
  | 'beverage_mix'     // bar/drinks — alcohol vs softs split
  | 'general_demand';  // catch-all for unknown / "Other"

/** Demand sensitivity: how much weather should swing the forecast. */
export type WeatherSensitivity = 'low' | 'medium' | 'high';

export interface PredictionLens {
  /** Stable id consumed by the UI to pick a renderer. */
  kind: PredictionKind;
  /** Friendly section title above the prediction card. */
  title: string;
  /** One-line tagline shown under the title. */
  tagline: string;
  /** Lines of insight the prediction component should highlight. */
  drivers: string[];
}

export interface TradeTypeConfig {
  /** As stored in profile.business_type. */
  key: string;
  /** Pretty label (matches BUSINESS_TYPES list). */
  label: string;
  /** Categories from types/cogs.ts CATEGORY_DEFINITIONS that map to this trade. */
  menuCategories: string[];
  /** Prediction sections to render — order matters. */
  predictionLenses: PredictionLens[];
  /** How much weather should drive the forecast. */
  weatherSensitivity: WeatherSensitivity;
  /** Free-form one-liner describing the typical demand pattern. */
  demandPattern: string;
  /** Whether the legacy hot/iced drink split engine applies as-is. */
  showCoffeeDrinkEngine: boolean;
  /** Whether to surface food/mains attachment-rate predictions. */
  showFoodMainsEngine: boolean;
}

const COFFEE: TradeTypeConfig = {
  key: 'Coffee',
  label: 'Coffee',
  menuCategories: ['hot_drinks', 'cold_drinks', 'specials', 'bakes', 'other'],
  predictionLenses: [
    {
      kind: 'drink_split',
      title: 'Hot vs Iced Forecast',
      tagline: 'Predicted hot-to-iced drink split, adjusted for weather and your trading history.',
      drivers: ['Cold weather → more hot drinks', 'Warm weather → more iced', 'Morning peak typical'],
    },
  ],
  weatherSensitivity: 'high',
  demandPattern: 'Morning peak, then a long tail. Hot/iced split swings hard with temperature.',
  showCoffeeDrinkEngine: true,
  showFoodMainsEngine: false,
};

const BURGER: TradeTypeConfig = {
  key: 'Burgers',
  label: 'Burgers',
  menuCategories: ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'],
  predictionLenses: [
    {
      kind: 'food_attach',
      title: 'Mains & attachment forecast',
      tagline: 'Burgers demand, plus sides, drinks, extras and specials per order.',
      drivers: [
        'Lunch & dinner rushes drive mains',
        'Sides (fries) attach at ~70%+ of mains',
        'Hot weather lifts cold drinks attachment',
        'Extras & toppings rise on weekend / family events',
        'Specials sell strongest in the first two hours',
      ],
    },
  ],
  weatherSensitivity: 'medium',
  demandPattern: 'Two clear meal peaks. Drink attachment rises in heat; sides remain flat.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: true,
};

const PIZZA: TradeTypeConfig = {
  key: 'Pizza',
  label: 'Pizza',
  menuCategories: ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'],
  predictionLenses: [
    {
      kind: 'food_attach',
      title: 'Pizza demand forecast',
      tagline: 'Whole/slice mix, dough portion guidance, sides and drinks attach.',
      drivers: [
        'Lunch & dinner peaks',
        'Family events drive whole-pizza share',
        'Sides (garlic bread / dough balls) attach steadily',
        'Hot weather softens overall demand but lifts drinks',
        'Specials drive trial — prep extra dough on launch days',
      ],
    },
  ],
  weatherSensitivity: 'medium',
  demandPattern: 'Bursty around meal times. Dough prep is the hard constraint.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: true,
};

const STREET_FOOD: TradeTypeConfig = {
  key: 'Street Food',
  label: 'Street Food',
  menuCategories: ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'],
  predictionLenses: [
    {
      kind: 'food_attach',
      title: 'Street food demand forecast',
      tagline: 'Mains volume with sides, drinks and extras attachment.',
      drivers: [
        'Meal-time rushes drive mains',
        'Sides attach at ~50-70% of mains',
        'Hot weather lifts drinks; cold weather lifts hot food',
        'Extras / specials rise on weekend / family events',
        'Footfall is the dominant driver of total volume',
      ],
    },
  ],
  weatherSensitivity: 'medium',
  demandPattern: 'Footfall-led. Predict mains first, attach sides/drinks against actual mains.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: true,
};

const ASIAN_FOOD: TradeTypeConfig = {
  ...STREET_FOOD,
  key: 'Asian Food',
  label: 'Asian Food',
  menuCategories: ['mains', 'sides', 'drinks', 'specials', 'extras', 'sauces', 'other'],
  predictionLenses: [{
    ...STREET_FOOD.predictionLenses[0],
    title: 'Asian food demand forecast',
    drivers: ['Lunch & dinner peaks', 'Sauce/topping attachment', 'Drinks rise in heat'],
  }],
};

const MEXICAN_FOOD: TradeTypeConfig = {
  ...STREET_FOOD,
  key: 'Mexican Food',
  label: 'Mexican Food',
  menuCategories: ['mains', 'sides', 'drinks', 'specials', 'extras', 'sauces', 'other'],
  predictionLenses: [{
    ...STREET_FOOD.predictionLenses[0],
    title: 'Tacos & burritos demand forecast',
    drivers: ['Lunch & dinner peaks', 'Topping/salsa attachment', 'Hot weather lifts cold drinks'],
  }],
};

const ICE_CREAM: TradeTypeConfig = {
  key: 'Ice Cream',
  label: 'Ice Cream',
  menuCategories: ['ice_cream', 'desserts', 'toppings', 'drinks', 'specials', 'other'],
  predictionLenses: [
    {
      kind: 'cold_demand',
      title: 'Heat-driven demand forecast',
      tagline: 'Ice cream and cold dessert demand swings hard with temperature.',
      drivers: [
        'Hot, sunny days → strong ice cream demand',
        'Cold desserts attach to peak heat hours',
        'Toppings drive margin — push on family events',
        'Rain → footfall collapses fast',
        'School-holiday / weekend events lift baseline',
      ],
    },
  ],
  weatherSensitivity: 'high',
  demandPattern: 'Highly weather-elastic. A hot day can be 4× a cool one for the same crowd size.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: false,
};

const DESSERTS: TradeTypeConfig = {
  key: 'Desserts',
  label: 'Desserts',
  menuCategories: ['desserts', 'cakes', 'drinks', 'specials', 'extras', 'other'],
  predictionLenses: [
    {
      kind: 'evening_sweet',
      title: 'Evening dessert forecast',
      tagline: 'Desserts trade after main meal services and at family events.',
      drivers: ['Evening peak', 'Family events lift demand', 'Cold weather → hot desserts; warm → cold desserts'],
    },
  ],
  weatherSensitivity: 'medium',
  demandPattern: 'Late peak. Hot/cold mix swings with weather but volume is footfall-led.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: false,
};

const BAKERY: TradeTypeConfig = {
  key: 'Bakery',
  label: 'Bakery',
  menuCategories: ['bakes', 'bread', 'pastries', 'cakes', 'hot_drinks', 'cold_drinks', 'other'],
  predictionLenses: [
    {
      kind: 'morning_bake',
      title: 'Morning bake forecast',
      tagline: 'Bakery sells out early — predict prep, not peaks.',
      drivers: ['Morning peak heaviest', 'Weather only mildly affects bakery footfall', 'Stock-out risk if under-prepped'],
    },
  ],
  weatherSensitivity: 'low',
  demandPattern: 'Front-loaded. Risk is under-prep, not weather.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: false,
};

const COCKTAILS_BAR: TradeTypeConfig = {
  key: 'Cocktails',
  label: 'Cocktails',
  menuCategories: ['cocktails', 'alcohol', 'cold_drinks', 'specials', 'sides', 'other'],
  predictionLenses: [
    {
      kind: 'beverage_mix',
      title: 'Bar demand forecast',
      tagline: 'Soft vs alcoholic mix by event type and time of day.',
      drivers: ['Evening peaks', 'Hot weather → more cold drinks', 'Event duration lifts baseline'],
    },
  ],
  weatherSensitivity: 'medium',
  demandPattern: 'Long sustained service in evenings. Cold-soft attachment scales with heat.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: false,
};

const CRAFT_BEER: TradeTypeConfig = {
  ...COCKTAILS_BAR,
  key: 'Craft Beer',
  label: 'Craft Beer',
  menuCategories: ['alcohol', 'cold_drinks', 'sides', 'specials', 'other'],
};

const WINE: TradeTypeConfig = {
  ...COCKTAILS_BAR,
  key: 'Wine',
  label: 'Wine',
  menuCategories: ['alcohol', 'cold_drinks', 'sides', 'specials', 'other'],
};

const JUICE_SMOOTHIES: TradeTypeConfig = {
  key: 'Juice & Smoothies',
  label: 'Juice & Smoothies',
  menuCategories: ['smoothies', 'cold_drinks', 'mains', 'specials', 'other'],
  predictionLenses: [
    {
      kind: 'cold_demand',
      title: 'Cold drink demand forecast',
      tagline: 'Highly weather-led — heat drives smoothie demand.',
      drivers: ['Hot weather → strong demand', 'Sunny days lift fitness/family events', 'Rain → demand falls fast'],
    },
  ],
  weatherSensitivity: 'high',
  demandPattern: 'Warm-weather-led. Stock perishables to forecast, not just last week.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: false,
};

const CREPES: TradeTypeConfig = {
  key: 'Crepes',
  label: 'Crepes',
  menuCategories: ['mains', 'desserts', 'drinks', 'specials', 'toppings', 'other'],
  predictionLenses: [
    {
      kind: 'food_attach',
      title: 'Crepe demand forecast',
      tagline: 'Sweet vs savoury mix and topping attachment.',
      drivers: ['Lunch & evening peaks', 'Sweet share rises in afternoon', 'Topping attachment is high'],
    },
  ],
  weatherSensitivity: 'medium',
  demandPattern: 'Two peaks. Topping mix needs prep planning.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: true,
};

const WAFFLES: TradeTypeConfig = {
  ...CREPES,
  key: 'Waffles',
  label: 'Waffles',
  predictionLenses: [{
    ...CREPES.predictionLenses[0],
    title: 'Waffle demand forecast',
  }],
};

const OTHER: TradeTypeConfig = {
  key: 'Other',
  label: 'Other',
  menuCategories: ['mains', 'sides', 'drinks', 'specials', 'extras', 'other'],
  predictionLenses: [
    {
      kind: 'general_demand',
      title: 'General demand forecast',
      tagline: 'Footfall-weighted forecast with weather adjustment.',
      drivers: ['Meal-time peaks if applicable', 'Weather affects drinks attachment', 'Event duration drives baseline'],
    },
  ],
  weatherSensitivity: 'medium',
  demandPattern: 'Generic forecast. Add a specific trade type for sharper predictions.',
  showCoffeeDrinkEngine: false,
  showFoodMainsEngine: true,
};

const ALL_CONFIGS: TradeTypeConfig[] = [
  COFFEE, BURGER, PIZZA, STREET_FOOD, ASIAN_FOOD, MEXICAN_FOOD,
  ICE_CREAM, DESSERTS, BAKERY,
  COCKTAILS_BAR, CRAFT_BEER, WINE,
  JUICE_SMOOTHIES, CREPES, WAFFLES,
  OTHER,
];

const CONFIG_BY_KEY: Record<string, TradeTypeConfig> = Object.fromEntries(
  ALL_CONFIGS.map((c) => [c.key, c]),
);

/** Resolve config for a trade type key. Falls back to OTHER for unknown
 *  keys so the UI never crashes when a profile has a stale value. */
export function getTradeConfig(tradeType: string | null | undefined): TradeTypeConfig {
  return CONFIG_BY_KEY[normalizeTradeType(tradeType)] ?? OTHER;
}

/** Convenience: just the prediction kinds for a trade. Used by callers
 *  who need to know whether to fetch supporting data (e.g. daily takings
 *  for the drink-split engine). */
export function getPredictionKinds(tradeType: string | null | undefined): PredictionKind[] {
  return getTradeConfig(tradeType).predictionLenses.map((l) => l.kind);
}

/**
 * Normalise free-text trade type input into one of the canonical config keys.
 * Handles capitalisation, separators, and common aliases ("coffee_cart",
 * "Coffee Van", "burgers" → "Burgers", etc.). Returns 'Other' for unknown
 * values — never returns null, so callers can rely on it always resolving.
 *
 * Order: aliases first (so plurals/synonyms reach the right canonical key),
 * then exact-match fallback against the registered keys.
 */
export function normalizeTradeType(raw: string | null | undefined): string {
  if (!raw) return 'Other';
  const cleaned = String(raw).trim().toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');
  if (!cleaned) return 'Other';

  // Direct alias hits — match by substring on the simplified input.
  const aliasMap: Array<[RegExp, string]> = [
    [/\bcoffee\b/,        'Coffee'],
    [/\bespresso\b/,      'Coffee'],
    [/\bcafe\b/,          'Coffee'],
    [/\bburger/,          'Burgers'],
    [/\bpizza/,           'Pizza'],
    [/\bice\s?cream/,     'Ice Cream'],
    [/\bgelato/,          'Ice Cream'],
    [/\bsoft\s?serve/,    'Ice Cream'],
    [/\bdessert/,         'Desserts'],
    [/\bcake/,            'Desserts'],
    [/\b(bakery|baker|bake)\b/, 'Bakery'],
    [/\bbread\b/,         'Bakery'],
    [/\bpastr/,           'Bakery'],
    [/\bcocktail/,        'Cocktails'],
    [/\bbar\b/,           'Cocktails'],
    [/\bcraft\s?beer|beer\b/, 'Craft Beer'],
    [/\bwine\b/,          'Wine'],
    [/\bjuice|smoothie/,  'Juice & Smoothies'],
    [/\bcrepe|crêpe/,     'Crepes'],
    [/\bwaffle/,          'Waffles'],
    [/\basian/,           'Asian Food'],
    [/\bnoodle|ramen|sushi|thai|chinese|vietnamese|korean|japanese/, 'Asian Food'],
    [/\bmexican|taco|burrito|quesadilla/, 'Mexican Food'],
    [/\bstreet\s?food/,   'Street Food'],
  ];
  for (const [re, key] of aliasMap) if (re.test(cleaned)) return key;

  // Title-case the cleaned input and try the exact CONFIG_BY_KEY lookup.
  const titled = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  if (titled in CONFIG_BY_KEY) return titled;
  return 'Other';
}

/**
 * Single source of truth for "what trade is this user". Reads from a
 * profile-shaped object and returns a canonical trade-type key. Never
 * defaults to Coffee — falls back to Other so general-demand
 * predictions kick in for unset accounts.
 */
export function getActiveTradeType(
  profile: { business_type?: string | null } | null | undefined,
): string {
  return normalizeTradeType(profile?.business_type ?? null);
}
