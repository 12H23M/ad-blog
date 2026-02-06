# Plan: AdSense Ready - Contact Update & 10 Blog Posts

> **Feature**: adsense-ready
> **Created**: 2026-02-06
> **Status**: Draft

---

## 1. Overview

Prepare the Baksuls Blog for Google AdSense approval by:
1. Updating the contact email to `elfguy81@gmail.com`
2. Fixing critical bugs in PostLayout.astro and rss.xml.ts (Korean remnants, wrong categories)
3. Writing 10 high-quality English blog posts about Korea (1,500+ words each)

---

## 2. Current State Analysis

### What's Working
- Site structure complete (Home, Contact, Privacy, Category pages)
- Content Collections schema correctly defines 5 categories
- Sitemap, RSS, robots.txt configured
- Responsive design with dark mode

### Critical Issues Found
| Issue | File | Problem |
|-------|------|---------|
| Wrong categories | `PostLayout.astro:12` | Uses `'life' \| 'tech' \| 'finance'` instead of `'culture' \| 'food' \| 'travel' \| 'lifestyle' \| 'language'` |
| Korean content | `PostLayout.astro` | Category names in Korean, "블로그명" placeholder, `lang="ko"`, Korean date format |
| Korean RSS | `rss.xml.ts` | Korean title/description, old category mapping, `<language>ko</language>` |
| Wrong email | `contact.astro:24` | Shows `contact@baksuls.com` instead of `elfguy81@gmail.com` |
| Zero posts | `src/content/posts/` | Empty - needs 10+ posts for AdSense |

---

## 3. Task Breakdown

### Phase A: Code Fixes (Pre-requisite)

#### A-1. Update contact email
- **File**: `src/pages/contact.astro`
- **Change**: `contact@baksuls.com` → `elfguy81@gmail.com` (line 24, both href and text)

#### A-2. Fix PostLayout.astro
- **File**: `src/layouts/PostLayout.astro`
- Fix category type: `'life' | 'tech' | 'finance'` → `'culture' | 'food' | 'travel' | 'lifestyle' | 'language'`
- Fix category names map: Korean → English (Culture, Food, Travel, Lifestyle, Language)
- Fix `lang="ko"` → `lang="en"`
- Fix date locale: `'ko-KR'` → `'en-US'`
- Fix site name: `"블로그명"` → `"Baksuls Blog"` (title, og:site_name, author, publisher)
- Fix `og:locale`: `"ko_KR"` → `"en_US"`
- Fix breadcrumb: `"홈"` → `"Home"`
- Fix related posts heading: `"관련 글"` → `"Related Posts"`

#### A-3. Fix rss.xml.ts
- **File**: `src/pages/rss.xml.ts`
- Fix title: `"블로그명"` → `"Baksuls Blog"`
- Fix description: Korean → English description
- Fix category mapping: old Korean → new English categories
- Fix language: `<language>ko</language>` → `<language>en</language>`

### Phase B: Write 10 Blog Posts

Posts spread across all 5 categories (2 per category) for balanced AdSense-ready content:

| # | Category | Topic | Why This Topic |
|---|----------|-------|----------------|
| 1 | **food** | The Complete Guide to Korean BBQ | Highest search volume Korea topic |
| 2 | **food** | Korean Street Food: 15 Must-Try Snacks | Popular search, visual appeal |
| 3 | **culture** | Understanding Korean Age System and Recent Changes | Timely (2023 reform), high interest |
| 4 | **culture** | Seollal: How Koreans Celebrate Lunar New Year | Evergreen cultural content |
| 5 | **travel** | Seoul Neighborhood Guide: Where to Go and What to Do | Essential travel content |
| 6 | **travel** | Best Day Trips from Seoul for Every Season | Practical travel planning |
| 7 | **lifestyle** | The Korean Skincare Routine Explained | Massive global interest |
| 8 | **lifestyle** | What It's Really Like Working in a Korean Office | Unique insider perspective |
| 9 | **language** | 50 Essential Korean Phrases Every Traveler Needs | Practical, high search intent |
| 10 | **language** | Konglish: English Words That Mean Something Different in Korea | Fun, shareable content |

### Post Requirements (per CLAUDE.md)
- 1,500+ words each
- At least 3 H2 sections
- Natural, conversational tone (no AI patterns)
- Proper frontmatter (title, description, pubDate, category, shortId, keywords)
- Specific examples, anecdotes, insider tips

---

## 4. AdSense Readiness Checklist

| Requirement | Status |
|-------------|--------|
| 10+ quality posts | Will be fulfilled (10 posts) |
| 1,500+ words per post | Planned |
| 3+ active categories | Yes (all 5 categories used) |
| Privacy Policy page | Already exists |
| Contact page | Exists (email will be updated) |
| No ads before approval | Correct |
| Original content | All original |
| Mobile-friendly design | Already implemented |
| Sitemap | Already configured |

---

## 5. Execution Order

1. Fix code issues (A-1, A-2, A-3)
2. Write posts 1-5 (food x2, culture x2, travel x1)
3. Write posts 6-10 (travel x1, lifestyle x2, language x2)
4. Build and verify
