// Advanced usage examples
import * as http from '../index.mjs';

async function main() {
  // Example 1: Working with multipart/form-data
  console.log('=== Example 1: Multipart Form Data ===');
  const multipartRequest = {
    method: 'POST',
    url: '/upload',
    httpVersion: '1.1',
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
    },
    body: `------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

Hello World
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="description"

Test file upload
------WebKitFormBoundary7MA4YWxkTrZu0gW--`
  };

  const multipartCurl = await http.curl.fromRequest(multipartRequest);
  console.log('cURL:', multipartCurl);

  // Example 2: Working with authentication
  console.log('\n=== Example 2: Authentication Headers ===');
  const authRequest = {
    method: 'GET',
    url: 'https://api.example.com/protected',
    headers: {
      'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'x-api-key': 'secret-key-123'
    }
  };

  const authHar = await http.har.fromRequest(authRequest, {
    startedDateTime: new Date().toISOString(),
    time: 125,
    timings: {
      dns: 20,
      connect: 30,
      send: 5,
      wait: 50,
      receive: 20
    }
  });
  console.log('HAR with timings:', JSON.stringify(authHar.timings, null, 2));

  // Example 3: Response with cookies
  console.log('\n=== Example 3: Response with Cookies ===');
  const cookieResponse = {
    httpVersion: '1.1',
    statusCode: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'text/html',
      'set-cookie': [
        'session=abc123; Path=/; HttpOnly; Secure',
        'preferences=theme%3Ddark; Path=/; Max-Age=31536000'
      ]
    },
    body: '<html>Welcome!</html>'
  };

  const cookieResponseString = await http.string.stringifyResponse(cookieResponse);
  console.log('Response with cookies:\n', cookieResponseString);

  // Example 4: Complex cURL parsing
  console.log('\n=== Example 4: Complex cURL Parsing ===');
  const complexCurl = `curl -X PUT 'https://api.example.com/users/123' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -u admin:password123 \\
  -d '{"status":"active","role":"admin"}' \\
  --compressed \\
  -v \\
  --max-time 30`;

  const parsedComplex = http.curl.toRequest(complexCurl);
  console.log('Parsed complex cURL:', parsedComplex);

  // Example 5: Generate different fetch variations
  console.log('\n=== Example 5: Fetch Code Generation ===');
  const apiRequest = {
    method: 'POST',
    url: '/api/data',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({ query: 'test', limit: 10 })
  };

  console.log('Async/await style:');
  console.log(await http.fetch.toCode(apiRequest, { pretty: true, async: true }));

  console.log('\nPromise style:');
  console.log(await http.fetch.toCode(apiRequest, { pretty: true, async: false }));

  // Example 6: Working with redirects
  console.log('\n=== Example 6: Redirect Response ===');
  const redirectResponse = {
    statusCode: 302,
    statusText: 'Found',
    headers: {
      'location': 'https://example.com/new-location',
      'cache-control': 'no-cache'
    }
  };

  const redirectHar = await http.har.fromResponse(redirectResponse);
  console.log('Redirect URL from HAR:', redirectHar.response.redirectURL);

  // Example 7: Error handling
  console.log('\n=== Example 7: Error Handling ===');
  try {
    http.string.parse('INVALID HTTP STRING');
  } catch (error) {
    console.log('Parse error caught:', error.message);
  }

  try {
    http.curl.toRequest('not a curl command');
  } catch (error) {
    console.log('cURL parse error caught:', error.message);
  }

  // Example 8: Custom HAR entries with metadata
  console.log('\n=== Example 8: HAR with Metadata ===');
  const detailedHar = await http.har.fromRequest(
    {
      method: 'GET',
      url: 'https://api.example.com/data',
      headers: { 'accept': 'application/json' }
    },
    {
      serverIPAddress: '192.168.1.100',
      connection: 'keep-alive',
      comment: 'API health check request',
      timings: {
        blocked: 2,
        dns: 15,
        connect: 25,
        send: 1,
        wait: 100,
        receive: 5,
        ssl: 20
      }
    }
  );
  console.log('Server IP:', detailedHar.serverIPAddress);
  console.log('Comment:', detailedHar.comment);
  console.log('Total time:', Object.values(detailedHar.timings).reduce((a, b) => a + (b > 0 ? b : 0), 0) + 'ms');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
