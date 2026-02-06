# Design: blog-rebrand

> **Created**: 2026-02-06
> **Status**: Draft
> **Plan Reference**: [blog-rebrand.plan.md](../../01-plan/features/blog-rebrand.plan.md)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Baksuls Blog                             │
│              "Discover Korea, One Story at a Time"           │
├─────────────────────────────────────────────────────────────┤
│  Header                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Logo: Baksuls Blog]  [Culture][Food][Travel][Life][Lang]││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Main Content                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Post Cards / Category Pages / Individual Posts          ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Footer                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ © 2026 Baksuls Blog | Privacy | Contact                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Data Schema

### 2.1 Category Enum
```typescript
// src/content.config.ts
category: z.enum(['culture', 'food', 'travel', 'lifestyle', 'language'])
```

### 2.2 Category Metadata
```typescript
const categories = {
  culture: {
    name: 'Culture',
    description: 'Explore Korean traditions, customs, holidays, and the rich cultural heritage.',
    emoji: '🎎'
  },
  food: {
    name: 'Food',
    description: 'Discover Korean cuisine, recipes, restaurant guides, and food culture.',
    emoji: '🍜'
  },
  travel: {
    name: 'Travel',
    description: 'Plan your Korea trip with destination guides, tips, and itineraries.',
    emoji: '✈️'
  },
  lifestyle: {
    name: 'Lifestyle',
    description: 'Learn about daily life, trends, and experiences in modern Korea.',
    emoji: '🏙️'
  },
  language: {
    name: 'Language',
    description: 'Learn Korean phrases, tips, and resources for language learners.',
    emoji: '🗣️'
  }
};
```

---

## 3. Component Specifications

### 3.1 Header.astro
```
┌────────────────────────────────────────────────────────────┐
│ Baksuls Blog          Culture  Food  Travel  Life  Language│
└────────────────────────────────────────────────────────────┘
```

**Props**: `currentPath: string`

**Navigation Links**:
| Label | Path |
|-------|------|
| Home | / |
| Culture | /category/culture |
| Food | /category/food |
| Travel | /category/travel |
| Lifestyle | /category/lifestyle |
| Language | /category/language |

### 3.2 Footer.astro
```
┌────────────────────────────────────────────────────────────┐
│     © 2026 Baksuls Blog. All rights reserved.              │
│              Privacy Policy  ·  Contact                     │
└────────────────────────────────────────────────────────────┘
```

### 3.3 BaseLayout.astro
**Meta Updates**:
- Default description: "Discover Korea through authentic stories about culture, food, travel, and daily life."
- RSS title: "Baksuls Blog RSS"
- Language: `lang="en"`

---

## 4. Page Specifications

### 4.1 Homepage (index.astro)
- Hero text: "Baksuls Blog" with tagline
- Recent posts grid (all categories)
- Category quick links

### 4.2 Category Page ([category].astro)
- Category title and description
- Post count
- Post cards sorted by date (newest first)

### 4.3 Post Page ([category]/[id].astro)
- No changes to URL structure
- English content

### 4.4 Privacy Page (privacy.astro)
- English privacy policy
- Standard GDPR-compliant content

### 4.5 Contact Page (contact.astro)
- English contact information
- Simple contact form or email link

---

## 5. Design Tokens

### 5.1 Colors
```css
:root {
  /* Primary - Korean Red */
  --color-primary: #E53E3E;
  --color-primary-dark: #C53030;

  /* Secondary - Traditional Blue */
  --color-secondary: #2B6CB0;
  --color-secondary-dark: #2C5282;

  /* Accent - Nature Green */
  --color-accent: #38A169;

  /* Neutrals */
  --color-text: #1A202C;
  --color-text-muted: #718096;
  --color-background: #FFFFFF;
  --color-surface: #F7FAFC;
  --color-border: #E2E8F0;
}
```

### 5.2 Typography
```css
:root {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
  --font-size-3xl: 2rem;     /* 32px */
}
```

### 5.3 Spacing
```css
:root {
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-12: 3rem;    /* 48px */
}
```

---

## 6. Implementation Order

### Phase 1: Cleanup (Must do first)
1. Delete all files in `src/content/posts/`
2. Delete all files in `research/`

### Phase 2: Schema Update
3. Update `src/content.config.ts` with new category enum

### Phase 3: Component Updates
4. Update `src/components/Header.astro`
5. Update `src/components/Footer.astro`
6. Update `src/layouts/BaseLayout.astro`

### Phase 4: Page Updates
7. Update `src/pages/index.astro`
8. Update `src/pages/category/[category].astro`
9. Update `src/pages/privacy.astro`
10. Update `src/pages/contact.astro`

### Phase 5: Style Updates
11. Update `src/styles/global.css` with new design tokens

### Phase 6: Documentation
12. Update `CLAUDE.md` with new guidelines

---

## 7. File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/content/posts/*.md` | DELETE | Remove all 10 Korean posts |
| `research/*.md` | DELETE | Remove research files |
| `src/content.config.ts` | MODIFY | New category enum |
| `src/components/Header.astro` | MODIFY | New logo, 5 nav links |
| `src/components/Footer.astro` | MODIFY | English text |
| `src/layouts/BaseLayout.astro` | MODIFY | English meta, lang="en" |
| `src/pages/index.astro` | MODIFY | English homepage |
| `src/pages/category/[category].astro` | MODIFY | 5 new categories |
| `src/pages/privacy.astro` | MODIFY | English privacy policy |
| `src/pages/contact.astro` | MODIFY | English contact page |
| `src/styles/global.css` | MODIFY | New color variables |
| `CLAUDE.md` | MODIFY | English content guidelines |

---

*This document is a PDCA Design phase deliverable.*
