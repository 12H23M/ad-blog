# Plan: Astro 기반 자동 블로그 쓰기 시스템

> **작성일**: 2026-02-06
> **상태**: Plan 단계
> **목표**: AdSense 승인에 최적화된 고품질 블로그 포스트 자동 생성 시스템

---

## 1. 현재 상태 분석

### 1.1 프로젝트 구조

```
ad-blog/
├── src/
│   ├── content/
│   │   └── posts/          # Markdown 포스트 저장 (Content Collections)
│   ├── pages/
│   │   ├── index.astro     # 메인 페이지
│   │   └── posts/[slug].astro  # 동적 포스트 페이지
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── PostLayout.astro
│   ├── components/
│   │   ├── Header.astro
│   │   └── Footer.astro
│   └── styles/global.css
├── research/               # 리서치 자료 저장
├── .claude/agents/         # 에이전트 프롬프트
└── CLAUDE.md              # 프로젝트 가이드
```

### 1.2 기술 스택

| 구성 요소 | 현재 상태 |
|----------|----------|
| 프레임워크 | Astro 5.17 |
| 콘텐츠 관리 | Content Collections (Markdown) |
| SEO | @astrojs/sitemap 설치됨 |
| 배포 | GitHub → Cloudflare Pages |
| 에이전트 | HTML 기반 (Astro 구조 미반영) |

### 1.3 기존 콘텐츠

