---
workflow: general-video
flow: automation
storyboard: no
message: "NyQuil Severe is straight back and left, on the top shelf of Bay 3"
aspect: 1080x1920
destination: kiosk
length: 22s
angle: wayfinding
---

## Intent

The wayfinding screen for the Beacon Box in-store kiosk — the "Find" half of the product's
`Ask. Find. Pick.` promise, which the app currently has no screen for.

A shopper standing at the kiosk sees a full-frame top-down plan of the store with an
animated route from where they are standing to Aisle 7. The route plays twice. Then the map
shrinks into a band at the bottom of the panel and a first-person shelf-level view fades in
above it, showing the product on the top shelf of Bay 3. From there the split screen loops
indefinitely.

Calm and instructional, not promotional. A shopper reads it in passing from several feet
away, so the aisle number is the largest thing on screen and nothing depends on reading
small type.

## Customizations

- Delivered as **two MP4s**, not one: an intro that plays once (the full-frame phase plus
  the transition) and a seamless loop (the split screen). The kiosk plays the first, then
  loops the second forever.
- Authored as a **single 22s composition** and split by exact frame count at t=12.0 —
  frames 0-359 become the intro, frames 360-659 the loop. One continuous timeline is what
  makes the loop seam structural rather than hand-matched.
- Loop-out state at t=22.0 must equal loop-in state at t=12.0.

## Notes

- **Silent.** No music, no SFX. The panel runs this all day; a wayfinding loop should not
  make noise, and kiosk video autoplays muted regardless.
- Light ground (#F7F8FA) to sit with the kiosk app's light theme rather than fight it.
  CVS red #CC0000 for the route, target pin and ring.
- **No CVS wordmark inside the render.** The video stays product-led so it remains
  tenant-agnostic; brand identity belongs to the React chrome, where `lib/tenants.ts`
  already owns it. The repo treats its CVS treatment as an unlicensed placeholder and
  commits no logo assets — keep it that way.
- Aisle 7 / Bay 3 / top shelf is demo data baked into the pixels. A real result map would
  take it as props.
- Target: both files under ~12 MB combined, to stay in line with the existing kiosk assets.
