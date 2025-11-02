# Hardcoded Color Analysis

## Summary
This document lists all hardcoded colors found in the app and compares them with colors defined in `globals.css`.

---

## Hardcoded Colors Found

### 1. Hero Gradient Color (Matches globals.css)
- **`#12040f` / `#12040fff`** ✅ **MATCHES** `--color-hero-gradient: #12040f`
  - **Files:**
    - `app/page.tsx` (line 15): `bg-[#12040fff]`
    - `app/_components/pages/HomePage/index.tsx` (lines 44, 56, 91): `bg-[#0d030b]` ⚠️ **Similar but different** (should be `#12040f`)
    - `app/_components/pages/LandingPage/HeroSection.tsx` (lines 29, 41, 139): `#12040fff` and `rgba(18, 4, 15, ...)`
    - `app/_components/pages/LandingPage/index.tsx` (lines 19, 24): `bg-[#12040fff]` and `rgba(18, 4, 15, ...)`
    - `app/globals.css` (lines 157, 168, 212): Scrollbar styling

### 2. Dark Background Colors (NOT in globals.css)
- **`#0d030b`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/pages/HomePage/index.tsx` (lines 44, 56, 91): `bg-[#0d030b]`
  - **Note:** This is very similar to `#12040f` but slightly different. Should probably use `--color-hero-gradient` instead.

- **`#060010`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/ui/DomeGallery/DomeGallery.tsx` (line 149): `overlayBlurColor = '#060010'`
    - `app/_components/ui/MagicBento/MagicBento.tsx` (lines 34, 40, 46, 52, 58, 64, 546): Multiple instances
    - `app/_components/pages/LandingPage/DomeGalleryBackground.tsx` (line 111): `overlayBlurColor="#060010"`
  - **Note:** Used for overlay blur effects. Could be added to globals.css.

- **`#000000`** (black) ❌ **NOT in globals.css as hardcoded**
  - **Files:**
    - `app/_components/pages/LandingPage/DomeGalleryBackground.tsx` (line 25): `overlayColor = "#000000"`
  - **Note:** Could use `--background` from dark mode instead.

### 3. Gray Colors (NOT in globals.css)
- **`#374151`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/Card/ListCard.tsx` (line 73): `emptyBackgroundColor="#374151"`
    - `app/_components/Card/index.tsx` (line 49): `emptyBackgroundColor = "#374151"`
  - **Note:** Gray color for empty card backgrounds. Could use `--muted` or `--color-muted`.

### 4. Purple/Violet Colors (NOT in globals.css)
- **`#392e4e`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/ui/MagicBento/MagicBento.tsx` (line 545): `--border-color: #392e4e;`
  - **Note:** Used for border colors in MagicBento.

- **`rgba(132, 0, 255, ...)`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/ui/MagicBento/MagicBento.tsx` (lines 548, 549, 550): Purple primary, glow, and border colors

- **`rgba(46, 24, 78, ...)`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/ui/MagicBento/MagicBento.tsx` (lines 611, 627): Dark purple for shadows

### 5. Gradient Text Colors (NOT in globals.css)
- **`#f43f5e`, `#ef4444`, `#f97316`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/pages/LandingPage/HeroSection.tsx` (line 59): Rose/red/orange gradient

- **`#60a5fa`, `#a78bfa`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/pages/LandingPage/StatsSection.tsx` (line 20): Blue/purple gradient

- **`#a78bfa`, `#ec4899`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/pages/LandingPage/StatsSection.tsx` (line 26): Purple/pink gradient

- **`#ec4899`, `#f97316`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/pages/LandingPage/StatsSection.tsx` (line 32): Pink/orange gradient

- **`#ffaa40`, `#9c40ff`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/ui/TextAnimations/GradientText.tsx` (line 16): Orange/purple gradient (default)

### 6. White/Black with Opacity (NOT in globals.css)
- **`rgba(255, 255, 255, ...)`** ❌ **NOT in globals.css** (with various opacities)
  - **Files:**
    - `app/globals.css` (lines 157, 175, 185, 190, 219, 224): Scrollbar styling
    - `app/_components/Card/index.tsx` (line 70): `spotlightColor="rgba(255, 255, 255, 0.1)"`
    - `app/_components/ui/SpotlightCard/SpotlightCard.tsx` (line 18): `spotlightColor = 'rgba(255, 255, 255, 0.25)'`
    - `app/_components/pages/LandingPage/ContentTypesSection.tsx` (line 89): `spotlightColor="rgba(255, 255, 255, 0.1)"`
    - `app/_components/ui/DomeGallery/DomeGallery.tsx` (line 883): `rgba(235, 235, 235, 0)` (light gray)

- **`rgba(0, 0, 0, ...)`** ❌ **NOT in globals.css** (with various opacities)
  - **Files:**
    - Multiple files for drop shadows, overlays, etc.
  - **Note:** These are commonly used for shadows/overlays. Could potentially use CSS variables.

- **`#fff`** ❌ **NOT in globals.css as hardcoded**
  - **Files:**
    - `app/_components/ui/TextAnimations/FuzzyText.tsx` (line 19): `color = '#fff'`
    - `app/_components/ui/MagicBento/MagicBento.tsx` (line 597, 599): `#fff` in mask gradients

### 7. HSL Colors (NOT in globals.css)
- **`hsl(0, 0%, 100%)`** ❌ **NOT in globals.css**
  - **Files:**
    - `app/_components/ui/MagicBento/MagicBento.tsx` (line 547): `--white: hsl(0, 0%, 100%);`

---

## Colors in globals.css

### CSS Variables Defined:

#### Theme Colors (via @theme inline):
1. `--color-background` ✅ (mapped to `--background`)
2. `--color-foreground` ✅ (mapped to `--foreground`)
3. `--color-hero-gradient` ✅ **USED** (`#12040f`)
4. `--color-sidebar-ring` ⚠️ **UNUSED?** (check sidebar components)
5. `--color-sidebar-border` ⚠️ **UNUSED?** (check sidebar components)
6. `--color-sidebar-accent-foreground` ⚠️ **UNUSED?** (check sidebar components)
7. `--color-sidebar-accent` ⚠️ **UNUSED?** (check sidebar components)
8. `--color-sidebar-primary-foreground` ⚠️ **UNUSED?** (check sidebar components)
9. `--color-sidebar-primary` ⚠️ **UNUSED?** (check sidebar components)
10. `--color-sidebar-foreground` ⚠️ **UNUSED?** (check sidebar components)
11. `--color-sidebar` ⚠️ **UNUSED?** (check sidebar components)
12. `--color-chart-1` through `--color-chart-5` ⚠️ **UNUSED?** (check chart components)
13. `--color-ring` ✅ (used via Tailwind `outline-ring/50`)
14. `--color-input` ⚠️ **UNUSED?** (check form components)
15. `--color-border` ✅ (used via Tailwind `border-border`)
16. `--color-destructive` ⚠️ **UNUSED?** (check error/alert components)
17. `--color-accent-foreground` ⚠️ **UNUSED?**
18. `--color-accent` ⚠️ **UNUSED?**
19. `--color-muted-foreground` ⚠️ **UNUSED?**
20. `--color-muted` ⚠️ **UNUSED?**
21. `--color-secondary-foreground` ⚠️ **UNUSED?**
22. `--color-secondary` ⚠️ **UNUSED?**
23. `--color-primary-foreground` ⚠️ **UNUSED?**
24. `--color-primary` ⚠️ **UNUSED?**
25. `--color-popover-foreground` ⚠️ **UNUSED?**
26. `--color-popover` ⚠️ **UNUSED?**
27. `--color-card-foreground` ⚠️ **UNUSED?**
28. `--color-card` ⚠️ **UNUSED?**

#### Root Variables (:root):
- `--hero-gradient-rgb: 18 4 15` ✅ **USED** (in `bg-navbar-gradient`)
- `--background` ✅ **USED** (via Tailwind `bg-background`)
- `--foreground` ✅ **USED** (via Tailwind `text-foreground`)
- All other root variables (card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart, sidebar) - **Status varies**

---

## Recommendations

### 1. Replace hardcoded colors that match existing CSS variables:
   - Replace `#12040fff` / `#12040f` with `var(--color-hero-gradient)` or Tailwind class
   - Replace `#0d030b` with `--color-hero-gradient` (they're very similar)

### 2. Add missing colors to globals.css:
   - `#060010` → `--color-overlay-blur` or similar
   - `#374151` → Use existing `--color-muted` or add `--color-empty-card`
   - `#392e4e` → `--color-border-purple` or similar

### 3. Consider creating CSS variables for:
   - Gradient color sets (for GradientText component)
   - Spotlight/overlay colors
   - Shadow colors (though rgba(0,0,0,...) is standard)

### 4. Check for unused CSS variables:
   - Verify if sidebar, chart, popover colors are actually used
   - Consider removing unused variables to keep code clean

---

## Statistics

- **Total hardcoded hex colors found:** ~15 unique hex values
- **Total hardcoded rgba colors found:** ~10+ unique rgba values  
- **CSS variables defined:** 28+ color variables
- **CSS variables actively used:** ~5-10 (needs verification)
- **Hardcoded colors matching CSS variables:** 1 (`#12040f` / `#12040fff`)

