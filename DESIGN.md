---
name: AI Subtitle Generator
description: A professional upload-to-SRT workflow for teams that need fast, reliable subtitle generation.
colors:
  proofmark-red: "#d32f2f"
  proofmark-red-deep: "#b71c1c"
  proofmark-red-soft: "#ffcdd2"
  proofmark-red-wash: "#fffafb"
  proofmark-red-hover: "#ffebee"
  text-primary: "#333333"
  text-muted: "#666666"
  success-green: "#2e7d32"
  page-warm: "#f8f5f5"
  surface: "#ffffff"
  disabled-bg: "#c0a0a0"
  disabled-text: "#f0e0e0"
  footer-muted: "#bbbbbb"
typography:
  headline:
    fontFamily: "Inter, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 1.85rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  panel: "clamp(24px, 5vw, 40px)"
  dropzone: "clamp(32px, 6vw, 50px) 24px"
components:
  button-primary:
    backgroundColor: "{colors.proofmark-red}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "14px 28px"
    typography: "{typography.label}"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.proofmark-red-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "14px 28px"
  upload-zone:
    backgroundColor: "{colors.proofmark-red-wash}"
    textColor: "{colors.proofmark-red}"
    rounded: "{rounded.md}"
    padding: "{spacing.dropzone}"
  main-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.panel}"
---

# Design System: AI Subtitle Generator

## 1. Overview

**Creative North Star: "The Subtitle Control Room"**

This system should feel like a compact production station: quiet, precise, and ready for repeated use. The page is not a marketing spectacle. It is a focused workspace where a team member can upload media, understand the processing state, and leave with a correctly named SRT file.

The visual language is professional, reliable, and minimal. It uses a restrained warm surface, a single controlled red for action and emphasis, one sans-serif type family, and simple state changes. The interface should reject generic AI SaaS patterns, toy upload-tool styling, and flashy creator-app energy.

**Key Characteristics:**
- Single-task clarity: the upload flow is the center of the screen.
- Controlled emphasis: red appears where action, focus, or state needs attention.
- Calm reliability: spacing, shadows, and copy should reduce uncertainty.
- Repeatable operation: controls should feel familiar and dependable.

## 2. Colors

The palette is restrained and operational: warm neutrals carry the surface, Proofmark Red marks action and status, and semantic colors appear only when state requires them.

### Primary
- **Proofmark Red**: The primary action and emphasis color. Use it for the main call to action, upload affordances, focused borders, and error states where immediate attention is required.
- **Proofmark Deep Red**: The pressed or hover action state. Use it only when the user is actively engaging a red control.
- **Proofmark Soft Red**: The upload-zone border and low-risk red accent. It creates a visible target without making the screen feel alarmed.
- **Proofmark Wash**: The upload-zone background. It gives the file drop area a clear affordance while staying quiet.
- **Proofmark Hover Wash**: The upload-zone hover and dragover state. It should feel responsive, not decorative.

### Neutral
- **Warm Page Ground**: The page background. It keeps the interface from feeling sterile while remaining visually quiet.
- **Task Surface**: The central panel surface. It carries the actual workflow and must stay clean.
- **Primary Text**: The main text color for headings and essential labels.
- **Muted Text**: Secondary instructions, metadata, and passive status copy.
- **Footer Muted**: Low-priority footer text only.
- **Disabled Surface** and **Disabled Text**: Disabled button states. They should be visibly inactive without competing with the primary action.

### Named Rules

**The Proofmark Rule.** Red is a mark of action, focus, or state. It is not a decorative brand wash.

**The Quiet Neutral Rule.** Warm neutrals should carry most of the interface. If the page starts looking like an AI landing page, the palette is doing too much.

## 3. Typography

**Display Font:** Inter, with Segoe UI, system-ui, -apple-system, sans-serif fallbacks  
**Body Font:** Inter, with Segoe UI, system-ui, -apple-system, sans-serif fallbacks  
**Label/Mono Font:** None

**Character:** The typography is modern product sans: direct, compact, and familiar. It should support a utility workflow, not create a brand voice through novelty.

### Hierarchy
- **Headline** (700, clamp(1.5rem, 4vw, 1.85rem), tight line-height): The page title and only major headline.
- **Title** (600, 1rem, compact line-height): Upload labels and strong control text.
- **Body** (400, 0.95rem, 1.5): Short explanatory copy. Keep prose short, with a practical maximum of 65-75ch.
- **Label** (500, 0.875rem, 1.5): Status messages, secondary text, and compact control-adjacent copy.
- **Metadata** (400, 0.82rem): File size and low-priority details.

