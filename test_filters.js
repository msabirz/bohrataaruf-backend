const http = require('http');

const data = JSON.stringify({
  limit: 4,
  filters: {
    city: 'Pune'
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/matching/batch',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('RESPONSE:', JSON.stringify(JSON.parse(body), null, 2));
  });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