- **리서치**: 3개 (research/*.md)
- **포스트**: 3개 (src/content/posts/*.md)
- **카테고리**: 생활, 기술, 재테크

### 1.4 문제점

1. **에이전트-구조 불일치**: 기존 에이전트들이 HTML 템플릿 기반으로 설계됨
2. **CLAUDE.md 업데이트 필요**: Astro 구조가 반영되지 않음
3. **SEO 최적화 미완성**: Open Graph, 구조화된 데이터 미적용

---

## 2. 목표

### 2.1 핵심 목표

1. **AdSense 승인 최적화**: 봇 감지 회피, 고품질 콘텐츠
2. **SEO 최적화**: 검색 엔진 노출 극대화
3. **자동화**: 주제만 입력하면 완성된 포스트 생성
4. **Astro 통합**: Content Collections 활용

### 2.2 성공 기준

| 항목 | 기준 |
|------|------|
| 콘텐츠 양 | 최소 10-15개 포스트 |
| 글 분량 | 포스트당 1,500자 이상 |
| AI 감지 | GPTZero 등에서 Human 판정 |
| SEO 점수 | Lighthouse SEO 90+ |

---

## 3. 시스템 설계

### 3.1 에이전트 아키텍처 (Astro 버전)

```
┌─────────────────────────────────────────────────────────────┐
│                    blog-master (총괄)                        │
│                         │                                    │
│    ┌────────────────────┼────────────────────┐              │
│    ▼                    ▼                    ▼              │
│ ┌──────────┐    ┌──────────────┐    ┌─────────────┐        │
│ │ researcher│───▶│   analyst    │───▶│   writer    │        │
│ │ (웹 리서치)│   │ (구조화)     │    │ (MD 작성)   │        │
│ └──────────┘    └──────────────┘    └─────────────┘        │
│                                            │                 │
│                    ┌───────────────────────┘                │
│                    ▼                                         │
│             ┌─────────────┐    ┌─────────────┐              │
│             │    seo      │───▶│     qa      │              │
│             │ (메타/OG)   │    │ (봇감지체크)│              │
│             └─────────────┘    └─────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 에이전트별 역할 (업데이트)

| 에이전트 | 역할 | 입력 | 출력 |
|---------|------|------|------|
| **blog-master** | 전체 플로우 지휘 | 주제/키워드 | 완성된 Markdown 포스트 |
| **blog-researcher** | 웹 검색으로 자료 수집 | 주제 | `research/YYYY-MM-DD-[주제].md` |
| **blog-analyst** | 리서치 → 글 구조 변환 | 리서치 파일 | H1~H3 아웃라인 |
| **blog-writer** | **Markdown 본문 작성** | 아웃라인 | `src/content/posts/[slug].md` |
| **blog-seo** | SEO/OG 메타 최적화 | Markdown 포스트 | frontmatter 보완 |
| **blog-qa** | AdSense 정책/AI 감지 체크 | 완성된 포스트 | PASS/FAIL |

### 3.3 URL 규칙

#### URL 구조

```
/{category}/{shortId}
```

**예시:**
- `/finance/a1b2c3` - 재테크 카테고리
- `/tech/x7y8z9` - 기술 카테고리
- `/life/p3q4r5` - 생활 카테고리

#### shortId 생성 규칙

| 항목 | 규격 |
|------|------|
| 길이 | 6자리 |
| 문자셋 | 영문 소문자 + 숫자 (a-z, 0-9) |
| 조합 수 | 약 21.7억 (36^6) |
| 생성 방식 | nanoid 또는 랜덤 생성 |

#### 카테고리 URL 매핑

| 카테고리 (한글) | URL 경로 |
|----------------|----------|
| 생활 | `/life/` |
| 기술 | `/tech/` |
| 재테크 | `/finance/` |

#### URL 장점

1. **짧은 URL**: 공유 및 기억 용이
2. **SEO 친화적**: 카테고리가 URL에 포함
3. **예측 불가**: 랜덤 ID로 순차 접근 방지
4. **영구 링크**: ID 기반이라 제목 변경에도 URL 유지

---

### 3.4 포스트 Frontmatter 스키마

```yaml
---
title: "제목 (60자 이내)"
description: "설명 (150-160자)"
pubDate: "YYYY-MM-DD"
category: "life | tech | finance"    # URL 경로로 사용
shortId: "a1b2c3"                    # 6자리 랜덤 ID
keywords: "키워드1, 키워드2, 키워드3"
# 추가 예정
ogImage: "/images/og/[shortId].png"
author: "블로그명"
---
```

**변경 사항:**
- `postSlug` → `shortId` (6자리 랜덤)
- `category` 값을 영문 URL 경로로 통일

---

## 4. 구현 계획

### Phase 1: 에이전트 시스템 업데이트 ✅ 완료

| 작업 | 설명 | 상태 |
|------|------|------|
| CLAUDE.md 업데이트 | Astro 구조 반영 | ✅ |
| blog-writer.md 수정 | HTML → Markdown 출력 | ✅ |
| blog-master.md 수정 | 새 워크플로우 반영 | ✅ |
| blog-seo.md 수정 | frontmatter 기반 최적화 | ✅ |
| blog-qa.md 수정 | Markdown 검수 로직 | ✅ |

### Phase 1.5: URL 구조 변경 (신규)

| 작업 | 설명 | 우선순위 |
|------|------|---------|
| `src/content.config.ts` 수정 | `postSlug` → `shortId` | P0 |
| `src/pages/[category]/[id].astro` 생성 | 새 라우팅 구조 | P0 |
| `src/pages/posts/` 삭제 | 기존 라우팅 제거 | P0 |
| blog-writer.md 업데이트 | shortId 생성 로직 추가 | P0 |
| 기존 포스트 마이그레이션 | postSlug → shortId 변환 | P1 |
| PostLayout.astro 수정 | canonical URL 변경 | P1 |
| CLAUDE.md URL 규칙 추가 | 문서 업데이트 | P1 |

### Phase 2: SEO 강화

| 작업 | 설명 |
|------|------|
| OG 이미지 자동 생성 | satori 또는 @vercel/og 연동 |
| JSON-LD 스키마 | Article 구조화 데이터 |
| RSS 피드 | @astrojs/rss 추가 |
| robots.txt | 크롤링 최적화 |

### Phase 3: 콘텐츠 확장

| 목표 | 상세 |
|------|------|
| 포스트 10개 이상 | 카테고리별 균형 배분 |
| 정적 페이지 | 개인정보처리방침, 문의 |

---

## 5. 워크플로우 (신규)

### 5.1 포스트 생성 플로우

```
1. 사용자: "blog-master [주제]로 포스트 생성해줘"

2. blog-master:
   ├─ 주제/카테고리 확인
   └─ research/ 기존 리서치 확인

3. blog-researcher:
   ├─ WebSearch로 최신 정보 수집
   └─ research/YYYY-MM-DD-[주제].md 저장

4. blog-analyst:
   ├─ 리서치 파일 분석
   └─ H2 3개 이상 아웃라인 생성

5. blog-writer:
   ├─ shortId 생성 (6자리 랜덤)
   ├─ 아웃라인 기반 Markdown 작성
   ├─ frontmatter 포함 (shortId, category)
   └─ src/content/posts/[shortId].md 저장

6. blog-seo:
   ├─ frontmatter 최적화
   └─ 메타 태그 제안

7. blog-qa:
   ├─ AI 패턴 체크
   ├─ AdSense 정책 체크
   └─ PASS/FAIL 판정

8. blog-master:
   └─ 최종 결과 보고
```

### 5.2 AI 패턴 회피 규칙

```
❌ 금지 패턴:
- "오늘은 ~에 대해 알아보겠습니다"
- "첫째, 둘째, 셋째..."
- "~라고 할 수 있습니다"
- 과도한 접속사 반복
- 모든 문장이 비슷한 길이

✅ 권장 패턴:
- 문장 길이 자연스럽게 변화
- 설명하듯 자연스러운 흐름
- 구체적 예시와 비유 사용
- 가끔 짧은 문장으로 강조
- 개인 경험/관점 자연스럽게 녹이기
```

---

## 6. 파일 변경 목록

### 수정 필요

| 파일 | 변경 내용 |
|------|----------|
| `CLAUDE.md` | Astro 구조 반영, URL 규칙 추가 |
| `.claude/agents/blog-master.md` | 새 워크플로우 적용 |
| `.claude/agents/blog-writer.md` | Markdown 출력, shortId 생성 |
| `.claude/agents/blog-seo.md` | frontmatter 기반 최적화 |
| `.claude/agents/blog-qa.md` | Markdown 검수 로직 |
| `src/content.config.ts` | `postSlug` → `shortId` 스키마 변경 |
| `astro.config.mjs` | site URL 설정 |

### 신규 생성

| 파일 | 용도 |
|------|------|
| `src/pages/[category]/[id].astro` | 새 URL 구조 라우팅 |
| `src/pages/privacy.astro` | 개인정보처리방침 |
| `src/pages/contact.astro` | 문의 페이지 |
| `public/robots.txt` | 크롤링 설정 |

### 삭제 가능

| 파일 | 사유 |
|------|------|
| `posts/*.html` | Astro 마이그레이션 후 불필요 |
| `templates/` | Markdown 기반으로 전환 |
| `index.html` | src/pages/index.astro로 대체 |
| `src/pages/posts/` | 새 URL 구조(`/[category]/[id]`)로 대체 |

---

## 7. 배포 파이프라인

```
[로컬 개발]
    │
    ▼
git push origin main
    │
    ▼
[GitHub Actions] (선택)
    ├─ Lint/Build 검증
    └─ Lighthouse CI
    │
    ▼
[Cloudflare Pages]
    ├─ 자동 빌드 (astro build)
    └─ 전역 CDN 배포
```

---

## 8. 다음 단계

1. **이 계획 승인** → Design 단계로 이동
2. **에이전트 시스템 업데이트** → 각 에이전트 .md 파일 수정
3. **테스트 포스트 생성** → 새 워크플로우 검증
4. **SEO 강화** → OG, JSON-LD, RSS 적용
5. **AdSense 신청** → 10개 이상 포스트 확보 후

---

*이 문서는 PDCA Plan 단계의 산출물입니다.*
*승인 후 Design 단계에서 상세 설계를 진행합니다.*
