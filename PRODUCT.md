# Product

## Register

product

## Users

The primary users are two adults planning and taking a seven-day Nagoya trip. They use the site mainly on an iPhone 15 in Safari and as an added-to-home-screen PWA. Before departure they frequently add places and revise plans; during the trip they need a fast answer to what is next, how to get there, whether it is still open, and how far away it is.

## Product Purpose

Turn one human-editable Markdown file into a reliable mobile trip companion. The product succeeds when itinerary edits appear on the site without duplicated data, today's schedule is immediately visible, locked bookings are never moved accidentally, and location, opening status, route distance, and travel time remain understandable under imperfect connectivity.

## Brand Personality

Calm, observant, practical. The voice is concise Traditional Chinese with Japanese place names preserved where helpful. It should feel like a well-kept personal travel notebook, not a generic booking portal.

## Anti-references

- Dense travel marketplaces covered in promotions, prices, and upsells.
- Decorative glass dashboards, neon navigation, or generic AI card grids.
- Desktop-first itinerary tables that require horizontal scrolling.
- Map-first interfaces that hide the next actionable step.
- Interfaces that silently replace confirmed times or disguise stale data as live data.

## Design Principles

1. Today first: the current Nagoya day and next action receive priority over the full archive.
2. One source of truth: every itinerary fact comes from `nagoya-trip.md` or a clearly generated derivative.
3. State is explicit: confirmed, reserved, candidate, stale, closed, and location unavailable are never communicated by color alone.
4. Thumb-friendly editing: primary actions remain reachable and familiar on an iPhone 15.
5. Honest uncertainty: unknown or unverified details stay visible as pending rather than being invented.

## Accessibility & Inclusion

Target WCAG 2.2 AA for contrast, focus visibility, semantic controls, and reduced-motion behavior. Touch targets should be at least 44 by 44 CSS pixels. Status must use text and iconography in addition to color. The itinerary must remain usable when location permission, JavaScript APIs, or network access are unavailable.
