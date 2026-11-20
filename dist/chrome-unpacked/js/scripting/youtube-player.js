/*******************************************************************************
    muBlock: optimized, scoped YouTube player-request handling for MV3 MAIN world (adapted from Fenix MV2).
    Adapted from the original muBlock fix and AdGuard Base Filter.
    Copyright AdGuard Software Ltd and contributors. GPL-3.0; see LICENSE.txt.
    Source: AdguardTeam/AdguardFilters BaseFilter/sections/specific.txt.
*/
(function muBlockYouTubePlayer() {
    'use strict';
    if ( location.hostname !== 'www.youtube.com' ) { return; }

    const marker = Symbol.for('muBlock.youtube-player');
    if ( self[marker] ) { return; }
    Object.defineProperty(self, marker, { value: true });

    const apply = Reflect.apply;
    const construct = Reflect.construct;
    const parse = JSON.parse;
    const stringify = JSON.stringify;
    const descriptor = Object.getOwnPropertyDescriptor;
    const hasOwn = Object.hasOwn;
    const functionText = Function.prototype.toString;
    const playerPath = /^\/youtubei\/v\d+\/(?:player|get_watch)$/;
    const excludedPath = /^\/(?:shorts|embed|tv)(?:\/|$)/;
    const playerParams = 'eAFgAQ';
    const noop = function() {};
    const xhrPlayerRequests = new WeakSet();

    // Cache only a just-serialized body until its first synchronous encoder
    // pass. Clear at the next microtask so separate requests are not skipped.
    let pendingEncodedBody;
    // YouTube navigates between videos without reloading the document.
    // Avoid repeating the regexp for the many intercepted JS operations;
    // invalidate the cache whenever the SPA route changes.
    let lastPath;
    let scopeEnabled;
    const inScope = () => {
        const path = location.pathname;
        if ( path !== lastPath ) {
            lastPath = path;
            scopeEnabled = !excludedPath.test(path);
        }
        return scopeEnabled;
    };
    const isObject = value => value !== null && typeof value === 'object';
    const ownData = (object, key) =>
        isObject(object) ? descriptor(object, key)?.value : undefined;
    const writable = (object, key) => {
        if ( !isObject(object) ) { return false; }
        const d = descriptor(object, key);
        return d ? d.writable === true : Object.isExtensible(object);
    };

    // The player API normally uses same-origin, root-relative URLs. Avoid
    // constructing a URL object for that overwhelmingly common form. URLs
    // containing backslashes or unusual relative syntax use native parsing so
    // normalization and origin checks preserve their existing semantics.
    const relativePlayerPath = /^\/youtubei\/v\d+\/(?:player|get_watch)(?:[?#]|$)/;
    const isPlayerURL = input => {
        try {
            const raw = typeof input === 'string' || input instanceof URL
                ? input : input?.url;
            if ( typeof raw === 'string' ) {
                if ( raw.startsWith('/youtubei/v') ) {
                    if ( !raw.includes('\\') && relativePlayerPath.test(raw) ) {
                        return true;
                    }
                    // Common log_event/browse API paths can be rejected
                    // without URL parsing. Keep native normalization for
                    // encoded paths and dot segments, where it matters.
                    const end = raw.search(/[?#]/);
                    const pathname = end === -1 ? raw : raw.slice(0, end);
                    if ( !playerPath.test(pathname) && !pathname.includes('\\') &&
                         !pathname.includes('%') && !pathname.includes('/.') &&
                         !/[\u0000-\u0020]/.test(pathname) ) {
                        return false;
                    }
                }
                if ( !raw.includes('youtubei') ) { return false; }
            }
            const url = raw instanceof URL ? raw : new URL(raw, location.href);
            return url.hostname === 'www.youtube.com' && playerPath.test(url.pathname);
        } catch { return false; }
    };

    const isRelevantPlayback = playback => {
        if ( !isObject(playback) ||
             !isObject(ownData(playback, 'contentPlaybackContext')) ) {
            return false;
        }
        const ad = ownData(playback, 'adPlaybackContext');
        return !ad || ownData(ad, 'pyv') === true ||
            ownData(ad, 'adType') === 'AD_TYPE_INSTREAM';
    };

    const modifyPlayback = playback => {
        playback.params = playerParams;
        const ad = ownData(playback, 'adPlaybackContext');
        if ( isObject(ad) ) {
            if ( ownData(ad, 'pyv') === true && descriptor(ad, 'pyv')?.configurable ) {
                delete ad.pyv;
            }
            if ( ownData(ad, 'adType') === 'AD_TYPE_INSTREAM' &&
                 descriptor(ad, 'adType')?.configurable ) {
                delete ad.adType;
            }
            if ( Object.keys(ad).length === 0 &&
                 descriptor(playback, 'adPlaybackContext')?.configurable ) {
                delete playback.adPlaybackContext;
            }
        }
        const content = ownData(playback, 'contentPlaybackContext');
        // Request an ad-free streaming session up front. YouTube may otherwise
        // attach an initial SABR backoff to the content stream when an ad slot
        // is blocked. Only modify validated WEB player requests, and respect
        // non-writable properties; no extra fetch hook or playback restart.
        const noAdDescriptor = descriptor(content, 'isInlinePlaybackNoAd');
        if ( noAdDescriptor ? noAdDescriptor.writable === true :
             Object.isExtensible(content) && !('isInlinePlaybackNoAd' in content) ) {
            content.isInlinePlaybackNoAd = true;
        }
        if ( writable(content, 'lactMilliseconds') ) {
            content.lactMilliseconds = String(Date.now());
        }
    };

    const modify = root => {
        if ( !inScope() || !isObject(root) ) { return false; }
        // Most objects are not player requests: reject them without touching
        // the context/client descriptors or consulting the DOM.
        const nested = ownData(root, 'playerRequest');
        if ( typeof (ownData(root, 'videoId') ?? ownData(nested, 'videoId')) !== 'string' ) {
            return false;
        }
        const client = ownData(ownData(root, 'context'), 'client');
        if ( !isObject(client) ) { return false; }
        const clientName = ownData(client, 'clientName');
        if ( clientName !== 'WEB' && clientName !== 1 && clientName !== '1' ) {
            return false;
        }
        const params = ownData(root, 'params');
        if ( typeof params === 'string' && params.startsWith('YAHI') ) {
            return false;
        }
        if ( ownData(client, 'clientScreen') === 'CHANNEL' ) {
            return false;
        }

        const first = ownData(root, 'playbackContext');
        const second = ownData(nested, 'playbackContext');
        const useFirst = isRelevantPlayback(first);
        const useSecond = second !== first && isRelevantPlayback(second);
        if ( !useFirst && !useSecond ) { return false; }

        const status = document.getElementById('movie_player')
            ?.getPlayerResponse?.()?.playabilityStatus?.status;
        if ( status === 'LOGIN_REQUIRED' || status === 'CONTENT_CHECK_REQUIRED' ) {
            return false;
        }
        // Validate every target before mutating anything.
        if ( !writable(root, 'params') ||
             (useFirst && !writable(first, 'params')) ||
             (useSecond && !writable(second, 'params')) ||
             (isObject(nested) && !writable(nested, 'params')) ) {
            return false;
        }

        root.params = playerParams;
        if ( isObject(nested) ) { nested.params = playerParams; }
        if ( useFirst ) { modifyPlayback(first); }
        if ( useSecond ) { modifyPlayback(second); }
        const config = ownData(client, 'configInfo');
        if ( isObject(config) && descriptor(config, 'appInstallData')?.configurable ) {
            delete config.appInstallData;
        }
        return true;
    };

    const rewriteEncodedBody = body => {
        // Most encoded strings have nothing to do with YouTube playback.
        // Check the payload marker before reading the SPA location getter.
        if ( typeof body !== 'string' ) { return body; }
        // A candidate is a JSON object, optionally preceded by JSON whitespace.
        // Exclude plain text and binary-as-text without scanning them for the
        // marker. Keep the whitespace route to preserve unusual request bodies.
        const first = body.charCodeAt(0);
        if ( first !== 0x7B && first !== 0x20 && first !== 0x09 &&
             first !== 0x0A && first !== 0x0D ) {
            return body;
        }
        if ( !body.includes('"contentPlaybackContext"') || !inScope() ) {
            return body;
        }
        if ( body === pendingEncodedBody ) {
            pendingEncodedBody = undefined; // Consume once, never indefinitely.
            return body;
        }
        try {
            const obj = parse(body);
            if ( !modify(obj) ) { return body; }
            return stringify(obj);
        } catch { return body; }
    };

    const hook = (owner, name, handler) => {
        const native = owner?.[name];
        if ( typeof native !== 'function' ) { return; }
        try { owner[name] = new Proxy(native, handler); } catch {}
    };

    hook(JSON, 'stringify', {
        apply(target, thisArg, args) {
            let modified = false;
            const value = args[0];
            // This hook sees *every* JSON serialization on YouTube. Every
            // supported player request must own its context property; avoid
            // all deeper player-shape checks for unrelated JSON objects.
            if ( isObject(value) ) {
                try {
                    if ( hasOwn(value, 'context') &&
                         (hasOwn(value, 'videoId') || hasOwn(value, 'playerRequest')) ) {
                        modified = modify(value);
                    }
                } catch {}
            }
            const output = apply(target, thisArg, args);
            // Only cache normal JSON serialization of an actual player request.
            // An unrelated or later request must still refresh lactMilliseconds.
            if ( modified && args[1] == null && typeof output === 'string' &&
                 output.includes('"contentPlaybackContext"') &&
                 output.includes('"params":"eAFgAQ"') ) {
                pendingEncodedBody = output;
                queueMicrotask(() => {
                    if ( pendingEncodedBody === output ) {
                        pendingEncodedBody = undefined;
                    }
                });
            }
            return output;
        },
    });
    hook(self.TextEncoder?.prototype, 'encode', {
        apply(target, thisArg, args) {
            if ( typeof args[0] === 'string' ) {
                args[0] = rewriteEncodedBody(args[0]);
            }
            return apply(target, thisArg, args);
        },
    });
    hook(self, 'Request', {
        construct(target, args, newTarget) {
            if ( args[1] && inScope() && isPlayerURL(args[0]) ) {
                const init = args[1];
                const d = descriptor(init, 'body');
                if ( d && 'value' in d && (d.configurable || d.writable) ) {
                    const body = rewriteEncodedBody(d.value);
                    if ( body !== d.value ) {
                        args[1] = new Proxy(init, {
                            get(object, prop) {
                                return prop === 'body'
                                    ? body : Reflect.get(object, prop, object);
                            },
                        });
                    }
                }
            }
            return construct(target, args, newTarget);
        },
    });
    hook(self.XMLHttpRequest?.prototype, 'open', {
        apply(target, thisArg, args) {
            const result = apply(target, thisArg, args);
            if ( isPlayerURL(args[1]) ) {
                xhrPlayerRequests.add(thisArg);
            } else {
                xhrPlayerRequests.delete(thisArg);
            }
            return result;
        },
    });
    hook(self.XMLHttpRequest?.prototype, 'send', {
        apply(target, thisArg, args) {
            if ( xhrPlayerRequests.has(thisArg) && typeof args[0] === 'string' ) {
                args[0] = rewriteEncodedBody(args[0]);
            }
            return apply(target, thisArg, args);
        },
    });

    // Fenix SABR streaming backoff mitigation (2026-11-17).
    // Inspired by the GPL-3.0 SABR fix in DuckDuckGo's content-blocker-extension
    // PR #65, and the Brave SABR investigation. Unlike the original Fenix
    // implementation this does not clone and await the entire first response:
    // UMP media parts are forwarded incrementally, and only small type-35
    // NEXT_REQUEST_POLICY parts are held until complete. The UMP framing and
    // content lengths are never altered.
    const sabrMaxPolicyBytes = 4096;
    const originalFetch = self.fetch;

    const sabrRequest = resource => {
        const raw = typeof resource === 'string' ? resource
            : resource instanceof URL ? resource.href : resource?.url;
        if ( typeof raw !== 'string' ||
             !raw.includes('googlevideo.com') || !raw.includes('sabr=1') ||
             !inScope() ) {
            return false;
        }
        try {
            const url = new URL(raw, location.href);
            return url.hostname.endsWith('.googlevideo.com') &&
                url.pathname === '/videoplayback' &&
                url.searchParams.get('sabr') === '1';
        } catch {
            return false;
        }
    };

    // UMP varints are *not* protobuf varints: the first byte encodes the
    // number of bytes used (1-5) through its high-order bit prefix.
    const umpLength = first => first < 0x80 ? 1 :
        first < 0xc0 ? 2 : first < 0xe0 ? 3 : first < 0xf0 ? 4 : 5;
    const umpNumber = (buf, offset, count) => {
        const b = buf[offset];
        switch ( count ) {
        case 1: return b;
        case 2: return (b & 0x3f) | (buf[offset+1] << 6);
        case 3: return (b & 0x1f) | (buf[offset+1] << 5) | (buf[offset+2] << 13);
        case 4: return ((b & 0x0f) | (buf[offset+1] << 4) |
            (buf[offset+2] << 12) | (buf[offset+3] << 20)) >>> 0;
        default: return (buf[offset+1] | (buf[offset+2] << 8) |
            (buf[offset+3] << 16) | (buf[offset+4] << 24)) >>> 0;
        }
    };
    const umpHeader = buf => {
        if ( buf.length < 2 ) { return null; }
        const typeLen = umpLength(buf[0]);
        if ( buf.length <= typeLen ) { return null; }
        const sizeLen = umpLength(buf[typeLen]);
        if ( buf.length < typeLen + sizeLen ) { return null; }
        return {
            type: umpNumber(buf, 0, typeLen),
            size: umpNumber(buf, typeLen, sizeLen),
            length: typeLen + sizeLen,
        };
    };
    const appendBytes = (left, right) => {
        if ( left.length === 0 ) { return right; }
        if ( right.length === 0 ) { return left; }
        const merged = new Uint8Array(left.length + right.length);
        merged.set(left);
        merged.set(right, left.length);
        return merged;
    };
    const protoInteger = (buf, at) => {
        let value = 0;
        for ( let exponent = 0; exponent < 7 && at < buf.length; exponent++ ) {
            const octet = buf[at++];
            value += (octet & 0x7f) * 2 ** (exponent * 7);
            if ( !(octet & 0x80) ) { return [ value, at ]; }
        }
        return null;
    };
    const zeroSabrBackoff = bytes => {
        // Parse the *whole* protobuf before making any changes. Malformed
        // payloads must pass through unchanged. Field 4 on other UMP part
        // types has different semantics and is never touched.
        let offset = 0, candidate = -1, candidateEnd = -1;
        while ( offset < bytes.length ) {
            const tag = protoInteger(bytes, offset);
            if ( !tag || tag[0] === 0 ) { return false; }
            const field = Math.floor(tag[0] / 8);
            const wire = tag[0] % 8;
            offset = tag[1];
            if ( wire === 0 ) {
                const valueStart = offset;
                const value = protoInteger(bytes, offset);
                if ( !value ) { return false; }
                offset = value[1];
                if ( field === 4 && value[0] >= 1000 && value[0] <= 16000 ) {
                    candidate = valueStart;
                    candidateEnd = offset;
                }
            } else if ( wire === 1 ) {
                if ( bytes.length - offset < 8 ) { return false; }
                offset += 8;
            } else if ( wire === 5 ) {
                if ( bytes.length - offset < 4 ) { return false; }
                offset += 4;
            } else if ( wire === 2 ) {
                const size = protoInteger(bytes, offset);
                if ( !size || !Number.isSafeInteger(size[0]) ||
                     size[0] > bytes.length - size[1] ) { return false; }
                offset = size[1] + size[0];
            } else { return false; }
        }
        if ( candidate < 0 ) { return false; }
        // Non-canonical but valid protobuf varint zero: preserve packet size.
        for ( let i = candidate; i < candidateEnd; i++ ) {
            bytes[i] = i === candidateEnd - 1 ? 0 : 0x80;
        }
        return true;
    };

    const makeSabrStreamRewriter = () => {
        let pending = new Uint8Array(0);
        let mode = 0; // 0 header, 1 passthrough-media, 2 collect-small-policy
        let remaining = 0;
        let headerBytes;
        let policyBytes;
        let policyOffset = 0;
        let failed = false;

        const emitPending = controller => {
            if ( headerBytes?.length ) { controller.enqueue(headerBytes); }
            if ( policyBytes && policyOffset ) {
                controller.enqueue(policyBytes.subarray(0, policyOffset));
            }
            if ( pending.length ) { controller.enqueue(pending); }
            headerBytes = undefined;
            policyBytes = undefined;
            policyOffset = 0;
            pending = new Uint8Array(0);
        };
        const completePolicy = controller => {
            zeroSabrBackoff(policyBytes);
            controller.enqueue(headerBytes);
            controller.enqueue(policyBytes);
            headerBytes = undefined;
            policyBytes = undefined;
            policyOffset = 0;
            mode = 0;
        };
        const transform = (chunk, controller) => {
            if ( !chunk?.length ) { return; }
            if ( failed ) { controller.enqueue(chunk); return; }
            try {
                pending = appendBytes(pending, chunk);
                for (;;) {
                    if ( mode === 0 ) {
                        const part = umpHeader(pending);
                        if ( !part ) { return; }
                        headerBytes = pending.subarray(0, part.length);
                        pending = pending.subarray(part.length);
                        remaining = part.size;
                        if ( part.type === 35 && part.size <= sabrMaxPolicyBytes ) {
                            policyBytes = new Uint8Array(part.size);
                            policyOffset = 0;
                            mode = 2;
                            if ( remaining === 0 ) { completePolicy(controller); }
                        } else {
                            controller.enqueue(headerBytes);
                            headerBytes = undefined;
                            mode = remaining ? 1 : 0;
                        }
                    } else if ( mode === 1 ) {
                        if ( pending.length === 0 ) { return; }
                        const n = Math.min(remaining, pending.length);
                        controller.enqueue(pending.subarray(0, n));
                        pending = pending.subarray(n);
                        remaining -= n;
                        if ( remaining === 0 ) { mode = 0; }
                    } else {
                        if ( pending.length === 0 ) { return; }
                        const n = Math.min(remaining, pending.length);
                        policyBytes.set(pending.subarray(0, n), policyOffset);
                        policyOffset += n;
                        pending = pending.subarray(n);
                        remaining -= n;
                        if ( remaining === 0 ) { completePolicy(controller); }
                    }
                    if ( pending.length === 0 && mode !== 0 ) { return; }
                    if ( pending.length === 0 ) { return; }
                }
            } catch {
                // Fail open. No media/policy bytes may be lost on a parse error.
                failed = true;
                emitPending(controller);
            }
        };
        return {
            transform,
            flush(controller) { emitPending(controller); },
        };
    };

    const maybeStreamSabrResponse = response => {
        if ( !response?.body || response.status === 204 ||
             response.status === 205 || response.status === 304 ||
             response.headers?.get('content-type')?.split(';', 1)[0].trim() !==
                 'application/vnd.yt-ump' ) {
            return response;
        }
        try {
            const stream = response.body.pipeThrough(
                new TransformStream(makeSabrStreamRewriter())
            );
            const rewritten = new Response(stream, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            });
            // A newly constructed Response loses native redirect metadata.
            for ( const key of [ 'url', 'type', 'redirected' ] ) {
                try {
                    Object.defineProperty(rewritten, key, {
                        value: response[key], configurable: true,
                    });
                } catch {}
            }
            return rewritten;
        } catch { return response; }
    };
    if ( typeof originalFetch === 'function' ) {
        try {
            self.fetch = new Proxy(originalFetch, {
                apply(target, thisArg, args) {
                    if ( !sabrRequest(args[0]) ) {
                        return apply(target, thisArg, args);
                    }
                    return apply(target, thisArg, args)
                        .then(maybeStreamSabrResponse);
                },
            });
        } catch {}
    }

    // Preserve the allocation-free two-entry MRU for the common immediate
    // repeat, and weakly cache older callbacks reused by the player. An
    // MRU-only cache repeatedly stringifies callbacks that alternate among
    // three or more handlers; WeakMap does not retain unreachable handlers.
    const callbackMatchCache = new WeakMap();
    let recentCallback, recentMatches = false;
    let previousCallback, previousMatches = false;
    hook(Promise.prototype, 'then', {
        apply(target, thisArg, args) {
            const callback = args[0];
            if ( typeof callback === 'function' ) {
                try {
                    if ( callback === recentCallback ) {
                        // A known non-matching callback does not need a
                        // page-location read, even after SPA navigation.
                        if ( recentMatches && inScope() ) { args[0] = noop; }
                    } else if ( callback === previousCallback ) {
                        if ( previousMatches && inScope() ) { args[0] = noop; }
                    } else if ( inScope() ) {
                        let matches = callbackMatchCache.get(callback);
                        if ( matches === undefined ) {
                            matches = apply(functionText, callback, [])
                                .includes('onAbnormalityDetected');
                            callbackMatchCache.set(callback, matches);
                        }
                        previousCallback = recentCallback;
                        previousMatches = recentMatches;
                        recentCallback = callback;
                        recentMatches = matches;
                        if ( matches ) { args[0] = noop; }
                    }
                } catch {}
            }
            return apply(target, thisArg, args);
        },
    });
})();
