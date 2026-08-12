# nital.me

Single-page personal site. Plain HTML, CSS and JavaScript - no build step, no dependencies,
no framework. Open `index.html` in a browser and it works.

```
index.html          all content lives here
css/styles.css      one stylesheet
js/main.js          reveals, chapter indicator, mobile index, nav hide-on-scroll
assets/             placeholder artwork - replace with the real thing
```

## Editing

All copy is in `index.html`, in reading order. Section landmarks:

| Anchor        | Section                                   |
| ------------- | ----------------------------------------- |
| `#top`        | Hero                                      |
| -             | Three fields: SOUND / PERCEPTION / IDEAS  |
| `#sound`      | Seven Stripes (dark chapter)               |
| `#perception` | Marketing & reputation                     |
| `#projects`   | TRKR, SPEQ, I Know a Guy, B-Synth          |
| `#lunchbox`   | Lunchbox Legion (the deliberate disruption)|
| `#about`      | About                                      |
| `#hello`      | Footer / contact                           |

Design tokens (colours, fonts, spacing) are all at the top of `css/styles.css` in `:root`.
Change them there and they propagate everywhere.

## Before this goes live

**Links still pointing at `#`** - search `index.html` for `href="#"`:

- [x] ~~Seven Stripes → Spotify~~ - done, verified real
- [x] ~~Seven Stripes → YouTube~~ - done, verified real
- [x] ~~SPEQ → its URL~~ - done, verified real (speq.co.il)
- [ ] I Know a Guy → its URL
- [ ] B-Synth → its URL
- [ ] Lunchbox Legion → its URL
- [x] ~~LinkedIn~~ - removed, not part of the site
- [x] ~~Email~~ - done, `nitalyosef@gmail.com`

TRKR already points to `https://trkr.fit`.

**Artwork** - everything in `assets/` is a placeholder I drew. Each `<img>` in `index.html`
has an `ASSET SLOT` comment above it. Keep the filenames and the files get picked up
automatically; if you switch format (`.svg` → `.jpg`), update the `src`.

- [x] ~~Photography~~ - done. `nital-studio.jpg` is the studio shot (About section) and
      `nital-portrait.jpg` is a 4:5 crop of the same frame for the hero. Both are rendered
      in warm monochrome via a CSS `filter`; delete the `grayscale(1) sepia(.16)` from
      `.hero__photo` and `.about__photo` to show them in colour.
- [ ] `cover-01..04.svg` - Seven Stripes cover artwork, still placeholder, square
- [x] ~~`trkr.jpg`, `speq.jpg`, `ikag.jpg`, `b-synth.jpg`~~ - done, real screenshots
- [x] ~~`card-1..3.jpg`~~ - done, real Lunchbox Legion card art

Both photos are rendered greyscale with `mix-blend-mode: multiply`, so they sit into the
paper rather than on top of it. Colour originals are fine - the CSS handles it.

**Music** - the player is real, self-hosted, and loaded with seven tracks. Files were renamed
to web-safe names (no spaces, brackets or apostrophes in URLs):

| # | Title | Credit | Length | File |
|---|-------|--------|--------|------|
| 01 | Silver Lining | Seven Stripes | 3:37 | `silver-lining.mp3` |
| 02 | Guess What | Seven Stripes | 5:50 | `guess-what.mp3` |
| 03 | Tidal Lock | Seven Stripes | 1:02 excerpt (0:49-1:51) | `tidal-lock.mp3` |
| 04 | Do I Wanna Know | Arctic Monkeys · Seven Stripes remix | 3:58 | `do-i-wanna-know-remix.mp3` |
| 05 | Cul De Sac | Selena Grey · produced by Seven Stripes | 3:20 | `cul-de-sac.mp3` |
| 06 | Summer Lovin’ | Selena Grey · produced by Seven Stripes | 2:25 | `summer-lovin.mp3` |
| 07 | Comin’ Soon | Selena Grey · produced by Seven Stripes | 0:39 | `comin-soon.mp3` (teaser) |

Track 01 is the one loaded as "Featured" - reorder the list to change that.

To add, remove or reorder tracks, edit the `<ol class="tracks">` list in `index.html`. Each
`<li>` carries:

