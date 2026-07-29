import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import('./check_reports.ts').catch(console.error);
