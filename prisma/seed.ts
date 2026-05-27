import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_ORIGINS = [
  { name: 'Ethiopia', region: 'Africa', subregion: 'Yirgacheffe, Sidamo, Guji, Harrar', aliases: 'Ethiopean,Ethopian', is_verified: true },
  { name: 'Colombia', region: 'South America', subregion: 'Huila, Nariño, Antioquia', aliases: 'Colombian,Columbia', is_verified: true },
  { name: 'Kenya', region: 'Africa', subregion: 'Nyeri, Kirinyaga, Muranga', aliases: 'Kenyan', is_verified: true },
  { name: 'Brazil', region: 'South America', subregion: 'Minas Gerais, São Paulo, Espírito Santo', aliases: 'Brazillian,Brasilian', is_verified: true },
  { name: 'Costa Rica', region: 'Central America', subregion: 'Tarrazú, West Valley, Central Valley', aliases: 'Costa Rican', is_verified: true },
  { name: 'Guatemala', region: 'Central America', subregion: 'Antigua, Huehuetenango, Atitlán', aliases: 'Guatamalan', is_verified: true },
  { name: 'Panama', region: 'Central America', subregion: 'Boquete, Volcán', aliases: 'Panamanian', is_verified: true },
  { name: 'Honduras', region: 'Central America', subregion: 'Copán, Marcala, Santa Bárbara', aliases: '', is_verified: true },
  { name: 'El Salvador', region: 'Central America', subregion: 'Santa Ana, Apaneca-Ilamatepec', aliases: '', is_verified: true },
  { name: 'Peru', region: 'South America', subregion: 'Cajamarca, Cusco, Junín', aliases: 'Peruvian', is_verified: true },
  { name: 'Tanzania', region: 'Africa', subregion: 'Kilimanjaro, Arusha, Mbeya', aliases: 'Tanzanian', is_verified: true },
  { name: 'Rwanda', region: 'Africa', subregion: 'Nyamasheke, Gakenke, Huye', aliases: 'Rwandan', is_verified: true },
  { name: 'Burundi', region: 'Africa', subregion: 'Kayanza, Ngozi, Muyinga', aliases: '', is_verified: true },
  { name: 'Yemen', region: 'Middle East', subregion: 'Mocha, Mattari, Hirazi', aliases: 'Yemeni', is_verified: true },
  { name: 'Indonesia', region: 'Asia Pacific', subregion: 'Sumatra, Java, Sulawesi, Bali', aliases: 'Indonesian,Sumatran', is_verified: true },
  { name: 'India', region: 'Asia Pacific', subregion: 'Karnataka, Tamil Nadu, Kerala', aliases: 'Indian', is_verified: true },
  { name: 'Vietnam', region: 'Asia Pacific', subregion: 'Central Highlands, Da Lat', aliases: 'Vietnamese', is_verified: true },
  { name: 'Mexico', region: 'Central America', subregion: 'Chiapas, Oaxaca, Veracruz', aliases: 'Mexican', is_verified: true },
  { name: 'Nicaragua', region: 'Central America', subregion: 'Jinotega, Matagalpa, Nueva Segovia', aliases: 'Nicaraguan', is_verified: true },
  { name: 'Ecuador', region: 'South America', subregion: 'Loja, Pichincha, Zamora-Chinchipe', aliases: 'Ecuadorian', is_verified: true },
];

