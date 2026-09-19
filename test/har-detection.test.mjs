import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as http from '../index.mjs';

describe('HAR Detection and Conversion', () => {
  test('should detect HAR entry from demo example', () => {
    const harExample = {
      "startedDateTime": "2024-01-15T10:30:00.000Z",
      "time": 125,
      "request": {
        "method": "GET",
        "url": "https://api.example.com/data",
        "httpVersion": "HTTP/1.1",
        "cookies": [],
        "headers": [
          { "name": "Accept", "value": "application/json" },
          { "name": "Authorization", "value": "Bearer token123" }
        ],
        "queryString": [
          { "name": "page", "value": "1" },
          { "name": "limit", "value": "10" }
        ],
        "headersSize": -1,
        "bodySize": 0
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "httpVersion": "HTTP/1.1",
        "cookies": [],
        "headers": [
          { "name": "Content-Type", "value": "application/json" },
          { "name": "Cache-Control", "value": "max-age=3600" }
        ],
        "content": {
          "size": 245,
          "mimeType": "application/json",
          "text": "{\"data\":[{\"id\":1,\"name\":\"Item 1\"}],\"total\":100}"
        },
        "redirectURL": "",
        "headersSize": -1,
        "bodySize": 245
      },
      "cache": {},
      "timings": {
        "blocked": 2,
        "dns": 15,
        "connect": 25,
        "send": 1,
        "wait": 70,
        "receive": 12,
        "ssl": 20
      }
    };
    
    const detected = http.detectType(harExample);
    assert.equal(detected, 'har');
  });

  test('should convert HAR entry to request', () => {
    const harEntry = {
      "startedDateTime": "2024-01-15T10:30:00.000Z",
      "request": {
        "method": "GET",
        "url": "https://api.example.com/data?page=1&limit=10",
        "httpVersion": "HTTP/1.1",
        "headers": [
          { "name": "Accept", "value": "application/json" }
        ],
        "queryString": [
          { "name": "page", "value": "1" },
          { "name": "limit", "value": "10" }
        ]
      }
    };
    
    const detected = http.detectType(harEntry);
    assert.equal(detected, 'har');
    
    const request = http.har.toRequest(harEntry);
    assert.equal(request.method, 'GET');
    assert.equal(request.url, 'https://api.example.com/data?page=1&limit=10');
    assert.equal(request.headers.accept, 'application/json');
  });

  test('should detect HAR request object', () => {
    const harRequest = {
      "method": "POST",
      "url": "/api/users",
      "httpVersion": "HTTP/1.1",
      "headers": [
        { "name": "Content-Type", "value": "application/json" }
      ],
      "cookies": [],
      "queryString": []
    };
    
    const detected = http.detectType(harRequest);
    assert.equal(detected, 'har');
  });

  test('should distinguish between HAR and regular request', () => {
    const regularRequest = {
      method: 'GET',
      url: '/api',
      headers: { 'accept': 'application/json' }
    };
    
    const harRequest = {
      method: 'GET',
      url: '/api',
      httpVersion: 'HTTP/1.1',
      headers: [{ name: 'accept', value: 'application/json' }]
    };
    
    assert.equal(http.detectType(regularRequest), 'request');
    assert.equal(http.detectType(harRequest), 'har');
  });
});
