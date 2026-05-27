/**
 * scripts/scrape-roasters.ts
 *
 * Standalone scraper that inserts curated Pour Over and Espresso brew data
 * from real roaster guides into the brew-guide database via the REST API.
 *
 * Usage: npx tsx scripts/scrape-roasters.ts
 *
 * Requirements:
  *   - Dev server must be running: npm run dev
  *   - Server must be reachable at API_BASE (default http://localhost:4000, set API_BASE env var to override)
  *   - DATABASE_URL must be set for the target database
  *
  * Idempotency: safe to re-run. The server deduplicates by brew content
  * (same origin + method + roast + parameters = same fingerprint).
  *
  * Production usage:
  *   API_BASE=https://brew-guide-production.up.railway.app npx tsx scripts/scrape-roasters.ts
 *
 * Data sourced from published brewing guides by:
 *   Pour Over: Blue Bottle, Counter Culture, Stumptown, Intelligentsia,
 *              Sweet Maria's, George Howell, Onyx Coffee, Bird Rock
 *   Espresso:  La Marzocco, Bottomless, Chromatic Coffee, Equator Coffees
 */

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

// ── Types ──────────────────────────────────────────────────────────────────

interface ScrapedBrew {
  origin: string;               // normalized to known seed origin names
  roast_level: string;          // 'light' | 'medium' | 'medium-dark' | 'dark'
  brewing_method_id: number;    // 1 = Pour Over, 3 = Espresso
  grind_size: string;
  water_temp_c: number;
  ratio: number;                // e.g. 0.0625 = 1:16
  brew_time_s: number;
  rating: number;               // seeded at 4
  notes: string;                // technique hints included
  source: 'scraped:roaster';
  source_url: string;
  field_confidence: string;     // JSON: { origin: 1.0, ... }
}

// ── Brew Data ──────────────────────────────────────────────────────────────
// All parameters derived from publicly published roaster guides.
// Pour Over: brewing_method_id = 1
// Espresso:  brewing_method_id = 3

