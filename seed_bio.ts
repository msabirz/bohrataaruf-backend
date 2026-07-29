import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

const chunks = [
  // opening
  { chunk_type: 'opening', condition_key: null, template_text: "I'm *_NAME_*, a *_PROFESSION_* based in *_CITY_*.", language: 'en' },
  { chunk_type: 'opening', condition_key: null, template_text: "Based in *_CITY_*, I work as a *_PROFESSION_* and I'm looking to build a life with the right person.", language: 'en' },
  { chunk_type: 'opening', condition_key: null, template_text: "My name is *_NAME_*, and I currently work as a *_PROFESSION_* in *_CITY_*.", language: 'en' },
  // profession
  { chunk_type: 'profession', condition_key: null, template_text: "I hold a *_EDUCATION_* and take real pride in my work.", language: 'en' },
  { chunk_type: 'profession', condition_key: null, template_text: "My work as a *_PROFESSION_* keeps me busy, but I always make time for family and friends.", language: 'en' },
  { chunk_type: 'profession', condition_key: null, template_text: "I've spent years building my career, and now feels like the right time to also build a life with someone special.", language: 'en' },
  // family
  { chunk_type: 'family', condition_key: 'family_expectation:very_important', template_text: "Staying close to family after marriage matters a lot to me.", language: 'en' },
  { chunk_type: 'family', condition_key: 'family_expectation:very_important', template_text: "Family is at the center of my life, and I'd love a partner who feels the same.", language: 'en' },
  { chunk_type: 'family', condition_key: 'family_expectation:somewhat', template_text: "I'd like a life of our own, while still staying close to family.", language: 'en' },
  { chunk_type: 'family', condition_key: 'family_expectation:somewhat', template_text: "Family matters to me, though I also value having our own space as a couple.", language: 'en' },
  { chunk_type: 'family', condition_key: 'family_expectation:flexible', template_text: "I'm open either way when it comes to living near family.", language: 'en' },
  { chunk_type: 'family', condition_key: 'family_expectation:flexible', template_text: "Whether we live close to family or build our own space, I'm easygoing about it.", language: 'en' },
  // partner_pref
  { chunk_type: 'partner_pref', condition_key: 'partner_quality_tags:connection', template_text: "Someone I feel a genuine connection with matters more to me than anything else.", language: 'en' },
  { chunk_type: 'partner_pref', condition_key: 'partner_quality_tags:connection', template_text: "I'm looking for real chemistry and honest conversation.", language: 'en' },
  { chunk_type: 'partner_pref', condition_key: 'partner_quality_tags:career_oriented', template_text: "I'd love someone who's driven in their own career too.", language: 'en' },
  { chunk_type: 'partner_pref', condition_key: 'partner_quality_tags:career_oriented', template_text: "Ambition matters to me — I'd like a partner who's building something they care about.", language: 'en' },
  { chunk_type: 'partner_pref', condition_key: 'partner_quality_tags:family_oriented', template_text: "Family values are important to me in a partner.", language: 'en' },
  { chunk_type: 'partner_pref', condition_key: 'partner_quality_tags:family_oriented', template_text: "I hope to find someone who holds their family as close as I hold mine.", language: 'en' },
  { chunk_type: 'partner_pref', condition_key: 'partner_quality_tags:similar_values', template_text: "Shared values matter more to me than anything on paper.", language: 'en' },
  { chunk_type: 'partner_pref', condition_key: 'partner_quality_tags:similar_values', template_text: "I'm looking for someone whose outlook on life feels familiar.", language: 'en' },
  // closing
  { chunk_type: 'closing', condition_key: null, template_text: "Open to a conversation and taking it from there.", language: 'en' },
  { chunk_type: 'closing', condition_key: null, template_text: "Would love to know more about you too.", language: 'en' },
  { chunk_type: 'closing', condition_key: null, template_text: "Looking forward to seeing where this goes.", language: 'en' }
];

async function run() {
  try {
    // Clear existing bio_chunks for safety during local testing just in case
    await sql`DELETE FROM bio_chunks`;
    
    // Insert all chunks
    await sql`INSERT INTO bio_chunks ${sql(chunks)}`;
    
    // Query counts by type
    const countQuery = await sql`
      SELECT chunk_type, COUNT(*) as count 
      FROM bio_chunks 
      GROUP BY chunk_type 
      ORDER BY chunk_type
    `;
    console.log('--- Row Count By Type ---');
    console.log(countQuery);
    
    // Show a sample
    const sampleQuery = await sql`
      SELECT chunk_type, condition_key, template_text 
      FROM bio_chunks 
      ORDER BY chunk_type, condition_key
      LIMIT 10
    `;
    console.log('\n--- Sample Data ---');
    console.log(sampleQuery);
    
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    process.exit(0);
  }
}
run();
