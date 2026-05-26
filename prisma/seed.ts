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
  { name: 'Pour Over', description: 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)', default_temp_c: 93, grind_size: 'medium-fine', default_brew_time_s: 210, default_ratio: 0.0625 },
  { name: 'French Press', description: 'Immersion brewing with a metal mesh filter', default_temp_c: 96, grind_size: 'coarse', default_brew_time_s: 240, default_ratio: 0.0667 },
  { name: 'Aeropress', description: 'Rapid immersion + pressure extraction', default_temp_c: 85, grind_size: 'medium-fine', default_brew_time_s: 120, default_ratio: 0.0667 },
  { name: 'Espresso', description: 'High-pressure extraction through finely ground coffee', default_temp_c: 92, grind_size: 'fine', default_brew_time_s: 30, default_ratio: 0.5 },
  { name: 'Cold Brew', description: 'Long cold steep for smooth, low-acid coffee', default_temp_c: 20, grind_size: 'coarse', default_brew_time_s: 43200, default_ratio: 0.125 },
  { name: 'Moka Pot', description: 'Stovetop pressure brewing', default_temp_c: 90, grind_size: 'fine', default_brew_time_s: 300, default_ratio: 0.1429 },
  { name: 'Siphon', description: 'Vacuum-driven immersion brewing', default_temp_c: 93, grind_size: 'medium', default_brew_time_s: 90, default_ratio: 0.0667 },
  { name: 'Turkish', description: 'Very fine grind boiled in a cezve/ibrik', default_temp_c: 100, grind_size: 'extra-fine', default_brew_time_s: 180, default_ratio: 0.1 },
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
      update: {},
      create: method,
    });
  }

  console.log(`Seeded ${SEED_ORIGINS.length} origins and ${SEED_METHODS.length} brewing methods.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
