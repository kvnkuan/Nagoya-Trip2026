# Interaction Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add noticeable, accessible interaction transitions to itinerary expansion, touch actions, location feedback, and updated content.

**Architecture:** Keep native `details` elements and add a small event-binding layer in `src/app.js` that applies short-lived CSS state classes only after trusted user interactions. Centralize durations and easing in CSS custom properties, animate compositor-safe properties, and retain the global reduced-motion override.

**Tech Stack:** Vanilla JavaScript ES modules, CSS, native `<details>`, Node.js test runner, static PWA build.

---

### Task 1: Add interaction hooks and stable location markup

**Files:**
- Modify: `test/pwa.test.js`
- Modify: `test/render.test.js`
- Modify: `src/render.js`
- Modify: `src/app.js`

- [ ] **Step 1: Write the failing rendering test**

Add assertions that the location button includes `.button-icon` and `.button-label`, and that live distance chips include a motion hook class.

- [ ] **Step 2: Write the failing runtime test**

Assert that `src/app.js` exports or contains `bindInteractionMotion`, binds the native `toggle` event, uses `is-opening`, and updates `.button-label` rather than replacing the whole button.

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `node --test test/render.test.js test/pwa.test.js`

Expected: FAIL because `.button-label`, `bindInteractionMotion`, and `is-opening` do not exist.

- [ ] **Step 4: Implement minimal interaction binding**

Update the location button renderer to preserve icon and label spans. In `src/app.js`, add a label helper and bind day `toggle` events; when a closed day becomes open through a trusted event, add `is-opening`, then remove it on animation end or a short fallback timeout.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/render.test.js test/pwa.test.js`

Expected: all focused tests pass.

### Task 2: Add the visual motion system

**Files:**
- Modify: `test/pwa.test.js`
- Modify: `public/styles.css`

- [ ] **Step 1: Write the failing CSS contract tests**

Assert that CSS defines `--motion-fast`, `--motion-standard`, `--ease-out-expo`, an `itinerary-reveal` keyframe, press feedback using `scale(.96)`, a busy location animation, a single update-emphasis animation, and the existing reduced-motion media query.

- [ ] **Step 2: Run the CSS test and verify RED**

Run: `node --test test/pwa.test.js`

Expected: FAIL because the new motion tokens and keyframes do not exist.

- [ ] **Step 3: Implement the CSS motion system**

Add shared duration/easing variables; transition day border, shadow, chevron color, and touch action transforms; animate `.day.is-opening` content upward with opacity; animate busy location feedback and one-time update emphasis; keep all motion inside the existing reduced-motion safeguard.

- [ ] **Step 4: Run the CSS test and verify GREEN**

Run: `node --test test/pwa.test.js`

Expected: all PWA tests pass.

### Task 3: Verify, build, inspect, and publish

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Increment the service-worker cache**

Update the cache name from `nagoya-trip-v5` to `nagoya-trip-v6` so installed PWAs retrieve the new interaction assets.

- [ ] **Step 3: Build the production site**

Run: `npm run build`

Expected: build succeeds and `dist/` contains the updated app, CSS, and service worker.

- [ ] **Step 4: Inspect at iPhone 15 dimensions**

Serve `dist/`, open at 393×852, expand a collapsed day, press the location button, and verify visible but brief transitions with no clipped content or shifted controls.

- [ ] **Step 5: Re-run tests after final changes**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 6: Commit and publish**

Commit the branch, push it, merge it into `main`, push `main`, deploy `dist/` to the linked Netlify site, and confirm the public URL serves the new cache version.
