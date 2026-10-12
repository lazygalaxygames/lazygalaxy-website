# Lazy Galaxy website

Static site — no build step. Netlify serves this folder as-is.

```
index.html            page structure
css/style.css         all styling
js/galaxy.js          full-page interactive galaxy background + cursor
js/games.js           THE GAME LIST  ← edit to add/remove games
js/main.js            page logic (game river, picks, featured loader, contact form)
js/game.js            Galaxy Defense — the clicker game layered over the site
games/<slug>/         shot.webp (portrait screenshot) + icon.webp per game
featured/             THE FEATURED GAME  ← edit feature.js + drop images here
```

## Feature a game
1. Copy screenshots (portrait, e.g. `1.png`, `2.png`, `3.png`) and an optional `icon.png` into `featured/`.
2. Open `featured/feature.js`, change the title/text between the backticks, and list the images on the `images:` line.
3. Once the game is live, put its Play Store URL on the `link:` line and change `status:`.
4. To hide the section, set `show: no`.

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
Progress saves in the visitor's browser. Visitors can hide the game with the ✕ in the game bar.

Console helpers for testing: `LG_GAME.give(1e6)`, `LG_GAME.wave(19)`, `LG_GAME.reset()`.
Balance numbers live at the top of `js/game.js` (RES costs, hpFor, coinFor).

## Easter eggs
Click = supernova · hold = black hole (absorbs stars, release to explode) ·
type `lazy` or the Konami code = hyperdrive.
