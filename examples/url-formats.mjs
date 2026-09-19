import * as http from '../index.mjs';

console.log('=== HTTP URL Format Examples ===\n');

// Example 1: Absolute URL (default behavior)
const request1 = {
  method: 'GET',
  url: 'https://www.example.com/api/users?page=1',
  headers: {
    'Accept': 'application/json',
    'Authorization': 'Bearer token123'
  }
};

console.log('1. Absolute URL in request line (default):');
console.log(http.string.stringifyRequest(request1));

// Example 2: Path-only format
console.log('2. Path-only format (absoluteUrl: false):');
console.log(http.string.stringifyRequest(request1, { absoluteUrl: false }));

// Example 3: Relative URL
const request2 = {
  method: 'POST',
  url: '/api/users',
  headers: {
    'Host': 'api.example.com',
    'Content-Type': 'application/json'
  },
  body: '{"name":"John"}'
};

console.log('3. Relative URL (always uses path format):');
console.log(http.string.stringifyRequest(request2));

// Example 4: Parsing both formats
console.log('4. Parsing absolute URL request:');
const absoluteRequest = `GET https://api.example.com/v1/data HTTP/1.1
Host: api.example.com
Accept: application/json

`;
const parsed1 = http.string.parseRequest(absoluteRequest);
console.log('Parsed URL:', parsed1.url);

console.log('\n5. Parsing relative URL request:');
const relativeRequest = `GET /v1/data HTTP/1.1
Host: api.example.com
Accept: application/json

`;
const parsed2 = http.string.parseRequest(relativeRequest);
console.log('Parsed URL:', parsed2.url);

// Example 6: Native Request object
console.log('\n6. Native Request object:');
const nativeRequest = new Request('https://api.github.com/users/octocat', {
  headers: {
    'Accept': 'application/vnd.github.v3+json'
  }
});

http.string.stringifyRequest(nativeRequest).then(result => {
  console.log(result);
});
