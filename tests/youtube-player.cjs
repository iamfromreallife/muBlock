'use strict';
// Regression coverage for the YouTube MAIN-world script from the uploaded
// Fenix MV2 ZIP. Uses only native Node streams and mock page browser APIs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const file = process.argv[2] ||
  path.resolve(__dirname, '../dist/chrome-unpacked/js/scripting/youtube-player.js');
const script = fs.readFileSync(file, 'utf8');

function environment(route = '/watch') {
  const fetchCalls = [];
  const replies = [];
  const pageFetch = async (input, init) => {
    fetchCalls.push({ input, init });
    return replies.shift() ?? new Response('unchanged');
  };
  class XHR {
    open(method, url) { this.url = url; }
    send(body) { this.body = body; }
  }
  const page = {
    location: {
      hostname: 'www.youtube.com',
      pathname: route,
      href: 'https://www.youtube.com' + route,
    },
    document: { getElementById: () => null },
    URL, Request, Response, ReadableStream, TransformStream, Uint8Array,
    TextEncoder, XMLHttpRequest: XHR, JSON: {
      parse: JSON.parse, stringify: JSON.stringify,
    },
    Promise, Function, Date, Reflect, Symbol, Object, queueMicrotask,
    fetch: pageFetch,
  };
  page.self = page;
  vm.runInNewContext(script, page, { filename: file });
  return { page, replies, fetchCalls };
}

const player = () => ({
  videoId: 'video-123',
  context: { client: { clientName: 'WEB',
    configInfo: { appInstallData: 'unused' } } },
  playbackContext: {
    adPlaybackContext: { pyv: true, adType: 'AD_TYPE_INSTREAM' },
    contentPlaybackContext: { lactMilliseconds: '0' },
  },
});

const response = (chunks, mime = 'application/vnd.yt-ump') => {
  const length = chunks.reduce((n, part) => n + part.length, 0);
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(Uint8Array.from(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': mime, 'content-length': String(length) },
  });
};

async function main() {
  const a = environment();
  const request = player();
  const output = a.page.JSON.stringify(request);
  assert.match(output, /"params":"eAFgAQ"/);
  assert.equal(request.playbackContext.contentPlaybackContext.isInlinePlaybackNoAd, true);
  assert.equal(request.playbackContext.adPlaybackContext, undefined);
  assert.equal(request.context.client.configInfo.appInstallData, undefined);

  const other = player();
  other.context.client.clientName = 'ANDROID';
  a.page.JSON.stringify(other);
  assert.equal(other.params, undefined);

  const shorts = environment('/shorts/abc');
  const scoped = player();
  shorts.page.JSON.stringify(scoped);
  assert.equal(scoped.params, undefined);
  shorts.page.location.pathname = '/watch';
  shorts.page.JSON.stringify(scoped);
  assert.equal(scoped.params, 'eAFgAQ');

  // UMP part 35 NEXT_REQUEST_POLICY with protobuf field 4 = 2000 ms,
  // surrounded by a media part. Split the policy over network chunks.
  const media = [42, 4, 1, 2, 3, 4];
  const policy = [35, 3, 0x20, 0xd0, 0x0f];
  a.replies.push(response([[...media, 35], [3, 0x20], [0xd0], [0x0f]]));
  const sabr = 'https://r1---sn-abc.googlevideo.com/videoplayback?sabr=1';
  const rewritten = await a.page.fetch(sabr);
  assert.equal(rewritten.status, 200);
  assert.equal(rewritten.headers.get('content-length'), '11');
  const bytes = Array.from(new Uint8Array(await rewritten.arrayBuffer()));
  assert.deepEqual(bytes, [...media, 35, 3, 0x20, 0x80, 0]);
  assert.equal(bytes.length, 11);

  a.replies.push(response([policy]));
  const nonSabr = await a.page.fetch(sabr.replace('sabr=1', 'sabr=0'));
  assert.deepEqual(Array.from(new Uint8Array(await nonSabr.arrayBuffer())), policy);
  a.replies.push(response([[35, 3, 0x20, 0x80, 0x80]]));
  const malformed = await a.page.fetch(sabr);
  assert.deepEqual(
    Array.from(new Uint8Array(await malformed.arrayBuffer())),
    [35, 3, 0x20, 0x80, 0x80],
  );
  a.replies.push(response([policy], 'text/plain'));
  const otherMime = await a.page.fetch(sabr);
  assert.deepEqual(Array.from(new Uint8Array(await otherMime.arrayBuffer())), policy);
  console.log('PASS: MV3 player requests, SPA paths, SABR backoff, framing, and passthrough');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