### Named Rules

**The Utility Type Rule.** Use one sans family and earn hierarchy through weight, size, and spacing. Do not introduce display fonts for labels, buttons, or status text.

## 4. Elevation

Elevation is minimal. The central task surface uses a soft ambient shadow to separate it from the warm page ground; smaller shadows appear only for responsive control states. Depth should reassure the user where the workflow lives, not decorate the page.

### Shadow Vocabulary
- **Small State Shadow** (`0 1px 3px rgba(0, 0, 0, 0.06)`): Subtle local lift for small surfaces if needed.
- **Panel Shadow** (`0 4px 20px rgba(0, 0, 0, 0.08)`): Mobile or reduced panel elevation.
- **Task Surface Shadow** (`0 8px 40px rgba(0, 0, 0, 0.10)`): The main container shadow.
- **Action Hover Shadow** (`0 4px 12px rgba(211, 47, 47, 0.3)`): Primary button hover feedback only.
- **Focus Ring** (`0 0 0 3px rgba(211, 47, 47, 0.25)`): Keyboard-visible focus on the upload zone.

### Named Rules

**The Minimal Lift Rule.** Shadows exist to identify the active workspace and confirm interaction. Never stack nested cards or add decorative glow.

## 5. Components

Components should feel direct and dependable: clear target areas, obvious states, familiar controls, and no invented interactions.

### Buttons
- **Shape:** Gently rounded rectangle (8px radius).
- **Primary:** Proofmark Red background with Task Surface text, full-width layout, and practical padding (14px 28px).
- **Hover / Focus:** Hover deepens to Proofmark Deep Red, lifts by 1px, and adds the Action Hover Shadow. Focus uses a visible 2px Proofmark Red outline with 2px offset.
- **Disabled:** Muted rose background and pale text. Disabled controls must not lift or shadow.
- **Loading:** Inline spinner appears before the label. The button remains the status anchor while processing.

### Cards / Containers
- **Corner Style:** Large rounded task surface (16px), reduced to medium rounding (12px) on small screens.
- **Background:** Task Surface on Warm Page Ground.
- **Shadow Strategy:** Use the Task Surface Shadow for the main workflow only.
- **Border:** No default panel border. Let whitespace and elevation define the workspace.
- **Internal Padding:** Responsive panel padding (`clamp(24px, 5vw, 40px)`).

### Inputs / Fields
- **Style:** The native file input is visually hidden. The upload zone is the visible input proxy.
- **Focus:** Keyboard focus must be visible on the upload zone with the red focus ring.
- **Error / Disabled:** Errors appear in the status region, not as alerts or modal interruptions.

### Upload Zone
- **Shape:** Medium rounded drop area (12px radius) with a dashed Proofmark Soft Red border.
- **Default:** Proofmark Wash background, centered upload icon, strong upload label, optional file metadata.
- **Hover / Focus:** Background shifts to Proofmark Hover Wash, border shifts to Proofmark Red, and the zone scales slightly.
- **Dragover:** Border deepens to Proofmark Deep Red and scale increases to confirm active drop targeting.
- **Selected File:** Border becomes solid Proofmark Red so the chosen file state is visible without relying on copy alone.

### Status Messages
- **Style:** Compact, centered, live-region copy below the button.
- **Info:** Muted Text for processing messages.
- **Success:** Success Green for completed downloads.
- **Error:** Proofmark Red for validation or processing failures.
- **Accessibility:** Status must remain screen-reader announced and must not rely on icon or color alone.

## 6. Do's and Don'ts

### Do:
- **Do** keep the upload-to-download workflow visually dominant.
- **Do** use Proofmark Red for primary action, focus, and state, not decoration.
- **Do** make loading, success, failure, file validation, and download states explicit.
- **Do** keep controls keyboard-friendly with visible focus states.
- **Do** use plain copy that tells the user what will happen, what is happening, and what to do next.

### Don't:
- **Don't** use generic AI SaaS patterns: vague gradient blobs, inflated claims, buzzword-heavy copy, or decorative "AI magic" visuals.
- **Don't** use toy upload-tool styling: cramped spacing, cheap-looking controls, unclear states, or hobby-project polish.
- **Don't** use flashy creator-app energy: loud colors, trend-driven visuals, excessive motion, or anything that makes the workflow feel less trustworthy.
- **Don't** add side-stripe borders, gradient text, decorative glassmorphism, or repeated identical card grids.
- **Don't** introduce modals for validation or processing feedback when inline status messaging can do the job.
