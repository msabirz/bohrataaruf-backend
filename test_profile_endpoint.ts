import { signToken } from './src/lib/api/auth';

async function main() {
  const userId = '4e214c55-bdf8-4f5f-b711-cc5e08db67f2';
  const token = await signToken(userId);
  console.log('JWT TOKEN:', token);
  
  // Make fetch request
  const res = await fetch('http://localhost:3000/api/v1/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('STATUS:', res.status);
  const text = await res.text();
  console.log('RESPONSE:', text);
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
