# pvpgame

Independent PvE testing fork of PVP Arena, copied from commit `52a6c20`.
The original PvP project and its live server are not modified by this fork.

Play: https://videogametips.github.io/pvpgame/

## Included

Underworld story campaign, Backrooms Levels 0-9, zombie survival, base raid,
training range, aim trainer, obby, wave mode, maps, weapons, skins and ragdolls.
Arena matches are single-player bot matches; no human multiplayer exists here.

All equipment is unlocked for local testing, including admin tools. This is a
sandbox, not the live economy. Saves use the separate `pvpgame-test:` browser
storage namespace. No real account login, passwords, payments, cloud saves,
matchmaking, live chat or external AI chat are used. NPC story dialogue remains.

## Run Locally

Requires Node.js, with no npm dependencies:

```sh
npm start
```

Open http://localhost:4179/. Choose a nickname and PLAY SOLO. Do not enter a
real password. The hub and mode menu lead to the single-player experiences.
`PORT=4180 npm start` selects another port. `npm run check` checks syntax,
static assets, and the absence of application network transports.

## GitHub Pages

Publish the `main` branch at `/` in Settings > Pages. Every game asset is
relative, so repository subpath hosting works without a Node server.
The local event adapter in `offline-runtime.js` keeps shared gameplay hooks
but never opens a socket or sends an HTTP request. Loading static assets and
the bundled physics module is the only required network activity.

The copied code contains historical multiplayer helper definitions; they are
not reachable matchmaking services. Bot combat continues to use the original
client-side damage simulation instead of an external server.

## Map Craft

`map-craft.js` adds authored side districts and irregular footprints to eighteen
arena maps. The original combat centres, spawn locations, lobby, Blank and
special-purpose courses are retained. Physical floors, ragdolls and bot routes
share the footprint's rectangle union; the surrounding bounding box alone is
not treated as walkable ground. Edge walls follow the actual perimeter.

Shared architectural stairs use compact runs while retaining their width,
upper connection and landing height, with risers no higher than 0.19 metres,
tread nosings, side stringers and handrails. Ladders have a thin solid collision
surface; jumping off a ladder pushes away rather than through it.
Decorative fixtures and trim are batched and do not add tiny movement
colliders. Natural districts use faceted stone and soil patches; built-up
districts get paving joints, storage-unit hardware and wall/roof detailing.

## Credits

Original PVP Arena by VideoGameTips. Three.js is bundled under its MIT license.
Cannon-es 0.20.0 and its MIT license are in `vendor/`. Backrooms level references
and CC BY-SA attribution are preserved in the in-game Backrooms credits.