- `data-src` - the audio file (the row's `href` should match it)
- `data-art` - the cover shown in the featured player
- `data-artist` - the credit line; omit it and it falls back to "Seven Stripes"
- `data-start` / `data-end` - play only an excerpt. Accepts `1:12` or plain seconds.
- `data-dur` - length of the whole file. Only used when there's no `data-end`. Setting it
  means the page makes **no network requests** just to read durations.

### Excerpts

Add `data-start` and `data-end` to a row and only that window plays:

```html
<li class="track" data-src="assets/audio/silver-lining.mp3"
    data-start="1:04" data-end="1:42" ...>
```

The waveform, the clock and the length in the list all become relative to the excerpt, so it
behaves exactly like a short track - 0:00 is the start of the excerpt, not of the file. When it
reaches the end it moves to the next track. Omit both attributes and the whole track plays.

This also cuts bandwidth: the browser uses a Range request to fetch only the part of the file
it needs, so an excerpt of a 5MB track doesn't pull 5MB.

**Currently only Tidal Lock is an excerpt** (0:49-1:51). Every other track plays in full.

Excerpts fade in and out; full tracks don't, since a finished track already ends the way it was
written. The three constants are at the top of the player in `js/main.js`:

```js
var FADE_OUT  = 1.4;   // seconds
var FADE_IN   = 0.4;   // set to 0 for a hard cut-in
var FADE_TAIL = 0.2;   // silence before the cut, so the fade always completes
```

`FADE_TAIL` is not cosmetic. The fade rides on `requestAnimationFrame` while the tab is
visible, but falls back to `timeupdate` (~4Hz) when it isn't - and at that rate the fade could
otherwise still be at ~17% volume when the excerpt cut, which is audible. Landing on silence
slightly early makes the cut clean either way.

Total audio is about 23MB. Nothing downloads until someone presses play, so that doesn't
affect page load - but it does affect your hosting bandwidth if the site gets traffic. If that
becomes a concern, export 60-90 second excerpts; the player behaves identically.

One honest caveat: the waveform is **generated from the track title**, not from the audio.
Every track gets its own consistent, recognisable shape, but it isn't a picture of your actual
waveform. Drawing real peaks means decoding each file in the browser with the Web Audio API,
which is a meaningful amount of extra download and code. Say the word if you want it.

**Content still to confirm**
- [ ] The three redacted client lines in `#perception` - the bar widths are set in CSS
      (`.redacted b`), so adjust them if the real phrasing needs different proportions.

## Deploying

Any static host works. It's a folder of files.

**Cloudflare Pages** - connect a Git repo, or drag the folder into the dashboard. Free,
fast, and you can attach `nital.me` under Custom Domains.

**Netlify** - drag the folder onto app.netlify.com/drop, then add the domain.

**GitHub Pages** - push the folder to a repo, enable Pages on the `main` branch, add
`nital.me` in the Pages settings and a `CNAME` file containing `nital.me`.

To preview locally with a real server rather than `file://` (the audio player needs this):

```bash
python devserver.py
```

That's `http.server` plus two things this site needs: caching switched off, so CSS and JS edits
show up on reload instead of silently doing nothing; and HTTP Range support, so the player can
seek into an MP3 without downloading the whole file first. Every real static host does Range
already. `devserver.py` is a local convenience only - don't deploy it.

## Notes on how it's built

- **Fonts** are Instrument Serif (display), Instrument Sans (body) and JetBrains Mono
  (labels), loaded from Google Fonts. To self-host, drop the files in `assets/fonts/`
  and swap the `<link>` for `@font-face` rules.
- **The nav** uses `mix-blend-mode: difference`, so it stays legible over the paper
  background and the near-black Seven Stripes chapter without any JavaScript. It hides
  on scroll-down and returns on scroll-up.
- **Project visuals** are `position: sticky` inside each band, which is why every band is
  `min-height: 100svh` - that height is what gives the visual room to hold while the
  description scrolls past. Shortening the bands removes the effect.
- **The drifting artwork strip** is a CSS marquee that translates `-50%`; it depends on the
  images being duplicated exactly twice. Add a fifth cover and you must add it in both halves.
- **Reveals** are IntersectionObserver-driven. Anything with `class="reveal"` fades up once.
  `data-delay="n"` staggers it by `n × 90ms`.
- **Reduced motion** is respected - all animation is disabled and everything renders in place.
- All body text clears WCAG AA (4.5:1) against its background.
