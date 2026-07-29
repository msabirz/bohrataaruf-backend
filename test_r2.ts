import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

async function main() {
  const keys = [
    'its-cards/9a8dbd74-f340-4aa0-be03-82ff39025ca2-a47086d786022f51.jpg',
    'its-cards/aa56fa1d-4315-4da4-97e0-fa5bf5eeaeda-ef875d2bb24ace63.jpg',
    'its-cards/5b71ae83-cf25-4108-b4b0-11385719a959-345272f10a868442.jpg'
  ];

  for (const key of keys) {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
      console.log(`[OK] ${key} exists`);
    } catch (err: any) {
      console.error(`[FAIL] ${key} - ${err.name} / ${err.message}`);
    }
  }
}
main();
