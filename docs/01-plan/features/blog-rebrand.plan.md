# Plan: blog-rebrand

> **Created**: 2026-02-06
> **Status**: Draft
> **Priority**: High

---

## 1. Overview

### 1.1 Goal
Rebrand the blog as "Baksuls Blog" - An English blog introducing Korean culture, lifestyle, and travel to international audiences.

### 1.2 Scope
- Blog name change: "Baksuls Blog"
- Target audience: Foreigners interested in Korea
- Primary language: English
- Remove all existing Korean posts
- New category structure for Korea-focused content
- Complete UI/UX redesign for international audience

---

## 2. Brand Identity

### 2.1 Blog Name
**Baksuls Blog** (baksuls.com)

### 2.2 Tagline Options
| Option | Meaning |
|--------|---------|
| "Discover Korea, One Story at a Time" | Story-driven exploration |
| "Your Window into Korean Life" | Authentic insights |
| "Korea Beyond the Headlines" | Deeper cultural content |

### 2.3 Brand Voice
- Friendly and approachable
- Informative but not academic
- Personal storytelling style
- Cultural bridge perspective

---

## 3. New Category Structure

### 3.1 Proposed Categories

| English | Description | Content Examples |
|---------|-------------|------------------|
| **culture** | Korean culture & traditions | Holidays, customs, etiquette, arts |
| **food** | Korean cuisine & dining | Recipes, restaurant guides, food culture |
| **travel** | Places to visit in Korea | Destinations, tips, itineraries |
| **lifestyle** | Daily life in Korea | Living tips, trends, experiences |
| **language** | Korean language tips | Phrases, learning resources, Konglish |

### 3.2 Category Mapping (URL)
```
/culture/{shortId}  - Korean Culture
/food/{shortId}     - Korean Food
/travel/{shortId}   - Travel Korea
/lifestyle/{shortId} - Korean Lifestyle
/language/{shortId} - Korean Language
```

---

## 4. Implementation Tasks

### 4.1 Content Cleanup
- [ ] Delete all existing Korean posts from `src/content/posts/`
- [ ] Update content schema for new categories
- [ ] Remove old research files

### 4.2 Branding Updates
- [ ] Update Header.astro - logo to "Baksuls Blog"
- [ ] Update Footer.astro - copyright text
- [ ] Update BaseLayout.astro - meta descriptions, RSS title
- [ ] Update all "블로그명" references to "Baksuls Blog"

### 4.3 Category Pages
- [ ] Update `[category].astro` with new categories
- [ ] Add English category names and descriptions
- [ ] Update navigation links in Header.astro

### 4.4 Homepage
- [ ] Update index.astro with new blog name
- [ ] Add English welcome text
- [ ] Update category display

### 4.5 Static Pages
- [ ] Update Privacy Policy (English)
- [ ] Update Contact page (English)

### 4.6 Configuration
- [ ] Update content.config.ts with new category enum
- [ ] Update CLAUDE.md with new category structure
- [ ] Update agent prompts for English content

---

## 5. Design Direction

### 5.1 Visual Style
- Clean, modern, minimalist
- Korea-inspired color accents
- High-quality imagery focus
- Mobile-first responsive design

### 5.2 Color Palette Proposal

```
Primary:    #E53E3E (Korean red - hanbok, flags)
Secondary:  #2B6CB0 (Calm blue - traditional)
Accent:     #38A169 (Nature green - mountains)
Text:       #1A202C (Dark charcoal)
Background: #FFFFFF (Clean white)
Muted:      #718096 (Gray for meta text)
```

### 5.3 Typography
- Headings: Inter or Poppins (modern, readable)
- Body: Inter (excellent readability)
- Clean hierarchy with proper spacing

---

## 6. Content Strategy

### 6.1 Initial Posts (10 minimum for AdSense)
| Category | Topic Ideas |
|----------|-------------|
| culture | Korean Lunar New Year (Seollal) traditions |
| culture | Understanding Korean age system |
| food | Beginner's guide to Korean BBQ |
| food | Korean convenience store food you must try |
| travel | Best neighborhoods to explore in Seoul |
| travel | Day trips from Seoul by train |
| lifestyle | Korean skincare routine basics |
| lifestyle | Understanding Korean workplace culture |
| language | Essential Korean phrases for tourists |
| language | Common mistakes foreigners make in Korean |

### 6.2 Content Guidelines
- Written in English
- 1,500+ words per post
- Natural, engaging tone
- Personal insights and tips
- SEO-optimized for international search

---

## 7. Technical Changes

### 7.1 Files to Modify

| File | Changes |
|------|---------|
| `src/components/Header.astro` | New logo, navigation |
| `src/components/Footer.astro` | English copyright |
| `src/layouts/BaseLayout.astro` | English meta, RSS title |
| `src/pages/index.astro` | English homepage |
| `src/pages/category/[category].astro` | New categories |
| `src/pages/privacy.astro` | English privacy policy |
| `src/pages/contact.astro` | English contact page |
| `src/content.config.ts` | New category enum |
| `CLAUDE.md` | Updated guidelines |

### 7.2 Files to Delete
- All files in `src/content/posts/*.md`
- All files in `research/*.md`

---

## 8. Success Criteria

- [ ] All UI text in English
- [ ] Blog name "Baksuls Blog" consistently applied
- [ ] 5 new categories working
- [ ] Minimum 10 English posts
- [ ] Mobile/desktop rendering correct
- [ ] Lighthouse performance 90+
- [ ] AdSense policy compliant

---

## 9. Timeline

| Phase | Tasks | Priority |
|-------|-------|----------|
| Phase 1 | Remove old content, update branding | Required |
| Phase 2 | Update categories and navigation | Required |
| Phase 3 | Create initial English posts (10+) | Required |
| Phase 4 | Design polish and optimization | Optional |

---

## 10. Decisions Confirmed

Based on user input:

1. **Blog Name**: Baksuls Blog ✓
2. **Concept**: Introducing Korea to foreigners ✓
3. **Language**: English (primary) ✓
4. **Flexibility**: Can include non-Korea content occasionally ✓
5. **Existing Posts**: To be removed ✓

---

*This document is a PDCA Plan phase deliverable.*
