---
name: mobile-ux-ui-design
description: React Native + Expo mobile UI/UX design intelligence for premium design rules, anti-AI-slop patterns, navigation, motion, and wireframe-to-code work. Use for mobile screen design, UI refactors, wireframes, navigation decisions, motion specs, or UI review.
---

# mobile-ux-ui-design

Use this skill whenever the work changes something the user sees, feels, touches, or interacts with in the mobile app.

This Codex-native entry skill reuses the source reference library under `.claude/skills/mobile-ux-ui-design/references/` instead of duplicating it.

## When To Apply

**Must use**

- new screen design
- UI component creation or refactoring
- wireframe to code conversion
- color, typography, or layout decisions
- UI review
- navigation or animation implementation

**Recommended**

- when the UI feels generic or not production-ready
- when cross-platform mobile design needs alignment
- when building or tightening a mobile design system

**Skip**

- pure backend work
- API or DB design
- infra or DevOps work

## Design Thinking

Before implementation, decide an intentional visual direction:

- **Purpose**: what user problem does the interface solve?
- **Tone**: choose a strong direction such as minimal, maximal, retro-futuristic, editorial, brutalist, luxury, or playful.
- **Constraints**: performance, accessibility, and platform expectations.
- **Differentiation**: what one choice makes the experience memorable?

## Baseline Configuration

Use these dials as defaults unless product context suggests otherwise:

| Dial | Default | Range |
| --- | --- | --- |
| `DESIGN_VARIANCE` | `7` | `1` = perfect symmetry, `10` = controlled chaos |
| `MOTION_INTENSITY` | `5` | `1` = static, `10` = cinematic |
| `VISUAL_DENSITY` | `4` | `1` = gallery-like, `10` = cockpit-like |

Mobile override: even at higher density, screens under 375pt should fall back to a single-column layout.

## Rule Categories

Read the relevant reference files from `.claude/skills/mobile-ux-ui-design/references/` as needed:

| Priority | Category | Reference |
| --- | --- | --- |
| Critical | Accessibility | `accessibility.md` |
| Critical | Touch and Interaction | `touch-interaction.md` |
| High | Performance | `performance.md` |
| High | Typography | `typography.md` |
| High | Color System | `color-system.md` |
| High | Layout and Spacing | `layout-spacing.md` |
| High | Navigation | `navigation.md` |
| Medium | Motion and Animation | `motion-animation.md` |
| Medium | States and Feedback | `states-feedback.md` |
| Medium | Icons and Visuals | `icons-visuals.md` |
| High | Anti-Patterns | `anti-patterns.md` |
| Low | Creative Patterns | `creative-patterns.md` |

## Workflow

1. Analyze the request for product type, audience, usage context, style keywords, and interaction model.
2. Always read `.claude/skills/mobile-ux-ui-design/references/anti-patterns.md` before generating UI directions.
3. Read the task-specific references that match the work:
   - layout work: `layout-spacing.md`
   - navigation work: `navigation.md`
   - forms or states: `states-feedback.md`
   - lists, images, or animation-heavy screens: `performance.md`
   - motion work: `motion-animation.md`
   - accessibility review: `accessibility.md`
4. Apply the relevant rules while designing or reviewing.
5. Before finalizing, run through `.claude/skills/mobile-ux-ui-design/references/pre-delivery-checklist.md`.

## Quick Reference

### Accessibility

- keep body text at 4.5:1 contrast or higher
- give all interactive elements `accessibilityLabel` and `accessibilityRole`
- respect reduced motion settings
- do not communicate meaning by color alone

### Touch

- minimum 44x44pt on iOS or 48x48dp on Android
- show visual press feedback within 80-150ms
- do not block system gestures such as iOS swipe-back

### Typography

- default body text to `16/24`
- avoid tiny body copy under 16px
- avoid default AI font choices when the design system permits stronger typography
- keep a deliberate type scale

### Color

- limit accent colors
- prefer semantic tokens over hard-coded values
- validate contrast in both light and dark themes

### Motion

- animate `transform` and `opacity`, not layout properties
- keep micro-interactions around 150-300ms
- prefer spring-based motion over flat linear easing

### States

- design loading, empty, error, and success states for data-driven screens
- show skeletons or progress feedback for longer waits
- include cause, recovery, and retry paths in error states

### Anti-Patterns

- avoid purple-gradient defaults
- avoid repetitive equal-width card grids without a content reason
- avoid center-aligning everything
- avoid emoji as structural icons

## Integration With Other Skills

| Skill | How It Uses This Skill |
| --- | --- |
| `design-wireframes` | applies these rules while defining mobile wireframes |
| `design-architecture` | carries design tokens and theme concerns into structure decisions |
| `implement-feature` | uses the checklist to validate mobile UI quality during implementation |
| `deploy` | can reuse the pre-delivery checklist before release work |