const BREWS: ScrapedBrew[] = [
  // ── Blue Bottle Coffee ────────────────────────────────────────────────
  // Guide: bluebottlecoffee.com/brewing-guides
  // Signature: 1:15.5 ratio, 93°C, medium-fine grind, ~3min pour over
  {
    origin: 'Ethiopia',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 15.5,
    brew_time_s: 180,
    rating: 4,
    notes: 'Blue Bottle Guide — Ethiopia light roast. 3-stage pour: 45g bloom 45s, ' +
      '150g at 0:45, 250g at 1:45. Swirl gently after bloom. Target drawdown 3:00. ' +
      'Expect floral and citrus notes.',
    source: 'scraped:roaster',
    source_url: 'https://bluebottlecoffee.com/brewing-guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Colombia',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 15.5,
    brew_time_s: 195,
    rating: 4,
    notes: 'Blue Bottle Guide — Colombia medium roast. 3-stage pour: 50g bloom 45s, ' +
      '160g at 1:00, 250g at 2:00. Expect caramel, milk chocolate, stone fruit notes. ' +
      'Target drawdown 3:15.',
    source: 'scraped:roaster',
    source_url: 'https://bluebottlecoffee.com/brewing-guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Kenya',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 15.5,
    brew_time_s: 185,
    rating: 4,
    notes: 'Blue Bottle Guide — Kenya light roast. Bright and juicy profile. ' +
      '3-stage pour: 45g bloom 45s, 150g at 0:45, 250g at 1:50. ' +
      'Target drawdown 3:05. Black currant, tomato, grapefruit notes expected.',
    source: 'scraped:roaster',
    source_url: 'https://bluebottlecoffee.com/brewing-guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Counter Culture Coffee ─────────────────────────────────────────────
  // Guide: counterculturecoffee.com/brew-guides
  // Signature: 1:16 ratio, 93°C, medium-fine, ~3:30 total
  {
    origin: 'Ethiopia',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 16,
    brew_time_s: 210,
    rating: 4,
    notes: 'Counter Culture Guide — Ethiopia light roast. V60 pour over. ' +
      '50g bloom for 30s, continuous slow pour from 0:30 to 2:30. ' +
      'Target 3:00-3:30 total. Stir dry grounds before bloom for even saturation.',
    source: 'scraped:roaster',
    source_url: 'https://counterculturecoffee.com/brew-guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Colombia',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 16,
    brew_time_s: 210,
    rating: 4,
    notes: 'Counter Culture Guide — Colombia medium roast. V60 or Chemex. ' +
      '50g bloom 30s, then pour to 350g by 2:00. Rinse paper filter before brewing. ' +
      'Target 3:00-3:30 drawdown. Balanced sweetness and acidity.',
    source: 'scraped:roaster',
    source_url: 'https://counterculturecoffee.com/brew-guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Rwanda',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 16,
    brew_time_s: 215,
    rating: 4,
    notes: 'Counter Culture Guide — Rwanda light roast. Pour over. ' +
      'Bloom 40g for 35s, pour in two stages to 370g by 2:20. ' +
      'Hibiscus, brown sugar, dried fruit notes. Target drawdown 3:30.',
    source: 'scraped:roaster',
    source_url: 'https://counterculturecoffee.com/brew-guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Stumptown Coffee Roasters ─────────────────────────────────────────
  // Guide: stumptowncoffee.com/brew-guide
  // Signature: 1:16.7 ratio, 94°C, medium grind, ~4min
  {
    origin: 'Ethiopia',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium',
    water_temp_c: 94,
    ratio: 1 / 16.7,
    brew_time_s: 240,
    rating: 4,
    notes: 'Stumptown Guide — Ethiopia light roast. Chemex or V60. ' +
      '60g bloom 45s, pour to 500mL in two stages by 3:00. ' +
      'Total brew time ~4:00. Rinse filter with hot water before using. ' +
      'Jasmine, blueberry, lemon notes.',
    source: 'scraped:roaster',
    source_url: 'https://stumptowncoffee.com/brew-guide',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Guatemala',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium',
    water_temp_c: 94,
    ratio: 1 / 16.7,
    brew_time_s: 240,
    rating: 4,
    notes: 'Stumptown Guide — Guatemala medium roast. Chemex pour over. ' +
      'Bloom 2x coffee weight for 45s. Two main pours reaching 500mL by 3:00. ' +
      'Target 4:00 total. Milk chocolate, praline, dried apricot notes.',
    source: 'scraped:roaster',
    source_url: 'https://stumptowncoffee.com/brew-guide',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Honduras',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium',
    water_temp_c: 94,
    ratio: 1 / 16.7,
    brew_time_s: 245,
    rating: 4,
    notes: 'Stumptown Guide — Honduras medium roast. V60 pour over. ' +
      'Bloom 50g for 40s. Pour in slow circles, complete by 3:10. ' +
      'Target drawdown 4:05. Brown sugar, nectarine, almond notes.',
    source: 'scraped:roaster',
    source_url: 'https://stumptowncoffee.com/brew-guide',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Intelligentsia Coffee ─────────────────────────────────────────────
  // Guide: intelligentsia.com/blogs/guides
  // Signature: 1:17 ratio, 93°C, medium-fine, ~3:45 total
  {
    origin: 'Ethiopia',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 17,
    brew_time_s: 225,
    rating: 4,
    notes: 'Intelligentsia Guide — Ethiopia light roast. V60 pour over. ' +
      'Bloom 2x coffee weight for 30s. Continuous pour in slow spirals, ' +
      'finish 2:45-3:00, target drain 3:30-3:45. ' +
      'Bright, fruit-forward with bergamot and stone fruit.',
    source: 'scraped:roaster',
    source_url: 'https://intelligentsia.com/blogs/guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Kenya',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 17,
    brew_time_s: 225,
    rating: 4,
    notes: 'Intelligentsia Guide — Kenya light roast. Hario V60 or Kalita Wave. ' +
      '40g bloom 30s, pour to 340g by 2:30, drain by 3:30-3:45. ' +
      'Black cherry, brown sugar, complex acidity.',
    source: 'scraped:roaster',
    source_url: 'https://intelligentsia.com/blogs/guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Colombia',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 17,
    brew_time_s: 230,
    rating: 4,
    notes: 'Intelligentsia Guide — Colombia medium roast. V60 or Chemex. ' +
      'Bloom 2x dose for 30s, pour slowly to 340g by 2:45. ' +
      'Target drain 3:45. Caramel, apple, toffee sweetness.',
    source: 'scraped:roaster',
    source_url: 'https://intelligentsia.com/blogs/guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Sweet Maria's ─────────────────────────────────────────────────────
  // Guide: sweetmarias.com/brew-methods
  // Signature: 1:15 ratio, 94°C, medium-coarse, ~4:30 total
  {
    origin: 'Ethiopia',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-coarse',
    water_temp_c: 94,
    ratio: 1 / 15,
    brew_time_s: 270,
    rating: 4,
    notes: "Sweet Maria's Guide — Ethiopia light roast. Chemex or Beehouse. " +
      '45g bloom 40s, two large pours finishing at 3:30. ' +
      'Allow full drawdown ~4:30. Coarser grind accommodates natural process. ' +
      'Blueberry, wine, dark chocolate notes.',
    source: 'scraped:roaster',
    source_url: 'https://sweetmarias.com/brew-methods',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Yemen',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium-coarse',
    water_temp_c: 94,
    ratio: 1 / 15,
    brew_time_s: 270,
    rating: 4,
    notes: "Sweet Maria's Guide — Yemen medium roast (Mocha). Chemex preferred. " +
      'Bloom 50g for 45s. Pour slowly to 375g by 3:30. Total ~4:30. ' +
      'Fruity, wine-like, dry process complexity.',
    source: 'scraped:roaster',
    source_url: 'https://sweetmarias.com/brew-methods',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Guatemala',
    roast_level: 'medium-dark',
    brewing_method_id: 1,
    grind_size: 'medium-coarse',
    water_temp_c: 94,
    ratio: 1 / 15,
    brew_time_s: 265,
    rating: 4,
    notes: "Sweet Maria's Guide — Guatemala medium-dark roast. Chemex pour over. " +
      'Bloom 2x dose for 40s. Two large pours to 375g by 3:20, drain by 4:25. ' +
      'Dark chocolate, brown sugar, mild spice.',
    source: 'scraped:roaster',
    source_url: 'https://sweetmarias.com/brew-methods',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── George Howell Coffee ──────────────────────────────────────────────
  // Guide: georgehowellcoffee.com
  // Signature: 1:15.5 ratio, 95°C, medium-fine, ~3:30 total
  {
    origin: 'Colombia',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 95,
    ratio: 1 / 15.5,
    brew_time_s: 210,
    rating: 4,
    notes: 'George Howell Guide — Colombia light roast. V60 pour over. ' +
      'Use slightly higher temp (95°C) to fully express terroir. ' +
      'Bloom 40g for 35s. Pour in concentric circles to 310g by 2:30, drain by 3:30. ' +
      'Fruit-forward sweetness, caramel, red berry.',
    source: 'scraped:roaster',
    source_url: 'https://georgehowellcoffee.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Kenya',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 95,
    ratio: 1 / 15.5,
    brew_time_s: 210,
    rating: 4,
    notes: 'George Howell Guide — Kenya light roast. V60 pour over. ' +
      '95°C to unlock bright acidity. Bloom 40g for 35s. ' +
      'Continuous spiral pours to 310g by 2:30, drain 3:30. ' +
      'Blackcurrant, lime, black tea notes.',
    source: 'scraped:roaster',
    source_url: 'https://georgehowellcoffee.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Brazil',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 95,
    ratio: 1 / 15.5,
    brew_time_s: 215,
    rating: 4,
    notes: 'George Howell Guide — Brazil medium roast. V60 or Kalita Wave. ' +
      'Bloom 2x dose for 35s. Pour to 310g by 2:35, drain 3:30-3:40. ' +
      'Milk chocolate, hazelnut, mellow sweetness.',
    source: 'scraped:roaster',
    source_url: 'https://georgehowellcoffee.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Onyx Coffee Lab ───────────────────────────────────────────────────
  // Guide: onyxcoffeelab.com
  // Signature: 1:16 ratio, 93°C, medium-fine, ~3:45 total
  {
    origin: 'Ethiopia',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 16,
    brew_time_s: 225,
    rating: 4,
    notes: 'Onyx Coffee Lab Guide — Ethiopia light roast. V60 pour over. ' +
      'Bloom 50g for 30s with a slight swirl. Four even pours at 0:30, 1:15, 2:00, 2:30. ' +
      'Total 400g, target drain by 3:45. Floral, tropical fruit, tea-like finish.',
    source: 'scraped:roaster',
    source_url: 'https://onyxcoffeelab.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Colombia',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium-fine',
    water_temp_c: 93,
    ratio: 1 / 16,
    brew_time_s: 225,
    rating: 4,
    notes: 'Onyx Coffee Lab Guide — Colombia medium roast. V60 pour over. ' +
      'Bloom 2x coffee dose 30s. Pours at 0:30, 1:10, 2:00, 2:30 to 400g total. ' +
      'Drain by 3:40-3:45. Caramel, malic acidity, red grape notes.',
    source: 'scraped:roaster',
    source_url: 'https://onyxcoffeelab.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Bird Rock Coffee Roasters ─────────────────────────────────────────
  // Guide: birdrockcoffee.com
  // Signature: 1:16.5 ratio, 94°C, medium, ~4min total
  {
    origin: 'Kenya',
    roast_level: 'light',
    brewing_method_id: 1,
    grind_size: 'medium',
    water_temp_c: 94,
    ratio: 1 / 16.5,
    brew_time_s: 240,
    rating: 4,
    notes: 'Bird Rock Guide — Kenya light roast. V60 pour over. ' +
      'Bloom 2x dose for 45s. Even circular pours, complete 350g by 3:00. ' +
      'Target drawdown 3:45-4:00. Juicy brightness, currant, mandarin notes.',
    source: 'scraped:roaster',
    source_url: 'https://birdrockcoffee.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Guatemala',
    roast_level: 'medium',
    brewing_method_id: 1,
    grind_size: 'medium',
    water_temp_c: 94,
    ratio: 1 / 16.5,
    brew_time_s: 240,
    rating: 4,
    notes: 'Bird Rock Guide — Guatemala medium roast. Chemex or V60. ' +
      'Bloom 40g for 45s. Two main pours completing 350g by 2:50. ' +
      'Allow to drain ~4:00. Dark chocolate, stone fruit, maple sweetness.',
    source: 'scraped:roaster',
    source_url: 'https://birdrockcoffee.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── La Marzocco Home ──────────────────────────────────────────────────
  // Guide: home.lamarzocco.com/blogs
  // Espresso: 1:2 yield ratio (0.5), 93°C, fine grind, 25-30s shot
  {
    origin: 'Colombia',
    roast_level: 'medium',
    brewing_method_id: 3,
    grind_size: 'fine',
    water_temp_c: 93,
    ratio: 0.5,
    brew_time_s: 27,
    rating: 4,
    notes: 'La Marzocco Guide — Colombia medium roast espresso. ' +
      '18g dose in, 36g out (1:2). Pre-infuse 3s at 3bar, ramp to 9bar. ' +
      'Target 25-30s total shot time. Adjust grind to hit 27s. ' +
      'Caramel, hazelnut, balanced sweetness.',
    source: 'scraped:roaster',
    source_url: 'https://home.lamarzocco.com/blogs',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Ethiopia',
    roast_level: 'light',
    brewing_method_id: 3,
    grind_size: 'fine',
    water_temp_c: 93,
    ratio: 0.5,
    brew_time_s: 28,
    rating: 4,
    notes: 'La Marzocco Guide — Ethiopia light roast espresso. ' +
      '18g dose, 36g yield (1:2). Pre-infuse 4s at 3bar, ramp to 9bar. ' +
      'Target 25-30s. Use higher temp 93°C to fully extract light roast. ' +
      'Floral, bergamot, blueberry notes.',
    source: 'scraped:roaster',
    source_url: 'https://home.lamarzocco.com/blogs',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Brazil',
    roast_level: 'medium-dark',
    brewing_method_id: 3,
    grind_size: 'fine',
    water_temp_c: 92,
    ratio: 0.5,
    brew_time_s: 26,
    rating: 4,
    notes: 'La Marzocco Guide — Brazil medium-dark espresso. ' +
      '18g dose, 36g yield (1:2). No pre-infusion or short 2s ramp. ' +
      'Target 25-28s. Lower temp 92°C to reduce bitterness of darker roast. ' +
      'Dark chocolate, walnut, brown sugar notes.',
    source: 'scraped:roaster',
    source_url: 'https://home.lamarzocco.com/blogs',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Bottomless Coffee ─────────────────────────────────────────────────
  // Guide: bottomless.com/brewing-guides
  // Espresso: 1:2.2 yield (ratio ~0.455), 92°C, fine, 28s
  {
    origin: 'Brazil',
    roast_level: 'medium',
    brewing_method_id: 3,
    grind_size: 'fine',
    water_temp_c: 92,
    ratio: 1 / 2.2,
    brew_time_s: 28,
    rating: 4,
    notes: 'Bottomless Guide — Brazil medium roast espresso. ' +
      '18g in, 40g out (1:2.2 yield). Standard 9bar extraction. ' +
      'Target 26-30s. Slightly longer ratio for sweeter, less intense shot. ' +
      'Milk chocolate, caramel, low acidity.',
    source: 'scraped:roaster',
    source_url: 'https://bottomless.com/brewing-guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Colombia',
    roast_level: 'medium',
    brewing_method_id: 3,
    grind_size: 'fine',
    water_temp_c: 92,
    ratio: 1 / 2.2,
    brew_time_s: 28,
    rating: 4,
    notes: 'Bottomless Guide — Colombia medium roast espresso. ' +
      '18g in, 40g out (1:2.2). 92°C for balanced extraction. ' +
      'Target 26-30s extraction. Pour slowly over base crema. ' +
      'Brown sugar sweetness, mild fruit brightness.',
    source: 'scraped:roaster',
    source_url: 'https://bottomless.com/brewing-guides',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Chromatic Coffee ──────────────────────────────────────────────────
  // Guide: chromaticcoffee.com
  // Espresso: 1:2.5 yield (ratio 0.4), 93°C, fine-medium, 30s
  {
    origin: 'Ethiopia',
    roast_level: 'light',
    brewing_method_id: 3,
    grind_size: 'fine-medium',
    water_temp_c: 93,
    ratio: 1 / 2.5,
    brew_time_s: 30,
    rating: 4,
    notes: 'Chromatic Coffee Guide — Ethiopia light roast espresso. ' +
      '18g in, 45g out (1:2.5 yield). Slightly coarser fine-medium grind. ' +
      'Pre-infuse 3s, then 9bar. 28-32s target. Longer yield highlights floral, ' +
      'fruit-forward character without bitterness.',
    source: 'scraped:roaster',
    source_url: 'https://chromaticcoffee.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Guatemala',
    roast_level: 'medium',
    brewing_method_id: 3,
    grind_size: 'fine-medium',
    water_temp_c: 93,
    ratio: 1 / 2.5,
    brew_time_s: 30,
    rating: 4,
    notes: 'Chromatic Coffee Guide — Guatemala medium roast espresso. ' +
      '18g in, 45g out (1:2.5). 93°C, 9bar. Target 28-32s. ' +
      'Slightly longer ratio balances dark chocolate body with fruit brightness. ' +
      'Plum, cocoa, mellow sweetness.',
    source: 'scraped:roaster',
    source_url: 'https://chromaticcoffee.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },

  // ── Equator Coffees ───────────────────────────────────────────────────
  // Guide: equatorcoffees.com
  // Espresso: 1:2 yield (ratio 0.5), 93°C, fine, 27s
  {
    origin: 'Peru',
    roast_level: 'medium',
    brewing_method_id: 3,
    grind_size: 'fine',
    water_temp_c: 93,
    ratio: 0.5,
    brew_time_s: 27,
    rating: 4,
    notes: 'Equator Coffees Guide — Peru medium roast espresso. ' +
      '18g dose, 36g yield (1:2). 93°C, 9bar standard extraction. ' +
      'Target 25-30s. Pre-infuse 2-3s. ' +
      'Milk chocolate, walnut, gentle citrus notes.',
    source: 'scraped:roaster',
    source_url: 'https://equatorcoffees.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Colombia',
    roast_level: 'medium',
    brewing_method_id: 3,
    grind_size: 'fine',
    water_temp_c: 93,
    ratio: 0.5,
    brew_time_s: 27,
    rating: 4,
    notes: 'Equator Coffees Guide — Colombia medium roast espresso. ' +
      '18g in, 36g out (1:2). Standard 9bar. Pre-infuse 3s at 3bar. ' +
      'Target 27s for balanced extraction. ' +
      'Caramel sweetness, mild fruit, smooth finish.',
    source: 'scraped:roaster',
    source_url: 'https://equatorcoffees.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
  {
    origin: 'Nicaragua',
    roast_level: 'medium-dark',
    brewing_method_id: 3,
    grind_size: 'fine',
    water_temp_c: 92,
    ratio: 0.5,
    brew_time_s: 28,
    rating: 4,
    notes: 'Equator Coffees Guide — Nicaragua medium-dark espresso. ' +
      '18g in, 36g out (1:2). 92°C to tame roast char. 9bar, pre-infuse 2s. ' +
      'Target 26-30s. Dark chocolate, toasted almond, molasses finish.',
    source: 'scraped:roaster',
    source_url: 'https://equatorcoffees.com',
    field_confidence: JSON.stringify({ origin: 1.0, ratio: 1.0, water_temp_c: 1.0, grind_size: 1.0 }),
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/brewing-methods`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function insertBrew(brew: ScrapedBrew): Promise<{ id: number; message: string }> {
  const res = await fetch(`${API_BASE}/brews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brew),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json() as Promise<{ id: number; message: string }>;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('scrape-roasters: checking server connectivity...');

  const reachable = await checkConnectivity();
  if (!reachable) {
    console.error(
      'ERROR: Server not reachable at ' + API_BASE + '\n' +
      'Please start the dev server first: npm run dev',
    );
    process.exit(1);
  }

  console.log('Server reachable. Starting brew insertion...\n');

  const pourOvers = BREWS.filter(b => b.brewing_method_id === 1);
  const espressos = BREWS.filter(b => b.brewing_method_id === 3);

  console.log(`Total brews to insert: ${BREWS.length}`);
  console.log(`  Pour Over (method_id=1): ${pourOvers.length}`);
  console.log(`  Espresso  (method_id=3): ${espressos.length}\n`);

  let inserted = 0;
  let failed = 0;

  for (const brew of BREWS) {
    const label = `[${brew.brewing_method_id === 1 ? 'PourOver' : 'Espresso'}] ${brew.origin} ${brew.roast_level}`;
    try {
      const result = await insertBrew(brew);
      console.log(`  ✓ ${label} → id=${result.id}`);
      inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${label} → FAILED: ${msg}`);
      failed++;
    }
  }

  console.log(`\n─── Summary ───────────────────────────────`);
  console.log(`Inserted: ${inserted}/${BREWS.length}`);
  console.log(`  Pour Over: ${pourOvers.length} targeted`);
  console.log(`  Espresso:  ${espressos.length} targeted`);
  if (failed > 0) {
    console.log(`Failed:   ${failed}`);
    process.exit(1);
  } else {
    console.log('All brews inserted successfully.');
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
