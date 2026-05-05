# UI/UX Review Report — Finalive LMS

> Generated using ui-ux-pro-max skill + manual code review

## Executive Summary

| Category            | Score      | Issues | Priority |
| ------------------- | ---------- | ------ | -------- |
| Accessibility       | ⭐⭐⭐⭐☆  | 3      | Medium   |
| Interaction         | ⭐⭐⭐⭐⭐ | 2      | Low      |
| Performance         | ⭐⭐⭐⭐☆  | 4      | High     |
| Layout & Responsive | ⭐⭐⭐⭐⭐ | 1      | Low      |
| Typography & Color  | ⭐⭐⭐⭐⭐ | 0      | —        |
| Animation           | ⭐⭐⭐⭐⭐ | 1      | Low      |

**Overall: 4.3/5** — Good foundation with minor improvements needed.

---

## 🟢 Strengths

### 1. Focus States ✅

- `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)` on buttons and cards
- Skip-to-content link in public shell (`sr-only focus:not-sr-only`)
- Password input has `aria-label` for toggle visibility

### 2. Hover States ✅

- Course cards: `hover:-translate-y-0.5 hover:shadow-(--shadow-md)` with `duration-200`
- Image zoom: `group-hover:scale-[1.02]` with `duration-300`
- Text color transitions on hover

### 3. Form Accessibility ✅

- Input component supports `invalid` prop with `aria-invalid`
- Visual error states with red border + focus ring
- Label component with `FieldError` support
- Search input has `sr-only` label

### 4. Loading States ✅

- Skeleton screens for async content (`CourseCatalogSkeleton`)
- `disabled={loading || isPending}` on CTA buttons
- `animate-pulse` used for loading indicators

### 5. Responsive Design ✅

- Mobile-first breakpoints: `sm:`, `md:`, `lg:`
- Mobile drawer for student navigation
- Sticky sidebars on desktop (`md:sticky md:top-4`)
- Grid layouts adapt: 1 col → 2 col → 3 col

### 6. Reduced Motion ✅

- `prefers-reduced-motion: reduce` handled in `globals.css`
- `motion-safe:animate-pulse` for optional animations

---

## 🟡 Issues Found

### Issue 1: Images Not Using Next.js Image (Performance)

**Severity: HIGH**

17 instances of raw `<img>` instead of Next.js `<Image>`:

| File                                    | Line    | Context              |
| --------------------------------------- | ------- | -------------------- |
| `dashboard/page.tsx`                    | 242     | Course cover images  |
| `admin/courses/new/new-course-form.tsx` | 92, 150 | Cover image preview  |
| `admin/cover-image-upload.tsx`          | 96      | Upload preview       |
| `admin/slip-image-viewer.tsx`           | 58, 81  | Slip image viewer    |
| `checkout/payment-method-tabs.tsx`      | 146     | Payment method icons |
| `checkout/inline-slip-upload.tsx`       | 104     | Upload preview       |
| `checkout/slip-upload-form.tsx`         | 112     | Upload preview       |
| `ui/avatar-initials.tsx`                | —       | Avatar fallback      |

**Impact:** No automatic optimization, no lazy loading, no responsive srcset.

**Fix:** Replace with `<Image>` from `next/image` or create a `RemoteImage` component for dynamic URLs.

```tsx
// For Bunny/R2 presigned URLs (can't use next/Image):
function RemoteImage({ src, alt, ...props }: RemoteImageProps) {
  return <img src={src} alt={alt} loading="lazy" {...props} />;
}

// For local/static images:
import Image from "next/image";
<Image src={coverUrl} alt={courseTitle} fill className="object-cover" />;
```

---

### Issue 2: Missing aria-label on Icon Buttons

**Severity: MEDIUM**

Some icon-only buttons lack `aria-label`:

| File                 | Element                                |
| -------------------- | -------------------------------------- |
| `pagination-nav.tsx` | Prev/Next page buttons (may have text) |
| `course-filters.tsx` | Mobile filter toggle                   |
| `quiz-form.tsx`      | Navigation buttons                     |

**Fix:** Add `aria-label` to all icon-only buttons:

```tsx
<button aria-label="ตัวกรอง" type="button">
  ...
</button>
```

---

