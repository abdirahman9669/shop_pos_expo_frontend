# Interaction & Content Rules

This document defines how interactive elements behave across the app. It’s the “single source of truth” the component library and screens must follow.

## Buttons
- **Hierarchy:** One **primary** per screen/flow. Others are secondary or ghost.
- **States:** loading (spinner, width locked), disabled (`opacity: states.disabled`), pressed (overlay `states.pressed`, 80–120ms).
- **Tap-target:** ≥ 44×44 pt. If visual is smaller, add `hitSlop: 8–10`.
- **Placement:** Primary anchored at the bottom of long forms; otherwise inline or header-right (global actions).

## Forms
- Field anatomy: **Label** (always visible) → **Control** → **Helper/Error**.
- Required: “*” on label. Optional: “(optional)”.
- Validate **on blur**; masks (money/phone) **on change**; always re-validate **on submit**.
- Keyboard: amounts `decimal-pad` (right-aligned), integers `number-pad`, email `email-address`, phone `phone-pad`.
- Navigation between fields: returnKeyType = “next”, last = “done”.

## Lists
- Row anatomy: Leading (optional) • Title • Subtitle • Trailing meta (right-aligned).
- Use **either** swipe actions **or** overflow menu per list.
- Use `FlatList/SectionList` for virtualization. **Do not** nest VirtualizedList inside `ScrollView`.

## Navigation
- Header title uses tokenized text style; back is non-destructive.
- Modals slide up; use `colors.overlay` for scrim.
- POS flow: Add items → Adjust → Take payment → Receipt. Holding/resuming is explicit.

## Empty & Error States
- Empty: short title + one-line help + **one** primary action.
- Field errors inline; global/API errors via toast or inline panel with “Retry”.

## Motion
- Durations: 100/200/300ms. No bouncy curves in financial flows.
- Never block input after navigation transition completes.

## Accessibility
- All touchables have `accessibilityRole`.
- Meet WCAG AA contrast; never rely on color alone.
- Currency/number display is locale-aware; inputs are raw while typing.

## Layout
- Spacing follows `space` tokens; containers follow `layout` tokens.
- Min tap size: `layout.minTapSize`.

---

## Definition of Done (per screen)
- [ ] At most **one** primary button; all states wired.
- [ ] Inputs labeled with helper/error; correct keyboards; “Next/Done” works.
- [ ] No nested VirtualizedList inside ScrollView.
- [ ] Empty/error states use shared components.
- [ ] A11y roles present; AA contrast.
- [ ] Dark mode verified; tokens only (no hardcoded colors).
- [ ] Copy uses action verbs (“Save”, “Add product”, “Void sale”).
