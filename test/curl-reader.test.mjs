import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCurlVersion,MAX_VERSION_CHARS} from '../curl-reader.mjs';

// Invented inventory strings: not affected-version claims or real machine data.
const record = (flags='AsynchDNS brotli SSL',header='curl 8.10.1 (example-platform) libcurl/8.10.1 brotli/1.1.0') =>
  `${header}\nRelease-Date: 2024-09-18\nProtocols: http https\nFeatures: ${flags}`;
test('complete reported feature and separate versions',()=>{
  const r=readCurlVersion(record());
  assert.equal(r.brotli,'listed');assert.equal(r.state,'reported');
  assert.equal(r.versions,'curl 8.10.1 · libcurl 8.10.1');
});
test('complete negative inventory stays about this output',()=>{
  const r=readCurlVersion(record('SSL','curl 8.10.1 (example) libcurl/8.10.1'));
  assert.equal(r.brotli,'not-listed');assert.match(r.title,/this output/);
  assert.match(r.next,/Other builds can differ/);
  assert.ok(!/safe|patched|not vulnerable/i.test(JSON.stringify(r)));
});
test('header and feature conflict is unresolved',()=>assert.equal(readCurlVersion(record('SSL')).state,'unassessed'));
test('empty, wrong type and unrecognized text',()=>{
  assert.equal(readCurlVersion(' \n').state,'empty');
  for(const t of [null,42,{},'not a curl record']) assert.equal(readCurlVersion(t).state,'unassessed');
});
test('bounded input, including the exact limit',()=>{
  const text=record();
  assert.equal(readCurlVersion(text+' '.repeat(MAX_VERSION_CHARS-text.length)).state,'reported');
  assert.equal(readCurlVersion('x'.repeat(MAX_VERSION_CHARS+1)).state,'unassessed');
});
test('multiple or duplicate records cannot select a convenient result',()=>{
  for(const t of [record()+'\n'+record(),record()+'\nFeatures: SSL',record().replace('Features:','Other:')]) {
    assert.equal(readCurlVersion(t).state,'unassessed');
  }
});
test('wrapped feature continuation cannot hide a later Brotli flag',()=>{
  assert.equal(readCurlVersion(record('SSL','curl 8.10.1 (example) libcurl/8.10.1')+'\n brotli').state,'unassessed');
});
test('feature names are exact, not substrings',()=>{
  assert.equal(readCurlVersion(record('SSL notbrotli','curl 8.10.1 (example) libcurl/8.10.1')).brotli,'not-listed');
});
test('duplicate feature names and unsupported formatting',()=>{
  for(const f of ['brotli BROTLI','', 'brotli <img/src=x>', 'SSL ...']) assert.equal(readCurlVersion(record(f)).state,'unassessed');
});
test('terminal and directional controls remain unassessed',()=>{
  for(const c of ['\u001b[32m','\u0000','\u202e','\u2066']) assert.equal(readCurlVersion(c+record()).state,'unassessed');
});
test('untrusted header text is never reflected',()=>{
  const r=readCurlVersion(record('brotli','curl 8.10.1 (<img src=x onerror=bad()>) libcurl/8.10.1'));
  assert.equal(r.brotli,'listed');assert.ok(!JSON.stringify(r).includes('<img'));
});
test('different tool/library versions are reported, not silently combined',()=>{
  const r=readCurlVersion(record('brotli','curl 8.10.1 (example) libcurl/8.9.0-DEV'));
  assert.equal(r.version_mismatch,true);assert.match(r.versions,/8.9.0-DEV/);
});
test('missing/duplicate library headers and leading chatter',()=>{
  for(const h of ['curl 8.10.1','curl 8.10.1 libcurl/8.10.1 libcurl/8.10.1','curl 8.10.1 fake-libcurl/8.10.1','anything\ncurl 8.10.1 libcurl/8.10.1']) {
    assert.equal(readCurlVersion(record('brotli',h)).state,'unassessed');
  }
});
test('CRLF and older feature sets remain usable',()=>{
  assert.equal(readCurlVersion(record().replaceAll('\n','\r\n')).brotli,'listed');
  assert.equal(readCurlVersion(record('IPv6 SSL','curl 7.70.0 (example) libcurl/7.70.0')).brotli,'not-listed');
});
test('malformed extra version fields cannot disappear during parsing',()=>{
  for(const h of ['curl 8.10.1 libcurl/8.10.1 libcurl/9.0',
                  'curl 8.10.1 libcurl/8.10.1 curl 9.0.0',
                  'curl 8.10.1 libcurl/8.10.1 fake-libcurl/9.0']) {
    assert.equal(readCurlVersion(record('SSL',h)).state,'unassessed');
  }
});
