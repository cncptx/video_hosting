

(function () {
    "use strict";

    // ─── Config ────────────────────────────────────────────────────────────────
    var VIDEOJS_VERSION = "8.10.0";
    var CONTRIB_ADS_VERSION = "7.5.2";
    var IMA_VERSION = "1.0.1";

    var VIDEOJS_CSS = "https://cdn.jsdelivr.net/npm/video.js@" + VIDEOJS_VERSION + "/dist/video-js.min.css";
    var VIDEOJS_JS = "https://cdn.jsdelivr.net/npm/video.js@" + VIDEOJS_VERSION + "/dist/video.min.js";
    var CONTRIB_ADS_CSS = "https://cdnjs.cloudflare.com/ajax/libs/videojs-contrib-ads/" + CONTRIB_ADS_VERSION + "/videojs.ads.min.css";
    var CONTRIB_ADS_JS = "https://cdnjs.cloudflare.com/ajax/libs/videojs-contrib-ads/" + CONTRIB_ADS_VERSION + "/videojs.ads.min.js";
    var IMA_SDK_JS = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
    var VIDEOJS_IMA_CSS = "https://cdn.jsdelivr.net/npm/videojs-ima@" + IMA_VERSION + "/dist/videojs.ima.min.css";
    var VIDEOJS_IMA_JS = "https://cdn.jsdelivr.net/npm/videojs-ima@" + IMA_VERSION + "/dist/videojs.ima.min.js";

    // ─── Utilities ─────────────────────────────────────────────────────────────
    function loadCSS(href) {
        if (document.querySelector('link[href="' + href + '"]')) return;
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }

    function loadScript(src, callback) {
        if (document.querySelector('script[src="' + src + '"]')) { callback(); return; }
        var s = document.createElement("script");
        s.src = src; s.async = true;
        s.onload = callback;
        s.onerror = function () { console.error("[embed.js] Failed to load: " + src); };
        document.head.appendChild(s);
    }

    function loadScriptsSequential(srcs, done) {
        if (!srcs.length) return done();
        loadScript(srcs[0], function () { loadScriptsSequential(srcs.slice(1), done); });
    }

    function parseTime(val) {
        if (!val) return null;
        if (/^\d+$/.test(val)) return parseInt(val, 10);
        var parts = val.split(":").map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return null;
    }

    function buildAdTag(baseTag, position) {
        if (!baseTag) return null;
        var sep = baseTag.indexOf("?") === -1 ? "?" : "&";
        return baseTag + sep + "pos=" + position + "&ts=" + Date.now();
    }

    function uid() { return "vp-" + Math.random().toString(36).slice(2, 10); }

    // ─── Inject CSS ────────────────────────────────────────────────────────────
    // ConceptX brand palette: #0D0D0D bg, #F0C030 yellow accent, #FFFFFF text
    function injectPlayerCSS() {
        if (document.getElementById("embed-js-styles")) return;
        var style = document.createElement("style");
        style.id = "embed-js-styles";
        style.textContent = [
            // ── Layout ──────────────────────────────────────────────────────────────
            ".vp-wrapper { position: relative; width: 100%; background: #0d0d0d; border-radius: 6px; overflow: hidden; }",
            ".vp-wrapper video { display: block; }",
            ".video-js { width: 100% !important; height: 100% !important; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif !important; }",
            ".vp-wrapper.vp-responsive { padding-top: 56.25%; }",
            ".vp-wrapper.vp-responsive .video-js { position: absolute; top: 0; left: 0; }",

            // ── Control bar ─────────────────────────────────────────────────────────
            ".video-js .vjs-control-bar {",
            "  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%) !important;",
            "  height: 44px !important;",
            "  padding: 0 8px !important;",
            "  opacity: 0;",
            "  transition: opacity 0.25s ease !important;",
            "}",
            // Show controls on hover or when paused
            ".vp-wrapper:hover .vjs-control-bar,",
            ".video-js.vjs-paused .vjs-control-bar,",
            ".video-js.vjs-user-active .vjs-control-bar { opacity: 1 !important; }",

            // ── Progress bar — yellow accent ─────────────────────────────────────────
            ".video-js .vjs-play-progress { background: #F0C030 !important; }",
            ".video-js .vjs-play-progress:before { color: #F0C030 !important; font-size: 11px !important; top: 50% !important; transform: translateY(-50%) !important; right: -5px !important; }",
            ".video-js .vjs-load-progress { background: rgba(240,192,48,0.25) !important; }",
            ".video-js .vjs-slider { background: rgba(255,255,255,0.15) !important; }",
            ".video-js .vjs-progress-control:hover .vjs-progress-holder { font-size: 1.4em !important; }",

            // ── Volume slider ────────────────────────────────────────────────────────
            ".video-js .vjs-volume-level { background: #F0C030 !important; }",
            ".video-js .vjs-volume-level:before { color: #F0C030 !important; }",

            // ── Buttons ──────────────────────────────────────────────────────────────
            ".video-js .vjs-control { color: #fff !important; }",
            ".video-js .vjs-button:hover .vjs-icon-placeholder:before,",
            ".video-js .vjs-button:focus .vjs-icon-placeholder:before { color: #F0C030 !important; outline: none !important; }",
            ".video-js .vjs-time-control { font-size: 11px !important; line-height: 44px !important; padding: 0 4px !important; }",

            // ── Big play button — ConceptX yellow pill ───────────────────────────────
            ".video-js .vjs-big-play-button {",
            "  width: 68px !important;",
            "  height: 68px !important;",
            "  border-radius: 50% !important;",
            "  border: 2.5px solid #F0C030 !important;",
            "  background: rgba(13,13,13,0.72) !important;",
            "  backdrop-filter: blur(8px) !important;",
            "  -webkit-backdrop-filter: blur(8px) !important;",
            "  box-shadow: 0 0 0 0 rgba(240,192,48,0), 0 8px 32px rgba(0,0,0,0.6) !important;",
            "  top: 50% !important; left: 50% !important;",
            "  transform: translate(-50%, -50%) !important;",
            "  margin: 0 !important;",
            "  transition: background 0.18s, box-shadow 0.18s, transform 0.15s, border-color 0.18s !important;",
            "}",
            ".video-js:hover .vjs-big-play-button,",
            ".video-js .vjs-big-play-button:focus {",
            "  background: rgba(240,192,48,0.18) !important;",
            "  border-color: #F0C030 !important;",
            "  box-shadow: 0 0 0 6px rgba(240,192,48,0.18), 0 12px 40px rgba(0,0,0,0.7) !important;",
            "  transform: translate(-50%, -50%) scale(1.07) !important;",
            "  outline: none !important;",
            "}",
            ".video-js .vjs-big-play-button .vjs-icon-placeholder:before {",
            "  font-size: 30px !important;",
            "  line-height: 64px !important;",
            "  color: #F0C030 !important;",
            "  text-shadow: none !important;",
            "}",

            // Hide big play button while playing
            ".video-js.vjs-playing .vjs-big-play-button { display: none !important; }",

            // ── Branded watermark ────────────────────────────────────────────────────
            ".vp-brand {",
            "  position: absolute;",
            "  top: 10px;",
            "  left: 12px;",
            "  z-index: 10;",
            "  font-size: 11px;",
            "  font-weight: 700;",
            "  letter-spacing: 0.12em;",
            "  text-transform: uppercase;",
            "  color: rgba(255,255,255,0.55);",
            "  opacity: 1;",
            "  transition: opacity 0.3s;",
            "  pointer-events: none;",
            "  font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;",
            "}",
            // Accent X in yellow
            ".vp-brand span { color: #F0C030; }",
            // Fade watermark when controls are visible
            ".vp-wrapper:hover .vp-brand { opacity: 0; }",

            // ── Title overlay ────────────────────────────────────────────────────────
            ".vp-title {",
            "  position: absolute;",
            "  top: 0; left: 0; right: 0;",
            "  z-index: 10;",
            "  padding: 28px 16px 36px;",
            "  background: linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%);",
            "  font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;",
            "  font-size: 15px;",
            "  font-weight: 600;",
            "  color: #fff;",
            "  letter-spacing: 0.01em;",
            "  pointer-events: none;",
            "  opacity: 0;",
            "  transition: opacity 0.25s ease;",
            "}",
            // Show title when paused or on hover, hide during active play
            ".vp-wrapper:hover .vp-title,",
            ".video-js.vjs-paused .vp-title { opacity: 1; }",
            ".video-js.vjs-playing.vjs-user-inactive .vp-title { opacity: 0; }",

            // ── Skip button ──────────────────────────────────────────────────────────
            ".vp-skip-btn {",
            "  display: none;",
            "  position: absolute;",
            "  bottom: 54px;",
            "  right: 14px;",
            "  z-index: 9999;",
            "  cursor: pointer;",
            "  font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;",
            "  font-size: 12px;",
            "  font-weight: 700;",
            "  letter-spacing: 0.06em;",
            "  text-transform: uppercase;",
            "  color: #0d0d0d;",
            "  background: #F0C030;",
            "  border: none;",
            "  border-radius: 3px;",
            "  padding: 7px 14px;",
            "  transition: background 0.15s, transform 0.1s;",
            "  user-select: none;",
            "}",
            ".vp-skip-btn:hover { background: #ffd84d; transform: scale(1.03); }",
            ".vp-skip-btn.vp-skip-counting {",
            "  display: block;",
            "  cursor: default;",
            "  background: rgba(240,192,48,0.35);",
            "  color: rgba(255,255,255,0.8);",
            "  pointer-events: none;",
            "}",
            ".vp-skip-btn.vp-skip-ready { display: block; }",
        ].join("\n");
        document.head.appendChild(style);
    }

    // ─── Build skip overlay for one player ────────────────────────────────────
    function attachSkipOverlay(player, wrapper, skipOffset) {
        // skipOffset < 0 means no skip button at all
        if (skipOffset < 0) return;

        var btn = document.createElement("button");
        btn.className = "vp-skip-btn";
        btn.setAttribute("aria-label", "Skip ad");
        wrapper.appendChild(btn);

        var countdownTimer = null;

        function showCounting(secsLeft) {
            btn.className = "vp-skip-btn vp-skip-counting";
            btn.textContent = "Skip in " + secsLeft + " \u203a";
        }

        function showReady() {
            btn.className = "vp-skip-btn vp-skip-ready";
            btn.textContent = "Skip Ad \u203a";
        }

        function hide() {
            btn.className = "vp-skip-btn";
            btn.textContent = "";
            if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
        }

        function startCountdown() {
            if (countdownTimer) { clearInterval(countdownTimer); }
            var remaining = skipOffset;

            if (remaining === 0) {
                showReady();
                return;
            }

            showCounting(remaining);

            countdownTimer = setInterval(function () {
                remaining -= 1;
                if (remaining <= 0) {
                    clearInterval(countdownTimer);
                    countdownTimer = null;
                    showReady();
                } else {
                    showCounting(remaining);
                }
            }, 1000);
        }

        // Wire the click — force-end the ad via IMA then restore contrib-ads state
        btn.addEventListener("click", function () {
            if (!btn.classList.contains("vp-skip-ready")) return;
            hide();

            // Get the adsManager through the correct path: player.ima.controller
            var adsManager = null;
            try {
                if (player.ima && player.ima.controller) {
                    adsManager = player.ima.controller.getAdsManager();
                }
            } catch (e) { /* */ }

            if (adsManager) {
                // Prevent contrib-ads from restoring the old snapshot (wrong source)
                try { player.ads.disableNextSnapshotRestore = true; } catch (e) { /* */ }

                // Tell IMA to discard the current ad break and stop playback
                try { adsManager.discardAdBreak(); } catch (e) { /* */ }
                try { adsManager.stop(); } catch (e) { /* */ }

                // Once contrib-ads fires adend, trigger contentresumed and start playback
                player.one("adend", function () {
                    player.trigger("contentresumed");
                    player.play();
                });
            } else {
                // Fallback: no adsManager reference, just skip the ad slot entirely
                try { player.ads.skipLinearAdMode(); } catch (e) { /* */ }
            }
        });

        // Show/hide based on ad lifecycle
        player.on("ads-ad-started", function () { startCountdown(); });
        player.on("ads-complete", function () { hide(); });
        player.on("ads-skipped", function () { hide(); });
        player.on("ads-error", function () { hide(); });
        player.on("contentresumed", function () { hide(); });
    }

    // ─── Core: initialise one player instance ──────────────────────────────────
    function initPlayer(scriptTag) {
        var videoUrl = scriptTag.getAttribute("data-video");
        var vastTag = scriptTag.getAttribute("data-vast");
        var playerId = scriptTag.getAttribute("data-playerid");
        var posterUrl = scriptTag.getAttribute("data-poster") || "";
        var width = scriptTag.getAttribute("data-width") || "100%";
        var height = scriptTag.getAttribute("data-height");
        var autoplay = scriptTag.getAttribute("data-autoplay") === "true";
        var muted = scriptTag.getAttribute("data-muted") !== "false";
        // -1 = no skip button; 0 = immediately skippable; N = skip after N secs
        var titleText = scriptTag.getAttribute("data-title") || "";
        var skipOffset = scriptTag.hasAttribute("data-skip-offset")
            ? parseInt(scriptTag.getAttribute("data-skip-offset"), 10)
            : -1;

        if (!videoUrl) { console.error("[embed.js] data-video is required"); return; }

        var videoId = uid();

        // ── DOM ───────────────────────────────────────────────────────────────────
        var wrapper = document.createElement("div");
        wrapper.className = "vp-wrapper" + (height ? "" : " vp-responsive");
        wrapper.style.width = width;
        if (height) wrapper.style.height = height;

        var videoEl = document.createElement("video");
        videoEl.id = videoId;
        videoEl.className = "video-js vjs-big-play-centered";
        videoEl.setAttribute("playsinline", "");
        if (posterUrl) videoEl.setAttribute("poster", posterUrl);
        if (muted) videoEl.setAttribute("muted", "");

        var sourceEl = document.createElement("source");
        sourceEl.src = videoUrl;
        sourceEl.type = videoUrl.endsWith(".m3u8") ? "application/x-mpegURL" : "video/mp4";
        videoEl.appendChild(sourceEl);
        wrapper.appendChild(videoEl);

        // ── ConceptX watermark ────────────────────────────────────────────────────
        var brand = document.createElement("div");
        brand.className = "vp-brand";
        brand.innerHTML = "Concept<span>X</span>";
        wrapper.appendChild(brand);

        // ── Title overlay ─────────────────────────────────────────────────────────
        if (titleText) {
            var titleEl = document.createElement("div");
            titleEl.className = "vp-title";
            titleEl.textContent = titleText;
            wrapper.appendChild(titleEl);
        }

        scriptTag.parentNode.insertBefore(wrapper, scriptTag.nextSibling);

        // ── Video.js ──────────────────────────────────────────────────────────────
        /* global videojs */
        var player = videojs(videoId, {
            controls: true,
            autoplay: autoplay ? "muted" : false,
            muted: muted,
            fluid: !height,
            responsive: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            controlBar: {
                children: [
                    "playToggle", "volumePanel", "currentTimeDisplay", "timeDivider",
                    "durationDisplay", "progressControl", "playbackRateMenuButton", "fullscreenToggle",
                ],
            },
        });

        // ── Tracking ──────────────────────────────────────────────────────────────
        attachTracking(player, videoId, videoUrl);

        // ── Auto-hide controls & overlay on inactivity ──────────────────────────
        var hideTimer = null;
        function scheduleHide() {
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(function () {
                player.userActive(false);
            }, 2500);
        }
        // Hide immediately on click-to-play (once playing)
        player.on("play", function () { scheduleHide(); });
        // Reset timer on any mouse move inside the wrapper
        wrapper.addEventListener("mousemove", function () {
            if (!player.paused()) {
                player.userActive(true);
                scheduleHide();
            }
        });
        // Always show when paused
        player.on("pause", function () {
            if (hideTimer) clearTimeout(hideTimer);
            player.userActive(true);
        });

        // ── IMA ───────────────────────────────────────────────────────────────────
        if (playerId) {
            player.ready(async function () {
                console.log("[embed.js] VAST Tag", globalThis.concept);
                // const playerId = 'PLAYERID';
                const CREATEDTAG = globalThis.conceptConfig.usePrebid
                    ? await globalThis.concept.requestPrebidUrl(playerId)
                    : globalThis.concept.buildVastTag(playerId);
                console.log('created tag', CREATEDTAG);

                var adBreaks = [{
                    id: "preroll", adTagUrl: buildAdTag(CREATEDTAG, "preroll"), type: "preroll",
                }];

                var midrollRaw = scriptTag.getAttribute("data-midroll");
                if (midrollRaw) {
                    midrollRaw.split(",").forEach(function (chunk, idx) {
                        var secs = parseTime(chunk.trim());
                        if (secs !== null) {
                            adBreaks.push({ id: "midroll-" + idx, adTagUrl: buildAdTag(CREATEDTAG, "midroll"), type: "midroll", time: secs });
                        }
                    });
                }

                player.ima({
                    id: videoId,
                    adTagUrl: adBreaks[0].adTagUrl,
                    adBreaks: adBreaks.length > 1 ? adBreaks : undefined,
                    disableCustomPlaybackForIOS10Plus: true,
                });

                // Attach our own skip overlay (works regardless of VAST skipoffset)
                attachSkipOverlay(player, wrapper, skipOffset);

                player.on("ads-ad-started", function () { console.log("[embed.js] Ad started"); });
                player.on("ads-complete", function () { console.log("[embed.js] Ad complete"); });
                player.on("ads-skipped", function () { console.log("[embed.js] Ad skipped"); });
                player.on("ads-error", function (e) { console.warn("[embed.js] Ad error", e); });
            });
        }

        return player;
    }

    // ─── Tracking ──────────────────────────────────────────────────────────────
    // All events are fired on window as CustomEvents so the publisher page can
    // listen with: window.addEventListener('cxp:quartile', e => console.log(e.detail))
    // Replace the console.log calls below with your own analytics endpoint.

    function attachTracking(player, videoId, videoUrl) {
        var tracked = {
            start: false,
            q25: false,
            q50: false,
            q75: false,
            complete: false,
        };
        var sessionStart = null;
        var totalWatched = 0;       // seconds actually watched (pauses excluded)
        var watchStart = null;

        function emit(eventName, data) {
            var payload = Object.assign({ videoId: videoId, videoUrl: videoUrl }, data);
            // ── Console log (replace/extend with your endpoint) ──────────────────
            console.log("[cxp:track] " + eventName, payload);
            // ── CustomEvent on window (publisher can listen to these) ────────────
            try {
                window.dispatchEvent(new CustomEvent("cxp:" + eventName, { detail: payload }));
            } catch (e) { }
            // ── Example: POST to your own endpoint ───────────────────────────────
            // fetch("https://track.yourdomain.com/event", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ event: eventName, ...payload }),
            //   keepalive: true   // fires even if page is closing
            // });
        }

        // ── Watch-time accumulator ────────────────────────────────────────────────
        function startWatchClock() {
            if (!watchStart) watchStart = Date.now();
        }
        function stopWatchClock() {
            if (watchStart) {
                totalWatched += (Date.now() - watchStart) / 1000;
                watchStart = null;
            }
        }

        // ── Core playback events ─────────────────────────────────────────────────
        player.on("play", function () {
            if (!sessionStart) sessionStart = Date.now();
            startWatchClock();

            if (!tracked.start) {
                tracked.start = true;
                emit("video_start", {
                    currentTime: Math.round(player.currentTime()),
                    duration: Math.round(player.duration()),
                });
            }
        });

        player.on("pause", function () {
            stopWatchClock();
            // Don't fire pause during ad breaks
            if (player.ads && player.ads.inAdBreak && player.ads.inAdBreak()) return;
            emit("video_pause", {
                currentTime: Math.round(player.currentTime()),
                duration: Math.round(player.duration()),
                watchedSecs: Math.round(totalWatched),
            });
        });

        player.on("ended", function () {
            stopWatchClock();
            if (!tracked.complete) {
                tracked.complete = true;
                emit("video_complete", {
                    duration: Math.round(player.duration()),
                    watchedSecs: Math.round(totalWatched),
                    sessionSecs: sessionStart ? Math.round((Date.now() - sessionStart) / 1000) : null,
                });
            }
        });

        // ── Quartile tracking ────────────────────────────────────────────────────
        player.on("timeupdate", function () {
            var cur = player.currentTime();
            var dur = player.duration();
            if (!dur || dur === Infinity) return;
            // Skip tracking during ad breaks
            if (player.ads && player.ads.inAdBreak && player.ads.inAdBreak()) return;

            var pct = cur / dur;

            if (!tracked.q25 && pct >= 0.25) {
                tracked.q25 = true;
                emit("quartile_25", { currentTime: Math.round(cur), duration: Math.round(dur) });
            }
            if (!tracked.q50 && pct >= 0.50) {
                tracked.q50 = true;
                emit("quartile_50", { currentTime: Math.round(cur), duration: Math.round(dur) });
            }
            if (!tracked.q75 && pct >= 0.75) {
                tracked.q75 = true;
                emit("quartile_75", { currentTime: Math.round(cur), duration: Math.round(dur) });
            }
        });

        // ── Seek tracking ────────────────────────────────────────────────────────
        var seekStart = null;
        player.on("seeking", function () { seekStart = Math.round(player.currentTime()); });
        player.on("seeked", function () {
            if (seekStart === null) return;
            emit("seek", {
                from: seekStart,
                to: Math.round(player.currentTime()),
                duration: Math.round(player.duration()),
            });
            seekStart = null;
        });

        // ── Volume / mute ────────────────────────────────────────────────────────
        player.on("volumechange", function () {
            emit("volume_change", {
                volume: Math.round(player.volume() * 100),
                muted: player.muted(),
            });
        });

        // ── Fullscreen ───────────────────────────────────────────────────────────
        player.on("fullscreenchange", function () {
            emit(player.isFullscreen() ? "fullscreen_enter" : "fullscreen_exit", {
                currentTime: Math.round(player.currentTime()),
            });
        });

        // ── Ad events ────────────────────────────────────────────────────────────
        player.on("ads-ad-started", function () { emit("ad_start", { type: "linear" }); });
        player.on("ads-complete", function () { emit("ad_complete", { type: "linear" }); });
        player.on("ads-skipped", function () { emit("ad_skip", { type: "linear" }); });
        player.on("ads-error", function (e) { emit("ad_error", { error: String(e) }); });

        // ── Errors ───────────────────────────────────────────────────────────────
        player.on("error", function () {
            var err = player.error();
            emit("player_error", { code: err ? err.code : null, message: err ? err.message : null });
        });
    }

    // ─── Find script tags ──────────────────────────────────────────────────────
    function findScriptTags() {
        var all = document.querySelectorAll("script[data-video]");
        var byMarker = document.querySelectorAll("script[data-embed-player]");
        var combined = [], seen = new Set();
        [].forEach.call(all, function (el) { if (!seen.has(el)) { seen.add(el); combined.push(el); } });
        [].forEach.call(byMarker, function (el) { if (!seen.has(el)) { seen.add(el); combined.push(el); } });
        return combined;
    }

    // ─── Bootstrap ─────────────────────────────────────────────────────────────
    function bootstrap() {
        injectPlayerCSS();
        loadCSS(VIDEOJS_CSS);
        loadCSS(CONTRIB_ADS_CSS);
        loadCSS(VIDEOJS_IMA_CSS);

        var scriptTags = findScriptTags();
        if (!scriptTags.length) { console.warn("[embed.js] No script tags with data-video found."); return; }

        // Order matters: video.js → contrib-ads → IMA SDK → videojs-ima
        loadScriptsSequential([VIDEOJS_JS, CONTRIB_ADS_JS, IMA_SDK_JS, VIDEOJS_IMA_JS], function () {
            scriptTags.forEach(function (tag) {
                try { initPlayer(tag); }
                catch (e) { console.error("[embed.js] Player init failed", e); }
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
        bootstrap();
    }
})();