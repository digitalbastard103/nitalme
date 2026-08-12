/* nital.me - small, dependency-free, no build step. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── staggered reveals ─────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');

  Array.prototype.forEach.call(reveals, function (el) {
    var d = el.getAttribute('data-delay');
    if (d) el.style.setProperty('--d', d);
  });

  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });

    /* hero fires immediately on load rather than waiting on scroll */
    requestAnimationFrame(function () {
      document.querySelectorAll('.hero .reveal').forEach(function (el) {
        el.classList.add('in');
      });
    });

    /* project bands get their accent rule drawn in */
    var bandIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); bandIO.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.band').forEach(function (b) { bandIO.observe(b); });
  }

  /* ── hero word fragments ───────────────────────────────── */
  document.querySelectorAll('.hl[data-fragment]').forEach(function (word) {
    var frag = document.createElement('span');
    frag.className = 'frag';
    frag.setAttribute('aria-hidden', 'true');
    var img = document.createElement('img');
    img.src = word.getAttribute('data-fragment');
    img.alt = '';
    frag.appendChild(img);
    word.appendChild(frag);
  });

  /* ── chapter indicator in the nav ──────────────────────── */
  var chapter = document.getElementById('chapter');
  var chaptered = document.querySelectorAll('[data-chapter]');

  if (chapter && chaptered.length && 'IntersectionObserver' in window) {
    var current = '';
    var chIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var label = e.target.getAttribute('data-chapter');
        if (label === current) return;
        current = label;
        chapter.textContent = label;
        chapter.classList.add('on');
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    Array.prototype.forEach.call(chaptered, function (s) { chIO.observe(s); });

    /* hide the label again once we're back at the top */
    var top = document.querySelector('.hero');
    if (top) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && e.intersectionRatio > 0.5) {
            chapter.classList.remove('on');
            current = '';
          }
        });
      }, { threshold: [0.5] }).observe(top);
    }
  }

  /* ── mobile full-screen index ──────────────────────────── */
  var toggle = document.getElementById('navToggle');
  var index = document.getElementById('index');

  function closeIndex() {
    if (!index || index.hidden) return;
    index.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Index';
    document.body.style.overflow = '';
  }

  if (toggle && index) {
    toggle.addEventListener('click', function () {
      var open = index.hidden;
      index.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Index';
      document.body.style.overflow = open ? 'hidden' : '';
    });

    index.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeIndex();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeIndex();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeIndex();
    });
  }

  /* ── nav gets out of the way on the way down ───────────── */
  var nav = document.getElementById('nav');
  if (nav) {
    var lastY = window.scrollY;
    var ticking = false;

    var onScroll = function () {
      var y = window.scrollY;
      var down = y > lastY;

      /* never hide while the mobile index is open, or near the top */
      if (index && !index.hidden) {
        nav.classList.remove('hide');
      } else if (y < 120) {
        nav.classList.remove('hide');
      } else if (Math.abs(y - lastY) > 6) {
        nav.classList.toggle('hide', down);
      }

      lastY = y;
      ticking = false;
    };

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }, { passive: true });
  }

  /* ── pause the artwork strip while hovered ─────────────── */
  var strip = document.querySelector('.strip');
  if (strip && !reduced) {
    strip.addEventListener('pointerenter', function () { strip.style.animationPlayState = 'paused'; });
    strip.addEventListener('pointerleave', function () { strip.style.animationPlayState = 'running'; });
  }

  /* ── the Seven Stripes player ──────────────────────────── */
  (function () {
    var list = document.getElementById('tracks');
    var player = document.getElementById('player');
    var wave = document.getElementById('waveform');
    if (!list || !player || !wave) return;

    var rows = Array.prototype.slice.call(list.querySelectorAll('.track'));
    if (!rows.length) return;

    var playBtn = document.getElementById('playBtn');
    var artEl = document.getElementById('playerArt');
    var titleEl = document.getElementById('playerTitle');
    var artistEl = document.getElementById('playerArtist');
    var labelEl = document.getElementById('playerLabel');
    var nowEl = document.getElementById('timeNow');
    var totalEl = document.getElementById('timeTotal');
    var baseWf = wave.querySelector('.wf--base');
    var playedWf = wave.querySelector('.wf--played');

    var BARS = 48;
    var audio = new Audio();
    audio.preload = 'none';
    var current = -1;
    var pendingSeek = null;   /* a scrub that arrived before duration was known */

    /* Bar heights are derived from the title, so every track gets its own
       recognisable shape without decoding the audio. See README for how to
       swap this for real peaks. */
    function shapeFor(title) {
      var h = 2166136261;
      for (var i = 0; i < title.length; i++) { h ^= title.charCodeAt(i); h = Math.imul(h, 16777619); }
      var seed = h >>> 0;
      var next = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      var out = [];
      for (var b = 0; b < BARS; b++) {
        var t = b / (BARS - 1);
        var envelope = 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * t), 0.6);
        out.push(Math.max(0.12, Math.min(1, envelope * (0.35 + 0.65 * next()))));
      }
      return out;
    }

    function drawWave(title) {
      var shape = shapeFor(title);
      [baseWf, playedWf].forEach(function (layer) {
        layer.textContent = '';
        var frag = document.createDocumentFragment();
        shape.forEach(function (v) {
          var s = document.createElement('span');
          s.style.height = (v * 100).toFixed(1) + '%';
          frag.appendChild(s);
        });
        layer.appendChild(frag);
      });
    }

    function clock(secs) {
      if (!isFinite(secs) || secs < 0) return '--:--';
      var m = Math.floor(secs / 60);
      var s = Math.floor(secs % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }

    /* Accepts "1:12", "72" or "1:12.5" - whichever is easier to type. */
    function parseTime(v) {
      if (v === null || v === undefined) return null;
      v = String(v).trim();
      if (v === '') return null;
      if (/^\d+(\.\d+)?$/.test(v)) return parseFloat(v);
      var m = v.match(/^(\d+):([0-5]?\d(?:\.\d+)?)$/);
      return m ? parseInt(m[1], 10) * 60 + parseFloat(m[2]) : null;
    }

    /* The excerpt window for a row. Everything the player shows - the waveform,
       the clock, the listed duration - is relative to this window, so a preview
       behaves exactly like a short track. No start/end means the whole file. */
    function clipOf(row) {
      var s = parseTime(row.getAttribute('data-start'));
      var e = parseTime(row.getAttribute('data-end'));
      return { start: s === null ? 0 : s, end: e };   /* end null = play to the end */
    }

    var clip = { start: 0, end: null };
    function clipEnd() { return clip.end !== null ? clip.end : (audio.duration || 0); }
    function clipLength() { return Math.max(0, clipEnd() - clip.start); }

    /* ── excerpt fades ──────────────────────────────────────
       Only excerpts fade: a full track already ends the way it was written.
       FADE_IN exists because cutting in mid-song is as abrupt as cutting out.
       Set either to 0 to switch it off.                                    */
    var FADE_OUT = 1.4;
    var FADE_IN = 0.4;
    /* Land on silence a beat before the cut. Without this the coarse 4Hz
       timeupdate fallback can leave the last ~250ms audible at ~0.17 and the
       excerpt still ends on an audible clip. */
    var FADE_TAIL = 0.2;
    var fadeRaf = null;

    function applyFade() {
      if (clip.end === null) { audio.volume = 1; return; }   /* full track */
      var t = audio.currentTime;
      var rising = FADE_IN > 0 ? (t - clip.start) / FADE_IN : 1;
      var falling = FADE_OUT > 0 ? (clip.end - FADE_TAIL - t) / FADE_OUT : 1;
      audio.volume = Math.max(0, Math.min(1, rising, falling));
    }

    /* timeupdate only fires ~4x a second, which is audibly steppy over a
       1.4s fade, so ride it on rAF while playing and keep timeupdate as the
       fallback for when rAF is throttled in a background tab. */
    function fadeLoop() {
      if (audio.paused) { fadeRaf = null; return; }
      applyFade();
      fadeRaf = requestAnimationFrame(fadeLoop);
    }
    function startFadeLoop() {
      if (fadeRaf === null) fadeRaf = requestAnimationFrame(fadeLoop);
    }

    function titleOf(row) { return row.querySelector('.track__title').textContent.trim(); }

    /* swap the track number for a small equaliser while it plays */
    var numbers = rows.map(function (r) { return r.querySelector('.track__n').textContent.trim(); });

    function paintRows() {
      rows.forEach(function (row, i) {
        var isCurrent = i === current;
        var isPlaying = isCurrent && !audio.paused;
        row.classList.toggle('is-current', isCurrent);
        row.classList.toggle('is-playing', isPlaying);
        var n = row.querySelector('.track__n');
        if (isPlaying) {
          if (!n.querySelector('span')) n.innerHTML = '<span></span><span></span><span></span>';
        } else if (n.textContent !== numbers[i]) {
          n.textContent = numbers[i];
        }
      });
      player.classList.toggle('is-playing', !audio.paused);
      playBtn.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
    }

    function load(i, autoplay) {
      if (i < 0 || i >= rows.length) return;
      var row = rows[i];
      var title = titleOf(row);
      current = i;
      pendingSeek = null;
      clip = clipOf(row);
      audio.volume = 1;              /* clear any fade left by the last track */

      audio.src = row.getAttribute('data-src');
      audio.preload = 'metadata';
      titleEl.textContent = title;
      if (artistEl) artistEl.textContent = row.getAttribute('data-artist') || 'Seven Stripes';
      labelEl.textContent = i === 0 ? 'Featured' : 'Now playing';
      var art = row.getAttribute('data-art');
      if (art) artEl.src = art;
      drawWave(title);
      progress(0, 0);
      /* if the excerpt is fully specified we already know its length */
      totalEl.textContent = clip.end !== null ? clock(clip.end - clip.start) : '--:--';

      if (autoplay) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () { paintRows(); });
      }
      paintRows();
    }

    function progress(ratio, secs) {
      var pct = Math.max(0, Math.min(1, ratio)) * 100;
      playedWf.style.setProperty('--p', pct.toFixed(2) + '%');
      nowEl.textContent = clock(secs);
      wave.setAttribute('aria-valuenow', Math.round(pct));
      wave.setAttribute('aria-valuetext', clock(secs));
    }

    function toggle() {
      if (current < 0) { load(0, true); return; }
      if (audio.paused) {
        /* if we're parked at the end of the excerpt, restart it rather than
           playing a fraction of a second and stopping again */
        if (audio.duration && audio.currentTime >= clipEnd() - 0.15) {
          audio.currentTime = clip.start;
          progress(0, 0);
        }
        var p = audio.play();
        if (p && p.catch) p.catch(function () { paintRows(); });
      } else {
        audio.pause();
      }
    }

    audio.addEventListener('loadedmetadata', function () {
      totalEl.textContent = clock(clipLength());
      /* jump to the head of the excerpt - can only be done once duration exists */
      if (pendingSeek !== null) {
        var t = clip.start + pendingSeek * clipLength();
        audio.currentTime = t;
        progress(pendingSeek, t - clip.start);
        pendingSeek = null;
      } else if (clip.start > 0 && audio.currentTime < clip.start) {
        audio.currentTime = clip.start;
        progress(0, 0);
      }
    });

    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      var len = clipLength();
      /* stop at the end of the excerpt rather than playing on into the track */
      if (clip.end !== null && audio.currentTime >= clip.end) { finish(); return; }
      applyFade();
      if (len > 0) progress((audio.currentTime - clip.start) / len, audio.currentTime - clip.start);
    });
    audio.addEventListener('play', function () { paintRows(); startFadeLoop(); });
    audio.addEventListener('pause', paintRows);
    /* Reached the end of the excerpt (or of the file) - move on. */
    function finish() {
      if (current < rows.length - 1) { load(current + 1, true); return; }
      audio.pause();
      if (clip.start > 0 && audio.duration) audio.currentTime = clip.start;
      audio.volume = 1;
      progress(0, 0);
      paintRows();
    }
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', function () {
      totalEl.textContent = '--:--';
      labelEl.textContent = 'Track unavailable';
      paintRows();
    });

    playBtn.addEventListener('click', toggle);

    rows.forEach(function (row, i) {
      row.querySelector('.track__hit').addEventListener('click', function (e) {
        e.preventDefault();          /* without JS this stays a link to the file */
        if (i === current) toggle();
        else load(i, true);
      });
    });

    /* ── scrubbing ── */
    function seekFromEvent(e) {
      var r = wave.getBoundingClientRect();
      var ratio = (e.clientX - r.left) / r.width;
      ratio = Math.max(0, Math.min(1, ratio));
      if (current < 0) load(0, false);
      if (audio.duration) {
        var len = clipLength();
        var target = clip.start + ratio * len;
        audio.currentTime = target;
        applyFade();     /* scrubbing into the tail must pick up the fade at once */
        /* display the target, not a read-back: the element applies the seek
           asynchronously and currentTime can still report the old position */
        progress(ratio, target - clip.start);
      } else {
        /* metadata has not arrived yet - hold the position and apply it below */
        pendingSeek = ratio;
        progress(ratio, ratio * (clip.end !== null ? clip.end - clip.start : 0));
      }
    }

    var scrubbing = false;
    wave.addEventListener('pointerdown', function (e) {
      scrubbing = true;
      wave.setPointerCapture(e.pointerId);
      seekFromEvent(e);
    });
    wave.addEventListener('pointermove', function (e) { if (scrubbing) seekFromEvent(e); });
    wave.addEventListener('pointerup', function (e) {
      scrubbing = false;
      if (wave.hasPointerCapture(e.pointerId)) wave.releasePointerCapture(e.pointerId);
    });
    wave.addEventListener('pointercancel', function () { scrubbing = false; });

    wave.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 15 : 5;
      if (!audio.duration) return;
      var len = clipLength(), lo = clip.start, hi = clipEnd(), target;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') target = Math.min(hi, audio.currentTime + step);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') target = Math.max(lo, audio.currentTime - step);
      else if (e.key === 'Home') target = lo;
      else if (e.key === 'End') target = hi;
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); return; }
      else return;

      e.preventDefault();
      audio.currentTime = target;
      applyFade();
      if (len > 0) progress((target - lo) / len, target - lo);
    });

    /* ── first paint, and durations once the chapter is in view ── */
    drawWave(titleOf(rows[0]));
    titleEl.textContent = titleOf(rows[0]);

    /* Held deliberately: a detached Audio with no reference can be collected
       before loadedmetadata fires, and the durations silently never arrive. */
    var probes = [];

    function fillDurations() {
      rows.forEach(function (row) {
        var cell = row.querySelector('.track__dur');

        /* An excerpt's length is known from its own start/end - and it must win
           over data-dur, which is the length of the whole file. */
        var c = clipOf(row);
        if (c.end !== null) { cell.textContent = clock(c.end - c.start); return; }

        /* A baked-in data-dur costs nothing. Only reach for the network when
           a row hasn't got one - e.g. a track added without updating it. */
        var known = row.getAttribute('data-dur');
        if (known) { cell.textContent = known; return; }

        var probe = new Audio();
        probes.push(probe);
        probe.preload = 'metadata';
        probe.addEventListener('loadedmetadata', function () {
          row.querySelector('.track__dur').textContent = clock(probe.duration);
        });
        probe.addEventListener('error', function () {
          row.querySelector('.track__dur').textContent = '--:--';
        });
        probe.src = row.getAttribute('data-src');
      });
    }

    /* Deliberately NOT gated on IntersectionObserver: browsers suspend IO in
       hidden/background tabs, which left the durations permanently blank.
       Idle time is late enough to stay out of the way of first paint. */
    if (window.requestIdleCallback) requestIdleCallback(fillDurations, { timeout: 3000 });
    else setTimeout(fillDurations, 1200);
  })();

  /* ── footer year ───────────────────────────────────────── */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
