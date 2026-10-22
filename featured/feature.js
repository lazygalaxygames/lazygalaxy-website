// FEATURED GAME — edit the text between the two backticks below.
// (It's a .js file only so the site also works when you open index.html straight from disk.)
window.LG_FEATURE = `
# ================================================================
#  FEATURED GAME — the spotlight right under the hero
# ================================================================
#  Two layouts:
#    layout: showcase  → cinematic: background video, trailer player,
#                        round-by-round clips, build stats, investor panel
#    layout: simple    → title, text and a screenshot slideshow
#                        (uses status, tagline, description, images,
#                         button, link, accent, next)
#
#  Format is   key: value   ·  lines starting with # are ignored.
#  Lines that repeat (beat, stat, moment, road, trailer) use  |  between parts.
#  Never type a backtick character in the text — it ends the block.
#  Media paths are relative to this "featured" folder.
#  Set  show: no  to hide the whole section.
# ================================================================

show: yes
layout: showcase
nav: Detonauts

kicker: Lazy Galaxy presents · New game
title: DETONAUTS
tagline: Hero tactics in three-minute bursts.
description: A 3v3 bomb-and-heroes shooter for phone and browser. Valorant-style rounds and heroes, played in Brawl Stars-sized matches.
status: Playable today · Closed playtests Nov–Dec 2026

# Silent looping video behind the title (a .jpg with the same name is used as its poster)
hero_video: detonauts/hero.mp4

# Trailers open in a player with sound:  file | button label | length
trailer: detonauts/trailer.mp4 | Watch the trailer | 1:31
trailer: detonauts/cinematic.mp4 | Bomb mode cinematic | 1:07

# One round, step by step:  clip | title | text
beats_title: Every round is a small story
beat: detonauts/beat-buy.mp4 | Buy | Spend round cash on guns, shields and grenades. Survive and you keep your gun.
beat: detonauts/beat-fight.mp4 | Fight | 3v3, top-down. You only see what your hero can see, and ultimates turn the fight.
beat: detonauts/beat-plant.mp4 | Plant | Attack site A or B and get the bomb down.
beat: detonauts/beat-defuse.mp4 | Defuse | Or stop it before it blows. First team to 5 rounds wins.

# The numbers (plain numbers count up when the fuse blows):  value | label
stats_title: Built and playable today
stat: 12 | heroes, each with an ability and an ultimate
stat: 11 | guns, plus 3 grenades
stat: 4 | game modes
stat: 8 | rank tiers, Copper to Legend
stat: 1 | month to build, by one developer
stat: Live | online 3v3 with friends

# Short looping moments:  clip | title | text
moment: detonauts/moment-heroes.mp4 | 12 heroes | Every hero has a role, a personality and a signature gun.
moment: detonauts/moment-ranks.mp4 | Climb the ranks | Ranked, Quick Play, Team Deathmatch and Free-for-all.
moment: detonauts/moment-friends.mp4 | Play with friends | Share a 4-letter room code and squad up.

# Investor panel
invest_title: Raising a pre-seed round
# Optional — shown big under the title, e.g.  invest_amount: $480K pre-seed · 18 months to global launch
invest_amount:
invest_text: Detonauts is playable today. We're looking for investors and a publishing partner to take it from a working build to a global launch.
invest_note: Cosmetics only. Never pay-to-win.
invest_button: Request the pitch deck
invest_message: Hi Krishna, I'd like to see the Detonauts pitch deck and play a round.

# Roadmap (the first line is highlighted as "now"):  when | title | text
road: Now · Oct 2026 | Playable | 12 heroes, 4 modes, online 3v3 with friends
road: Nov–Dec 2026 | Playtests | Closed tests, fixes, store pages
road: Q1 2027 | Content | Locker, Season 1 Pass, new maps, iOS and Android
road: Q2 2027 | Soft launch | 2–3 test markets
road: H2 2027 | Global launch | Worldwide release, live seasons, ranked events
`;
