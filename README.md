# Lazy Galaxy website

Static site — no build step. Netlify serves this folder as-is.

```
index.html            page structure
css/style.css         all styling
js/galaxy.js          full-page interactive galaxy background + cursor
js/games.js           THE GAME LIST  ← edit to add/remove games
js/main.js            page logic (game river, picks, featured loader, contact form)
js/showcase.js        cinematic featured layout (videos, trailer player, fuse, investor panel)
js/game.js            Galaxy Defense — the clicker game layered over the site
games/<slug>/         shot.webp (portrait screenshot) + icon.webp per game
featured/             THE FEATURED GAME  ← edit feature.js + drop images here
```

## Feature a game
`featured/feature.js` has two layouts:

- `layout: showcase` — cinematic (currently Detonauts): a silent looping `hero_video`, `trailer:` lines that open
  a player with sound, `beat:` clips for each step of a round, `stat:` numbers that count up when the fuse blows,
  `moment:` clips, and an investor panel with `road:` roadmap lines. Media lives in `featured/detonauts/`.
  Every video needs a `.jpg` with the same name next to it (used as its still frame).
- `layout: simple` — title, text and a screenshot slideshow (`images:` line).

Making clips from a long recording (needs ffmpeg):
```
ffmpeg -ss 39 -to 47 -i video.mp4 -an -vf "scale=960:-2,fps=30" -c:v libx264 -crf 27 -pix_fmt yuv420p -movflags +faststart clip.mp4
ffmpeg -ss 0.3 -i clip.mp4 -frames:v 1 -q:v 4 clip.jpg
```
To hide the section, set `show: no`.

## Add a game
1. Make a folder `games/<slug>/` with `shot.webp` and `icon.webp` (png/jpg is fine too, just set
   `shot:` / `icon:` paths in the entry).
2. Add a line to `js/games.js`.

## Preview locally
Just double-click `index.html` — everything works straight from disk.

## Galaxy Defense (the clicker game)
Aliens and asteroids float over the site. Click them for coins, clear 8 aliens per wave,
a boss every 10 waves (30s timer). Coins buy research in the constellation lab (button in the
game bar, or press R). Big Bang (unlocks at wave 20) resets for permanent Stardust.
The game starts closed on every visit — visitors press "Play Galaxy Defense" at the top to start it and
"Close game" to put it away. Progress (coins, waves, research) saves in the visitor's browser.

Console helpers for testing: `LG_GAME.give(1e6)`, `LG_GAME.wave(19)`, `LG_GAME.reset()`.
Balance numbers live at the top of `js/game.js` (RES costs, hpFor, coinFor).

## Easter eggs
Click = supernova · hold = black hole (absorbs stars, release to explode) ·
type `lazy` or the Konami code = hyperdrive.