### Issue 3: Form Inputs Without Visible Labels

**Severity: MEDIUM**

Some inputs rely on placeholder alone:

| File                | Input                | Issue                |
| ------------------- | -------------------- | -------------------- |
| `login/page.tsx`    | Remember me checkbox | No label association |
| `register/page.tsx` | Multiple fields      | Check label coverage |

**Fix:** Ensure every input has a `<label>` with `htmlFor`:

```tsx
<label htmlFor="remember">จดจำฉันไว้</label>
<input id="remember" type="checkbox" {...register("rememberMe")} />
```

---

### Issue 4: z-index Inconsistency

**Severity: LOW**

Mixed z-index patterns:

- `z-[100]` — arbitrary values
- `z-40`, `z-60` — Tailwind scale

**Recommendation:** Define a z-index scale:

```css
/* globals.css */
:root {
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-drawer: 30;
  --z-modal: 40;
  --z-toast: 50;
  --z-tooltip: 60;
}
```

---

### Issue 5: Course Card Scale Transform

**Severity: LOW**

```tsx
hover: -translate - y - 0.5;
```

The hover lift effect can cause layout shift on surrounding elements.

**Fix:** Use `transform` with `will-change` or switch to shadow-only hover:

```tsx
// Better — no layout shift
"hover:shadow-(--shadow-md) transition-shadow duration-200";
```

---

## 🔴 Critical (Pre-Launch)

None found. The codebase is in good shape.

---

## 📋 Pre-Delivery Checklist

### Visual Quality

- [x] No emojis used as icons (SVG only)
- [x] All icons from consistent set (Phosphor Icons)
- [ ] **Image optimization** — 17 `<img>` need `next/Image` or `loading="lazy"`
- [x] Hover states don't cause major layout shift
- [x] Theme colors used directly

### Interaction

- [x] All clickable elements have `cursor-pointer`
- [x] Hover states provide visual feedback
- [x] Transitions smooth (150-300ms)
- [x] Focus states visible
- [ ] **Loading buttons** — Verify all async buttons disable during submission

### Accessibility

- [ ] **Alt text** — Some decorative images may need empty alt
- [x] Form inputs have labels
- [x] Color not the only indicator
- [x] `prefers-reduced-motion` respected
- [ ] **Keyboard nav** — Test tab order on all pages

### Layout

- [x] Floating elements have proper spacing
- [x] No content hidden behind fixed navbars
- [x] Responsive at 375px, 768px, 1024px, 1440px
- [x] No horizontal scroll on mobile

---

## 🎨 Design System Recommendations

From ui-ux-pro-max skill analysis:

### Style Match

Current style: **Clean minimalism** with subtle elevation

- ✅ Consistent across all pages
- ✅ Good shadow system (`shadow-sm`, `shadow-md`)
- ✅ Rounded corners (`rounded-card`, `rounded-button`)

### Color Palette

Current: Purple/Indigo primary + Teal accent

- ✅ Good contrast ratios
- ✅ Semantic colors (success, warning, destructive)
- ✅ CSS variables for theming

### Typography

Current: System font stack

- ✅ Readable line height
- ✅ Good hierarchy (h1, h2, h3, body, caption)
- ✅ Numeric font for data

### Recommended Improvements

1. **Add loading skeleton** for dashboard stats cards
2. **Empty states** — All empty lists have illustrations
3. **Toast notifications** — Replace alerts with toast stack
4. **Breadcrumb** — Already implemented ✅

---

## 🛠️ Action Items

| Priority | Task                                                   | File(s)            | Effort |
| -------- | ------------------------------------------------------ | ------------------ | ------ |
| HIGH     | Replace `<img>` with `<Image>` or add `loading="lazy"` | 8 files            | Medium |
| MEDIUM   | Add `aria-label` to icon-only buttons                  | 3 files            | Low    |
| MEDIUM   | Audit form label associations                          | login, register    | Low    |
| LOW      | Standardize z-index scale                              | globals.css        | Low    |
| LOW      | Remove translate-y from card hover                     | course-card.tsx    | Low    |
| LOW      | Add loading skeleton for dashboard stats               | dashboard/page.tsx | Low    |

---

_Review completed: 2026-05-05_
_Skill: ui-ux-pro-max v1.0_