const SEED_METHODS = [
  { name: 'Pour Over', description: 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)', default_temp_c: 93, grind_size: 'medium-fine', default_brew_time_s: 210, default_ratio: 0.0625, technique: '{"bloom_weight_ratio":2,"bloom_duration_s":45,"pour_stages":[{"at_s":45,"volume_ml":60,"note":"centre pour, saturate grounds"},{"at_s":90,"volume_ml":120,"note":"spiral pour outward"},{"at_s":150,"volume_ml":120,"note":"final spiral pour"}],"agitation":"swirl","drawdown_target_s":210}' },
  { name: 'French Press', description: 'Immersion brewing with a metal mesh filter', default_temp_c: 96, grind_size: 'coarse', default_brew_time_s: 240, default_ratio: 0.0667, technique: '{"steep_time_s":240,"plunge_speed":"slow","pre_wet":true,"stir_at_s":120}' },
  { name: 'Aeropress', description: 'Rapid immersion + pressure extraction', default_temp_c: 85, grind_size: 'medium-fine', default_brew_time_s: 120, default_ratio: 0.0667, technique: '{"inverted":false,"steep_time_s":60,"stir_count":10,"filter_type":"paper"}' },
  { name: 'Espresso', description: 'High-pressure extraction through finely ground coffee', default_temp_c: 92, grind_size: 'fine', default_brew_time_s: 30, default_ratio: 0.5, technique: '{"preinfusion_s":5,"yield_ratio":2,"shot_time_s":28,"pressure_bar":9,"filter_type":"metal"}' },
  { name: 'Cold Brew', description: 'Long cold steep for smooth, low-acid coffee', default_temp_c: 20, grind_size: 'coarse', default_brew_time_s: 43200, default_ratio: 0.125, technique: '{"steep_time_h":18,"steep_temp":"fridge","dilution_ratio":1}' },
  { name: 'Moka Pot', description: 'Stovetop pressure brewing', default_temp_c: 90, grind_size: 'fine', default_brew_time_s: 300, default_ratio: 0.1429, technique: '{"preheat_water":true,"heat_level":"low","tamp":"none"}' },
  { name: 'Siphon', description: 'Vacuum-driven immersion brewing', default_temp_c: 93, grind_size: 'medium', default_brew_time_s: 90, default_ratio: 0.0667, technique: '{"heat_source":"halogen","stir_pattern":"figure-8","drawdown_time_s":60}' },
  { name: 'Turkish', description: 'Very fine grind boiled in a cezve/ibrik', default_temp_c: 100, grind_size: 'extra-fine', default_brew_time_s: 180, default_ratio: 0.1, technique: '{"heat_level":"low","foam_technique":"traditional","serve_with_grounds":true}' },
];

