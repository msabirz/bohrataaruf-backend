import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

function fillWildcards(template: string, userData: any): string | null {
  let filled = template;
  const matches = [...template.matchAll(/\*_([A-Z_]+)_\*/g)];
  for (const match of matches) {
    const key = match[1];
    let val = '';
    if (key === 'NAME') val = userData.name;
    else if (key === 'PROFESSION') val = userData.profession;
    else if (key === 'CITY') val = userData.city;
    else if (key === 'EDUCATION') val = userData.education;
    
    if (!val || val.trim() === '') return null; 
    filled = filled.replace(match[0], val);
  }
  return filled;
}

async function run() {
  try {
    const prefs = await sql`SELECT user_id FROM preferences LIMIT 1`;
    const userId = prefs[0].user_id;
    
    const userRow = await sql`SELECT name, city FROM users WHERE id = ${userId}`.then(res => res[0]);
    const profileRow = await sql`SELECT alias, profession, education FROM profiles WHERE user_id = ${userId}`.then(res => res[0]);

    const userData = {
      name: profileRow.alias || userRow.name?.split(' ')[0],
      profession: profileRow.profession || 'Software Engineer',
      city: userRow.city || 'Mumbai',
      education: profileRow.education || 'B.Tech',
    };
    
    console.log('--- USER DATA ---');
    console.log(userData);
    console.log('Prefs: { familyExpectation: null, tags: [] } (Simulating empty prefs)');

    const allChunks = await sql`SELECT chunk_type, condition_key, template_text FROM bio_chunks WHERE language = 'en'`;

    const getValidChunks = (type: string, condition: string | null = null) => {
      const filtered = allChunks.filter(c => 
        c.chunk_type === type && 
        (condition === null || c.condition_key === condition)
      );
      const filled = [];
      for (const c of filtered) {
        const text = fillWildcards(c.template_text, userData);
        if (text !== null) filled.push(text);
      }
      return filled;
    };

    const openings = getValidChunks('opening');
    const professions = getValidChunks('profession');
    const closings = getValidChunks('closing');
    
    // Simulate empty prefs
    const familyPool: string[] = [];
    const pTags: string[] = [];
    const tagMapping: Record<string, string> = {};

    const candidates = [];

    for (let i = 0; i < 3; i++) {
      const selectedChunks: string[] = [];
      let introLineStr = '';

      const opening = openings.length > 0 ? openings[i % openings.length] : null;
      if (opening) selectedChunks.push(opening);

      const profession = professions.length > 0 ? professions[i % professions.length] : null;
      if (profession) selectedChunks.push(profession);

      const family = familyPool.length > 0 ? familyPool[i % familyPool.length] : null;
      if (family) selectedChunks.push(family);

      let partnerPref = null;
      if (pTags.length > 0) {
        const rawTag = pTags[i % pTags.length];
        const targetTag = tagMapping[rawTag] || rawTag;
        const prefPool = getValidChunks('partner_pref', `partner_quality_tags:${targetTag}`);
        if (prefPool.length > 0) {
          partnerPref = prefPool[0]; 
          selectedChunks.push(partnerPref);
        }
      }

      const closing = closings.length > 0 ? closings[i % closings.length] : null;
      if (closing) selectedChunks.push(closing);

      const bioStr = selectedChunks.join(' ');
      const introChunks = [opening, family || partnerPref].filter(Boolean);
      introLineStr = introChunks.join(' ');

      candidates.push({ bio: bioStr, introLine: introLineStr });
    }

    console.log('\n--- CANDIDATES GENERATED (NULL PREFS) ---');
    candidates.forEach((c, idx) => {
      console.log(`\nCandidate ${idx + 1}:`);
      console.log(`Bio: ${c.bio}`);
      console.log(`IntroLine: ${c.introLine}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
