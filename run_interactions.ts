import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import('./check_interactions.ts').catch(console.error);