// Community brew data — sourced from real roaster brew guides.
// Pour Over: 8 roasters × ~3 brews = 22 entries
// Espresso: 4 roasters × ~3 brews = 10 entries
// Total: 32 community brews loaded on `prisma db seed`.
// Re-running seed is idempotent (createMany skips duplicates by brew content).
const SEED_BREWS = [
  // ── Blue Bottle Coffee ──
  { brewing_method_id: 1, origin: 'Ethiopia',   roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.06452, brew_time_s: 180, rating: 4, source: 'scraped:roaster', source_url: 'https://bluebottlecoffee.com/brewing-guides', notes: 'Blue Bottle Guide — Ethiopia light roast. 3-stage pour: 45g bloom 45s, 150g at 0:45, 250g at 1:45. Swirl gently after bloom. Target drawdown 3:00. Expect floral and citrus notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Colombia',    roast_level: 'medium',      grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.06452, brew_time_s: 195, rating: 4, source: 'scraped:roaster', source_url: 'https://bluebottlecoffee.com/brewing-guides', notes: 'Blue Bottle Guide — Colombia medium roast. 3-stage pour: 50g bloom 45s, 160g at 1:00, 250g at 2:00. Expect caramel, milk chocolate, stone fruit notes. Target drawdown 3:15.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Kenya',       roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.06452, brew_time_s: 185, rating: 4, source: 'scraped:roaster', source_url: 'https://bluebottlecoffee.com/brewing-guides', notes: 'Blue Bottle Guide — Kenya light roast. Bright and juicy profile. 3-stage pour: 45g bloom 45s, 150g at 0:45, 250g at 1:50. Target drawdown 3:05. Black currant, tomato, grapefruit notes expected.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Counter Culture Coffee ──
  { brewing_method_id: 1, origin: 'Ethiopia',    roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.06250, brew_time_s: 210, rating: 4, source: 'scraped:roaster', source_url: 'https://counterculturecoffee.com/brew-guides', notes: 'Counter Culture Guide — Ethiopia light roast. V60 pour over. 50g bloom for 30s, continuous slow pour from 0:30 to 2:30. Target 3:00-3:30 total. Stir dry grounds before bloom for even saturation.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Colombia',    roast_level: 'medium',      grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.06250, brew_time_s: 210, rating: 4, source: 'scraped:roaster', source_url: 'https://counterculturecoffee.com/brew-guides', notes: 'Counter Culture Guide — Colombia medium roast. V60 or Chemex. 50g bloom 30s, then pour to 350g by 2:00. Rinse paper filter before brewing. Target 3:00-3:30 drawdown. Balanced sweetness and acidity.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Rwanda',      roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.06250, brew_time_s: 215, rating: 4, source: 'scraped:roaster', source_url: 'https://counterculturecoffee.com/brew-guides', notes: 'Counter Culture Guide — Rwanda light roast. Pour over. Bloom 40g for 35s, pour in two stages to 370g by 2:20. Hibiscus, brown sugar, dried fruit notes. Target drawdown 3:30.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Stumptown Coffee Roasters ──
  { brewing_method_id: 1, origin: 'Ethiopia',    roast_level: 'light',       grind_size: 'medium',       water_temp_c: 94, ratio: 0.05988, brew_time_s: 240, rating: 4, source: 'scraped:roaster', source_url: 'https://stumptowncoffee.com/brew-guide', notes: 'Stumptown Guide — Ethiopia light roast. Chemex or V60. 60g bloom 45s, pour to 500mL in two stages by 3:00. Total brew time ~4:00. Rinse filter with hot water before using. Jasmine, blueberry, lemon notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Guatemala',   roast_level: 'medium',      grind_size: 'medium',       water_temp_c: 94, ratio: 0.05988, brew_time_s: 240, rating: 4, source: 'scraped:roaster', source_url: 'https://stumptowncoffee.com/brew-guide', notes: 'Stumptown Guide — Guatemala medium roast. Chemex pour over. Bloom 2x coffee weight for 45s. Two main pours reaching 500mL by 3:00. Target 4:00 total. Milk chocolate, praline, dried apricot notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Honduras',    roast_level: 'medium',      grind_size: 'medium',       water_temp_c: 94, ratio: 0.05988, brew_time_s: 245, rating: 4, source: 'scraped:roaster', source_url: 'https://stumptowncoffee.com/brew-guide', notes: 'Stumptown Guide — Honduras medium roast. V60 pour over. Bloom 50g for 40s. Pour in slow circles, complete by 3:10. Target drawdown 4:05. Brown sugar, nectarine, almond notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Intelligentsia Coffee ──
  { brewing_method_id: 1, origin: 'Ethiopia',    roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.05882, brew_time_s: 225, rating: 4, source: 'scraped:roaster', source_url: 'https://intelligentsia.com/blogs/guides', notes: 'Intelligentsia Guide — Ethiopia light roast. V60 pour over. Bloom 2x coffee weight for 30s. Continuous pour in slow spirals, finish 2:45-3:00, target drain 3:30-3:45. Bright, fruit-forward with bergamot and stone fruit.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Kenya',       roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.05882, brew_time_s: 225, rating: 4, source: 'scraped:roaster', source_url: 'https://intelligentsia.com/blogs/guides', notes: 'Intelligentsia Guide — Kenya light roast. Hario V60 or Kalita Wave. 40g bloom 30s, pour to 340g by 2:30, drain by 3:30-3:45. Black cherry, brown sugar, complex acidity.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Colombia',    roast_level: 'medium',      grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.05882, brew_time_s: 230, rating: 4, source: 'scraped:roaster', source_url: 'https://intelligentsia.com/blogs/guides', notes: 'Intelligentsia Guide — Colombia medium roast. V60 or Chemex. Bloom 2x dose for 30s, pour slowly to 340g by 2:45. Target drain 3:45. Caramel, apple, toffee sweetness.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Sweet Maria's ──
  { brewing_method_id: 1, origin: 'Ethiopia',    roast_level: 'light',       grind_size: 'medium-coarse', water_temp_c: 94, ratio: 0.06667, brew_time_s: 270, rating: 4, source: 'scraped:roaster', source_url: 'https://sweetmarias.com/brew-methods', notes: "Sweet Maria's Guide — Ethiopia light roast. Chemex or Beehouse. 45g bloom 40s, two large pours finishing at 3:30. Allow full drawdown ~4:30. Coarser grind accommodates natural process. Blueberry, wine, dark chocolate notes.", field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Yemen',       roast_level: 'medium',      grind_size: 'medium-coarse', water_temp_c: 94, ratio: 0.06667, brew_time_s: 270, rating: 4, source: 'scraped:roaster', source_url: 'https://sweetmarias.com/brew-methods', notes: "Sweet Maria's Guide — Yemen medium roast (Mocha). Chemex preferred. Bloom 50g for 45s. Pour slowly to 375g by 3:30. Total ~4:30. Fruity, wine-like, dry process complexity.", field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Guatemala',   roast_level: 'medium-dark', grind_size: 'medium-coarse', water_temp_c: 94, ratio: 0.06667, brew_time_s: 265, rating: 4, source: 'scraped:roaster', source_url: 'https://sweetmarias.com/brew-methods', notes: "Sweet Maria's Guide — Guatemala medium-dark roast. Chemex pour over. Bloom 2x dose for 40s. Two large pours to 375g by 3:20, drain by 4:25. Dark chocolate, brown sugar, mild spice.", field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── George Howell Coffee ──
  { brewing_method_id: 1, origin: 'Colombia',    roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 95, ratio: 0.06452, brew_time_s: 210, rating: 4, source: 'scraped:roaster', source_url: 'https://georgehowellcoffee.com', notes: 'George Howell Guide — Colombia light roast. V60 pour over. Use slightly higher temp (95°C) to fully express terroir. Bloom 40g for 35s. Pour in concentric circles to 310g by 2:30, drain by 3:30. Fruit-forward sweetness, caramel, red berry.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Kenya',       roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 95, ratio: 0.06452, brew_time_s: 210, rating: 4, source: 'scraped:roaster', source_url: 'https://georgehowellcoffee.com', notes: 'George Howell Guide — Kenya light roast. V60 pour over. 95°C to unlock bright acidity. Bloom 40g for 35s. Continuous spiral pours to 310g by 2:30, drain 3:30. Blackcurrant, lime, black tea notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Brazil',      roast_level: 'medium',      grind_size: 'medium-fine',  water_temp_c: 95, ratio: 0.06452, brew_time_s: 215, rating: 4, source: 'scraped:roaster', source_url: 'https://georgehowellcoffee.com', notes: 'George Howell Guide — Brazil medium roast. V60 or Kalita Wave. Bloom 2x dose for 35s. Pour to 310g by 2:35, drain 3:30-3:40. Milk chocolate, hazelnut, mellow sweetness.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Onyx Coffee Lab ──
  { brewing_method_id: 1, origin: 'Ethiopia',    roast_level: 'light',       grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.06250, brew_time_s: 225, rating: 4, source: 'scraped:roaster', source_url: 'https://onyxcoffeelab.com', notes: 'Onyx Coffee Lab Guide — Ethiopia light roast. V60 pour over. Bloom 50g for 30s with a slight swirl. Four even pours at 0:30, 1:15, 2:00, 2:30. Total 400g, target drain by 3:45. Floral, tropical fruit, tea-like finish.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Colombia',    roast_level: 'medium',      grind_size: 'medium-fine',  water_temp_c: 93, ratio: 0.06250, brew_time_s: 225, rating: 4, source: 'scraped:roaster', source_url: 'https://onyxcoffeelab.com', notes: 'Onyx Coffee Lab Guide — Colombia medium roast. V60 pour over. Bloom 2x coffee dose 30s. Pours at 0:30, 1:10, 2:00, 2:30 to 400g total. Drain by 3:40-3:45. Caramel, malic acidity, red grape notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Bird Rock Coffee Roasters ──
  { brewing_method_id: 1, origin: 'Kenya',       roast_level: 'light',       grind_size: 'medium',       water_temp_c: 94, ratio: 0.06061, brew_time_s: 240, rating: 4, source: 'scraped:roaster', source_url: 'https://birdrockcoffee.com', notes: 'Bird Rock Guide — Kenya light roast. V60 pour over. Bloom 2x dose for 45s. Even circular pours, complete 350g by 3:00. Target drawdown 3:45-4:00. Juicy brightness, currant, mandarin notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 1, origin: 'Guatemala',   roast_level: 'medium',      grind_size: 'medium',       water_temp_c: 94, ratio: 0.06061, brew_time_s: 240, rating: 4, source: 'scraped:roaster', source_url: 'https://birdrockcoffee.com', notes: 'Bird Rock Guide — Guatemala medium roast. Chemex or V60. Bloom 40g for 45s. Two main pours completing 350g by 2:50. Allow to drain ~4:00. Dark chocolate, stone fruit, maple sweetness.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── La Marzocco Home (Espresso) ──
  { brewing_method_id: 3, origin: 'Colombia',    roast_level: 'medium',      grind_size: 'fine',         water_temp_c: 93, ratio: 0.5,     brew_time_s: 27,  rating: 4, source: 'scraped:roaster', source_url: 'https://home.lamarzocco.com/blogs', notes: 'La Marzocco Guide — Colombia medium roast espresso. 18g dose in, 36g out (1:2). Pre-infuse 3s at 3bar, ramp to 9bar. Target 25-30s total shot time. Adjust grind to hit 27s. Caramel, hazelnut, balanced sweetness.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 3, origin: 'Ethiopia',    roast_level: 'light',       grind_size: 'fine',         water_temp_c: 93, ratio: 0.5,     brew_time_s: 28,  rating: 4, source: 'scraped:roaster', source_url: 'https://home.lamarzocco.com/blogs', notes: 'La Marzocco Guide — Ethiopia light roast espresso. 18g dose, 36g yield (1:2). Pre-infuse 4s at 3bar, ramp to 9bar. Target 25-30s. Use higher temp 93°C to fully extract light roast. Floral, bergamot, blueberry notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 3, origin: 'Brazil',      roast_level: 'medium-dark', grind_size: 'fine',         water_temp_c: 92, ratio: 0.5,     brew_time_s: 26,  rating: 4, source: 'scraped:roaster', source_url: 'https://home.lamarzocco.com/blogs', notes: 'La Marzocco Guide — Brazil medium-dark espresso. 18g dose, 36g yield (1:2). No pre-infusion or short 2s ramp. Target 25-28s. Lower temp 92°C to reduce bitterness of darker roast. Dark chocolate, walnut, brown sugar notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Bottomless Coffee (Espresso) ──
  { brewing_method_id: 3, origin: 'Brazil',      roast_level: 'medium',      grind_size: 'fine',         water_temp_c: 92, ratio: 0.45455, brew_time_s: 28,  rating: 4, source: 'scraped:roaster', source_url: 'https://bottomless.com/brewing-guides', notes: 'Bottomless Guide — Brazil medium roast espresso. 18g in, 40g out (1:2.2 yield). Standard 9bar extraction. Target 26-30s. Slightly longer ratio for sweeter, less intense shot. Milk chocolate, caramel, low acidity.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 3, origin: 'Colombia',    roast_level: 'medium',      grind_size: 'fine',         water_temp_c: 92, ratio: 0.45455, brew_time_s: 28,  rating: 4, source: 'scraped:roaster', source_url: 'https://bottomless.com/brewing-guides', notes: 'Bottomless Guide — Colombia medium roast espresso. 18g in, 40g out (1:2.2). 92°C for balanced extraction. Target 26-30s extraction. Pour slowly over base crema. Brown sugar sweetness, mild fruit brightness.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Chromatic Coffee (Espresso) ──
  { brewing_method_id: 3, origin: 'Ethiopia',    roast_level: 'light',       grind_size: 'fine-medium',  water_temp_c: 93, ratio: 0.4,     brew_time_s: 30,  rating: 4, source: 'scraped:roaster', source_url: 'https://chromaticcoffee.com', notes: 'Chromatic Coffee Guide — Ethiopia light roast espresso. 18g in, 45g out (1:2.5 yield). Slightly coarser fine-medium grind. Pre-infuse 3s, then 9bar. 28-32s target. Longer yield highlights floral, fruit-forward character without bitterness.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 3, origin: 'Guatemala',   roast_level: 'medium',      grind_size: 'fine-medium',  water_temp_c: 93, ratio: 0.4,     brew_time_s: 30,  rating: 4, source: 'scraped:roaster', source_url: 'https://chromaticcoffee.com', notes: 'Chromatic Coffee Guide — Guatemala medium roast espresso. 18g in, 45g out (1:2.5). 93°C, 9bar. Target 28-32s. Slightly longer ratio balances dark chocolate body with fruit brightness. Plum, cocoa, mellow sweetness.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  // ── Equator Coffees (Espresso) ──
  { brewing_method_id: 3, origin: 'Peru',        roast_level: 'medium',      grind_size: 'fine',         water_temp_c: 93, ratio: 0.5,     brew_time_s: 27,  rating: 4, source: 'scraped:roaster', source_url: 'https://equatorcoffees.com', notes: 'Equator Coffees Guide — Peru medium roast espresso. 18g dose, 36g yield (1:2). 93°C, 9bar standard extraction. Target 25-30s. Pre-infuse 2-3s. Milk chocolate, walnut, gentle citrus notes.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 3, origin: 'Colombia',    roast_level: 'medium',      grind_size: 'fine',         water_temp_c: 93, ratio: 0.5,     brew_time_s: 27,  rating: 4, source: 'scraped:roaster', source_url: 'https://equatorcoffees.com', notes: 'Equator Coffees Guide — Colombia medium roast espresso. 18g in, 36g out (1:2). Standard 9bar. Pre-infuse 3s at 3bar. Target 27s for balanced extraction. Caramel sweetness, mild fruit, smooth finish.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
  { brewing_method_id: 3, origin: 'Nicaragua',   roast_level: 'medium-dark', grind_size: 'fine',         water_temp_c: 92, ratio: 0.5,     brew_time_s: 28,  rating: 4, source: 'scraped:roaster', source_url: 'https://equatorcoffees.com', notes: 'Equator Coffees Guide — Nicaragua medium-dark espresso. 18g in, 36g out (1:2). 92°C to tame roast char. 9bar, pre-infuse 2s. Target 26-30s. Dark chocolate, toasted almond, molasses finish.', field_confidence: '{"origin":1.0,"ratio":1.0,"water_temp_c":1.0,"grind_size":1.0}' },
];

async function main() {
  console.log('Seeding origins...');
  for (const origin of SEED_ORIGINS) {
    await prisma.origin.upsert({
      where: { name: origin.name },
      update: {},
      create: origin,
    });
  }

  console.log('Seeding brewing methods...');
  for (const method of SEED_METHODS) {
    await prisma.brewingMethod.upsert({
      where: { name: method.name },
      update: { technique: method.technique ?? null },  // update technique on re-seed
      create: method,
    });
  }

  console.log('Seeding community brews...');
  const result = await prisma.brew.createMany({
    data: SEED_BREWS,
    skipDuplicates: true,
  });
  console.log(`  ${result.count} new brews inserted (${SEED_BREWS.length - result.count} already existed).`);

  console.log(`Seeded ${SEED_ORIGINS.length} origins, ${SEED_METHODS.length} brewing methods, and ${SEED_BREWS.length} community brews.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());