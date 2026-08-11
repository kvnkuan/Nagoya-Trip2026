# Nagoya Trip Interaction Motion Design

## Outcome

Add a noticeable, coherent interaction motion system to the iPhone-first trip app without delaying itinerary lookup or making long days visually noisy.

## Motion language

- Motion is responsive and directional: user actions produce immediate press feedback, then the affected content reveals upward into place.
- Durations stay between 120ms and 240ms. The app uses an exponential ease-out curve and avoids bounce or elastic effects.
- Only `transform`, `opacity`, color, border, and shadow are transitioned. Day height is not animated because it causes reflow and is less reliable in iPhone Safari.
- Initial page rendering remains still. Day reveal animation is added only after a trusted user interaction.

## Interactions

### Day cards

- Tapping a collapsed day rotates the chevron and changes the card border/shadow.
- The day tools and timeline fade in while moving from 8px below their final position.
- A short-lived `is-opening` class scopes the reveal and is removed after animation completion.
- Closing remains immediate at the content level while the chevron and card styling transition back.

### Buttons and links

- The location button, whole-day route action, and stop-level Google Maps links scale to 96% while pressed.
- Release uses a 180ms ease-out transition.
- Keyboard focus remains expressed through the existing high-contrast focus ring.

### Location state

- While geolocation is pending, the crosshair icon rotates and the button soft-pulses.
- The button keeps a stable icon-and-label structure so state text changes do not remove the icon.
- After location success, the re-rendered distance chips briefly fade and rise into view.
- Failure text changes without looping animation.

### Update emphasis

- The latest-update badge and updated timeline marker receive one brief glow pulse after initial rendering.
- The pulse does not repeat and does not flash sharply.

## Accessibility and performance

- `prefers-reduced-motion: reduce` collapses animation and transition durations to effectively zero and disables smooth scrolling.
- No interaction depends on motion to communicate state.
- Animations use compositor-friendly properties where movement is involved.
- Touch targets and semantic native `details` behavior remain unchanged.

## Verification

- Automated tests verify interaction hooks, motion-safe CSS, reduced-motion handling, and stable location button markup.
- Build output is checked for the updated source files.
- The built app is inspected at iPhone 15 dimensions for day toggles, press states, and geolocation busy feedback.
