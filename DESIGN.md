---
name: Nexus Minimalist Design System
description: A clean, editorial, dark-mode first design system for the Nexus productivity suite.
colors:
  primary: "#00c29d"          # Premium Teal accent
  secondary: "#008e9b"        # Deep ocean teal
  tertiary: "#0f766e"         # Dark emerald
  neutral-bg: "#09090b"       # Zinc-950 primary background
  neutral-card: "#121215"     # Zinc-900 card background
  neutral-border: "#1f1f23"   # Zinc-800 subtle borders
  neutral-text: "#ffffff"     # Pure white for main text
  neutral-muted: "#a0a0a0"    # Muted text
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "10px"
  2xl: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#09090b"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.neutral-border}"
---

# Nexus Design System

## Overview
A minimalist, high-precision visual redesign for Nexus. It replaces the typical neon AI purple-teal gradients with a refined slate and monochrome layout featuring a single premium Teal/Cyan accent. The system is designed to look human-crafted, professional, and content-first.

## Colors
- **Accent Teal (#00c29d):** Used selectively for primary actions, checkmarks, active states, and highlights.
- **Deep Cyan (#008e9b):** Supporting shade for active buttons and smooth transitions.
- **Neutral Dark (#09090b / #121215):** Slate-inspired zinc bases providing high-contrast dark-mode backgrounds.
- **Borders (#1f1f23):** Very thin, subtle dividers to keep layouts clean without creating visual noise.

## Shapes & Corner Radii
- All corner radii are scaled down to be tighter and crisper (ranging from `4px` to `12px`).
- No bubbly, overly rounded shapes. The UI is sharp and structurally structured.

## Do's and Don'ts
- **Do:** Use solid primary accents instead of neon linear gradients.
- **Do:** Keep buttons single-lined, and use active micro-scales (`scale-[0.98]`) for tactile feedback.
- **Don't:** Add colorful shadows or glow effects on hovered cards.
- **Don't:** Mix warm beige/amber tones with cool slate/teal colors in the same view.
