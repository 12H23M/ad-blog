# Design: Astro 기반 자동 블로그 쓰기 시스템

> **작성일**: 2026-02-06
> **상태**: Design 단계
> **Plan 문서**: [docs/plan-auto-blog-system.md](../../plan-auto-blog-system.md)

---

## 1. 설계 개요

### 1.1 현재 vs 목표

| 항목 | 현재 (AS-IS) | 목표 (TO-BE) |
|------|-------------|-------------|
| 포스트 형식 | HTML (posts/*.html) | **Markdown** (src/content/posts/*.md) |
| 템플릿 | templates/post-template.html | Content Collections + PostLayout.astro |
| 에이전트 출력 | HTML 파일 | Markdown + frontmatter |
| SEO 설정 | 수동 | frontmatter 자동 반영 |
| 광고 영역 | HTML 주석 | (Astro 컴포넌트화 예정) |

### 1.2 핵심 변경점

1. **blog-writer**: HTML → Markdown 출력
2. **blog-seo**: HTML 메타태그 → frontmatter 최적화
3. **blog-master**: 새 워크플로우 반영
4. **CLAUDE.md**: Astro 구조 전면 업데이트

---

## 2. 에이전트 상세 설계

### 2.1 blog-master.md (변경)

```yaml
---
description: Astro 기반 블로그 포스트 생성 총괄. 에이전트 조율 및 품질 관리.
tools:
  - Task
  - Read
  - Write
  - Glob
  - Grep
model: opus
---
```

**워크플로우 변경:**

```
[기존]
1. 리서치 → research/*.md
2. 구조화 → 아웃라인
3. 작성 → posts/*.html      ← 변경
4. SEO → HTML 메타태그       ← 변경
5. QA → 검수

[신규]
1. 리서치 → research/*.md
2. 구조화 → 아웃라인
3. 작성 → src/content/posts/*.md   ← Markdown
4. SEO → frontmatter 최적화         ← frontmatter
5. QA → 검수
```

**변경 내용:**
- `posts/*.html` 경로를 `src/content/posts/*.md`로 변경
- `templates/post-template.html` 참조 제거
- Content Collections 구조 반영

---

### 2.2 blog-writer.md (핵심 변경)

**변경 전:**
```yaml
tools:
  - Read, Write, Edit, Glob, Grep
model: sonnet
# Output: posts/*.html
```

**변경 후:**
```yaml
---
description: Markdown 형식의 블로그 포스트 작성. Astro Content Collections 규격 준수.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
model: sonnet
---
```

**출력 형식 변경:**

```markdown
---
title: "제목 (60자 이내)"
description: "메타 설명 (150-160자)"
pubDate: "YYYY-MM-DD"
category: "생활 | 기술 | 재테크"
postSlug: "url-friendly-slug"
keywords: "키워드1, 키워드2, 키워드3"
---

[서론 - 2-3문장으로 자연스럽게 시작]

## 첫 번째 섹션 제목

본문 내용...

## 두 번째 섹션 제목

본문 내용...

## 세 번째 섹션 제목

본문 내용...
```

**저장 경로:**
```
src/content/posts/[postSlug].md
```

**예시:**
- `src/content/posts/savings-vs-fixed-deposit-guide.md`
- `src/content/posts/smartphone-battery-tips.md`

---

### 2.3 blog-researcher.md (유지)

변경 없음. 리서치 출력은 동일:
```
research/YYYY-MM-DD-[주제].md
```

---

### 2.4 blog-analyst.md (유지)

변경 없음. 아웃라인 형식 동일.

---

### 2.5 blog-seo.md (변경)

**변경 내용:**
- HTML 메타태그 분석 → **frontmatter 분석**
- 광고 위치 제안 → (향후 Astro 컴포넌트)

**출력 형식 변경:**

```markdown
## SEO 분석 결과

### Frontmatter 최적화

| 필드 | 현재 | 제안 | 상태 |
|------|------|------|------|
| title | [현재값] | [제안값] | ✅/⚠️ |
| description | [현재값] | [제안값] | ✅/⚠️ |
| postSlug | [현재값] | [제안값] | ✅/⚠️ |
| keywords | [현재값] | [제안값] | ✅/⚠️ |

### 키워드 밀도
- 메인 키워드: [N]% (권장: 2-3%)
- 과최적화 리스크: [있음/없음]

### PostLayout.astro 확인
- OG 태그: ✅ (자동 생성됨)
- JSON-LD: ✅ (자동 생성됨)
- Canonical URL: ⚠️ site URL 설정 필요
```

---

### 2.6 blog-qa.md (변경)

**변경 내용:**
- HTML 구조 검사 → **Markdown/frontmatter 검사**
- 목차(TOC) 검사 제거 (Astro에서 자동 처리 가능)

**체크리스트 업데이트:**

```markdown
### Markdown 구조 검사
- [ ] frontmatter 필수 필드 존재 (title, description, pubDate, category, postSlug)
- [ ] H2 섹션 최소 3개 이상
- [ ] 본문 1,500자 이상
- [ ] 파일명이 postSlug와 일치

### AI 패턴 검사 (기존 유지)
- [ ] 뻔한 서론 패턴 없음
- [ ] 번호 매긴 클리셰 없음
- [ ] 문장 길이 변화 있음
- [ ] 과도한 접속사 반복 없음

### AdSense 정책 검사 (기존 유지)
- [ ] YMYL 주의사항 준수
- [ ] 출처 명시
- [ ] 클릭베이트 아님
```

---

## 3. Content Schema 설계

### 3.1 현재 스키마 (content.config.ts)

```typescript
const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    category: z.string(),
    postSlug: z.string(),
    keywords: z.string().optional(),
  }),
});
```

### 3.2 확장 스키마 (선택사항)

향후 필요시 추가:

```typescript
const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().max(60),           // 60자 제한
    description: z.string().max(160),    // 160자 제한
    pubDate: z.string(),
    category: z.enum(['생활', '기술', '재테크']),
    postSlug: z.string(),
    keywords: z.string().optional(),
    // 확장 필드
    ogImage: z.string().optional(),      // OG 이미지 경로
    author: z.string().default('블로그명'),
    draft: z.boolean().default(false),   // 초안 여부
    updatedDate: z.string().optional(),  // 수정일
  }),
});
```

---

## 4. 파일 변경 상세

### 4.1 수정 파일

| 파일 | 변경 내용 | 우선순위 |
|------|----------|---------|
| `.claude/agents/blog-master.md` | 워크플로우 경로 변경 | P0 |
| `.claude/agents/blog-writer.md` | HTML→Markdown 출력 | P0 |
| `.claude/agents/blog-seo.md` | frontmatter 기반 분석 | P1 |
| `.claude/agents/blog-qa.md` | Markdown 검수 로직 | P1 |
| `CLAUDE.md` | 전체 구조 업데이트 | P0 |
| `astro.config.mjs` | site URL 설정 | P1 |

### 4.2 blog-writer.md 상세 변경

**제거할 내용:**
```markdown
## IMPORTANT: Template Usage
반드시 `templates/post-template.html`을 참조하여...
```

**추가할 내용:**
```markdown
## 출력 형식: Astro Content Collections

### 파일 구조
\`\`\`
src/content/posts/[postSlug].md
\`\`\`

### Frontmatter 필수 필드
\`\`\`yaml
---
title: "제목"           # 60자 이내
description: "설명"     # 150-160자
pubDate: "YYYY-MM-DD"   # ISO 형식
category: "카테고리"    # 생활/기술/재테크
postSlug: "slug"        # URL 경로 (영문, 하이픈)
keywords: "키워드들"    # 쉼표 구분 (선택)
---
\`\`\`

### 본문 규칙
- H2 섹션 최소 3개
- 1,500자 이상
- Markdown 문법 사용
- HTML 태그 사용 금지 (순수 Markdown)
```

### 4.3 CLAUDE.md 주요 변경 섹션

```markdown
## 프로젝트 구조 (Astro 버전)

\`\`\`
ad-blog/
├── src/
│   ├── content/
│   │   ├── config.ts           # Content Collections 설정
│   │   └── posts/              # 블로그 포스트 (Markdown)
│   │       └── [slug].md
│   ├── pages/
│   │   ├── index.astro
│   │   └── posts/[slug].astro
│   ├── layouts/
│   │   └── PostLayout.astro    # SEO 메타태그 자동 생성
│   └── components/
├── research/                    # 리서치 자료 (변경 없음)
└── .claude/agents/              # 에이전트 (업데이트됨)
\`\`\`
```

---

## 5. 워크플로우 시퀀스 다이어그램

```
┌──────────────────────────────────────────────────────────────────────┐
│                         blog-master                                   │
│                              │                                        │
│  1. 주제 확인                │                                        │
│  2. 기존 리서치 확인         │                                        │
│     Glob research/*.md       │                                        │
│                              │                                        │
│                              ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │                   blog-researcher                          │       │
│  │  - WebSearch로 정보 수집                                   │       │
│  │  - research/YYYY-MM-DD-[주제].md 저장                      │       │
│  └───────────────────────────────────────────────────────────┘       │
│                              │                                        │
│                              ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │                   blog-analyst                             │       │
│  │  - 리서치 파일 분석                                        │       │
│  │  - H1~H3 아웃라인 생성                                     │       │
│  └───────────────────────────────────────────────────────────┘       │
│                              │                                        │
│                              ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │                   blog-writer                              │       │
│  │  - Markdown 본문 작성                                      │       │
│  │  - frontmatter 포함                                        │       │
│  │  - src/content/posts/[postSlug].md 저장                    │       │
│  └───────────────────────────────────────────────────────────┘       │
│                              │                                        │
│                              ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │                   blog-seo                                 │       │
│  │  - frontmatter 검토                                        │       │
│  │  - 키워드 밀도 분석                                        │       │
│  │  - 최적화 제안                                             │       │
│  └───────────────────────────────────────────────────────────┘       │
│                              │                                        │
│                              ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │                   blog-qa                                  │       │
│  │  - Markdown 구조 검사                                      │       │
│  │  - AI 패턴 검사                                            │       │
│  │  - AdSense 정책 검사                                       │       │
│  │  - PASS → 완료 / FAIL → blog-writer 재작성                │       │
│  └───────────────────────────────────────────────────────────┘       │
│                              │                                        │
│                              ▼                                        │
│                       최종 결과 보고                                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. 구현 순서

### Phase 1: 에이전트 업데이트 (P0)

```
1. .claude/agents/blog-writer.md 수정
   - HTML 출력 → Markdown 출력
   - 템플릿 참조 제거
   - frontmatter 규격 추가

2. .claude/agents/blog-master.md 수정
   - 경로 변경 (posts/*.html → src/content/posts/*.md)
   - 워크플로우 단계 업데이트

3. CLAUDE.md 전면 업데이트
   - 프로젝트 구조 섹션
   - 에이전트 워크플로우 섹션
   - 템플릿 가이드 → frontmatter 가이드로 변경
```

### Phase 2: SEO/QA 업데이트 (P1)

```
4. .claude/agents/blog-seo.md 수정
   - frontmatter 기반 분석
   - PostLayout.astro 자동 생성 설명

5. .claude/agents/blog-qa.md 수정
   - Markdown 구조 체크리스트
   - HTML 관련 체크 제거

6. astro.config.mjs 수정
   - site URL 설정
```

### Phase 3: 정리 (P2)

```
7. 불필요 파일 정리
   - posts/*.html (백업 후 삭제)
   - templates/ (삭제)
   - index.html (삭제)
```

---

## 7. 테스트 계획

### 7.1 에이전트 테스트

```bash
# 1. blog-researcher 테스트
"blog-researcher 에이전트로 '2026 신용카드 혜택' 리서치해줘"
→ 확인: research/2026-02-06-신용카드-혜택.md 생성됨

# 2. blog-writer 테스트
"blog-writer 에이전트로 아웃라인 기반 포스트 작성해줘"
→ 확인: src/content/posts/[slug].md 생성됨
→ 확인: frontmatter 필드 모두 존재

# 3. 전체 플로우 테스트
"blog-master 에이전트로 '2026 신용카드 혜택' 포스트 생성해줘"
→ 확인: 전체 파이프라인 정상 동작
```

### 7.2 빌드 테스트

```bash
npm run build
# 확인: dist/ 폴더에 정적 파일 생성됨

npm run preview
# 확인: localhost에서 포스트 접근 가능
```

---

## 8. 롤백 계획

문제 발생 시:

1. **에이전트 롤백**: Git에서 이전 버전 복원
   ```bash
   git checkout HEAD~1 -- .claude/agents/
   ```

2. **포스트 복구**: 기존 HTML 포스트 유지
   - `posts/*.html` 백업본 사용

---

## 9. 다음 단계

1. **이 Design 승인** → Do 단계로 이동
2. **구현**: Phase 1 → Phase 2 → Phase 3 순서
3. **테스트**: 새 포스트 생성으로 검증
4. **배포**: Cloudflare Pages 빌드 확인

---

*이 문서는 PDCA Design 단계의 산출물입니다.*
*승인 후 Do 단계에서 실제 구현을 진행합니다.*
