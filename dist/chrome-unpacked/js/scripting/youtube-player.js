/*******************************************************************************
    muBlock: scoped YouTube player-request handling.
    Adapted from AdGuard Base filter 2.5.2.17 (Chrome MV3 5.5.3.46),
    "Updated rules" in BaseFilter/sections/specific.txt.
    Copyright AdGuard Software Ltd and contributors. GPL-3.0; see LICENSE.txt.
    Source: AdguardTeam/AdguardFilters BaseFilter/sections/specific.txt.
*/
(function muBlockYouTubePlayer() {
    'use strict';
    if ( location.hostname !== 'www.youtube.com' ) { return; }
    const key = Symbol.for('muBlock.youtube-player');
    if ( self[key] ) { return; }
    const apply = Reflect.apply;
    const construct = Reflect.construct;
    const parse = JSON.parse;
    const stringify = JSON.stringify;
    const descriptor = Object.getOwnPropertyDescriptor;
    const functionText = Function.prototype.toString;
    // Retain only the idempotence marker; no diagnostic counters.
    Object.defineProperty(self, key, { value: true });

    const scoped = () => !/^\/(?:shorts|embed|tv)(?:\/|$)/.test(location.pathname);
    const record = value => value !== null && typeof value === 'object';
    const own = (obj, prop) => record(obj) ? descriptor(obj, prop)?.value : undefined;
    const requestURL = input => {
        try {
            const raw = typeof input === 'string' || input instanceof URL ? input : input?.url;
            const url = new URL(raw, location.href);
            return url.hostname === 'www.youtube.com' &&
                /^\/youtubei\/v\d+\/(?:player|get_watch)$/.test(url.pathname);
        } catch { return false; }
    };
    const writable = (obj, prop) => {
        const d = descriptor(obj, prop);
        return d ? d.writable === true : Object.isExtensible(obj);
    };

    // Follow AdGuard's first request strategy. Inspect only JSON data properties;
    // unrelated serialization must not run extra getters or clone an object.
    const modify = root => {
        if ( !scoped() ) { return false; }
        const context = own(root, 'context');
        const client = own(context, 'client');
        const nested = own(root, 'playerRequest');
        if ( !record(client) || typeof (own(root, 'videoId') ?? own(nested, 'videoId')) !== 'string' ) {
            return false;
        }
        if ( !['WEB', 1, '1'].includes(own(client, 'clientName')) ) {
            return false;
        }
        const params = own(root, 'params');
        if ( typeof params === 'string' && params.startsWith('YAHI') ) { return false; }
        if ( own(client, 'clientScreen') === 'CHANNEL' ) { return false; }
        const playback = [own(root, 'playbackContext'), own(nested, 'playbackContext')]
            .filter((p, i, all) => record(p) && all.indexOf(p) === i);
        const relevant = playback.filter(p => {
            const ad = own(p, 'adPlaybackContext');
            return record(own(p, 'contentPlaybackContext')) &&
                (!ad || own(ad, 'pyv') === true || own(ad, 'adType') === 'AD_TYPE_INSTREAM');
        });
        if ( relevant.length === 0 ) { return false; }
        const status = document.getElementById('movie_player')?.getPlayerResponse?.()?.playabilityStatus?.status;
        if ( status === 'LOGIN_REQUIRED' || status === 'CONTENT_CHECK_REQUIRED' ) { return false; }
        if ( !writable(root, 'params') || relevant.some(p => !writable(p, 'params')) ||
             record(nested) && !writable(nested, 'params') ) { return false; }

        root.params = 'eAFgAQ';
        if ( record(nested) ) { nested.params = 'eAFgAQ'; }
        for ( const p of relevant ) {
            p.params = 'eAFgAQ';
            const ad = own(p, 'adPlaybackContext');
            if ( record(ad) ) {
                if ( own(ad, 'pyv') === true && descriptor(ad, 'pyv')?.configurable ) { delete ad.pyv; }
                if ( own(ad, 'adType') === 'AD_TYPE_INSTREAM' && descriptor(ad, 'adType')?.configurable ) {
                    delete ad.adType;
                }
                if ( Object.keys(ad).length === 0 && descriptor(p, 'adPlaybackContext')?.configurable ) {
                    delete p.adPlaybackContext;
                }
            }
            const content = own(p, 'contentPlaybackContext');
            if ( writable(content, 'lactMilliseconds') ) {
                content.lactMilliseconds = String(Date.now());
            }
        }
        const config = own(client, 'configInfo');
        if ( record(config) && descriptor(config, 'appInstallData')?.configurable ) {
            delete config.appInstallData;
        }
        return true;
    };
    const encoded = body => {
        if ( typeof body !== 'string' || !scoped() ||
             !body.includes('"contentPlaybackContext"') ) { return body; }
        try {
            const obj = parse(body);
            if ( !modify(obj) ) { return body; }
            return stringify(obj);
        } catch { return body; }
    };
    const replace = (owner, prop, handler) => {
        const native = owner?.[prop];
        if ( typeof native !== 'function' ) { return; }
        try { owner[prop] = new Proxy(native, handler); } catch {}
    };

    replace(JSON, 'stringify', {
        apply(target, thisArg, args) {
            try { modify(args[0]); } catch {}
            return apply(target, thisArg, args);
        },
    });
    replace(self.TextEncoder?.prototype, 'encode', {
        apply(target, thisArg, args) {
            const body = encoded(args[0]);
            if ( body !== args[0] ) { args[0] = body; }
            return apply(target, thisArg, args);
        },
    });
    replace(self, 'Request', {
        construct(target, args, newTarget) {
            if ( scoped() && requestURL(args[0]) && args[1] ) {
                const init = args[1];
                const d = descriptor(init, 'body');
                if ( d && 'value' in d && (d.configurable || d.writable) ) {
                    const body = encoded(d.value);
                    if ( body !== d.value ) {
                        args[1] = new Proxy(init, {
                            get(target, prop) {
                                return prop === 'body' ? body : Reflect.get(target, prop, target);
                            },
                        });
                    }
                }
            }
            return construct(target, args, newTarget);
        },
    });
    const xhrURLs = new WeakMap();
    replace(self.XMLHttpRequest?.prototype, 'open', {
        apply(target, thisArg, args) {
            const result = apply(target, thisArg, args);
            xhrURLs.set(thisArg, requestURL(args[1]));
            return result;
        },
    });
    replace(self.XMLHttpRequest?.prototype, 'send', {
        apply(target, thisArg, args) {
            if ( xhrURLs.get(thisArg) ) {
                const body = encoded(args[0]);
                if ( body !== args[0] ) { args[0] = body; }
            }
            return apply(target, thisArg, args);
        },
    });

    // Exact AdGuard signature for the anti-adblock promise callback. All other
    // fulfillment/rejection callbacks and native promise semantics are retained.
    replace(Promise.prototype, 'then', {
        apply(target, thisArg, args) {
            try {
                if ( scoped() && typeof args[0] === 'function' &&
                     apply(functionText, args[0], []).includes('onAbnormalityDetected') ) {
                    args[0] = function() {};
                }
            } catch {}
            return apply(target, thisArg, args);
        },
    });
})();
