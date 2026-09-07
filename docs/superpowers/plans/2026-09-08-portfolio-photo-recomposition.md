# 포트폴리오 사진 전면 재구성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 시공 원본만으로 8개 프로젝트의 대표·상세사진을 균형 있게 재선별하고 관리자에서 상세사진 순서를 관리할 수 있게 한다.

**Architecture:** 의미 있는 파일명과 명시적 배열을 정적 기준 데이터로 사용한다. 공개 상세 페이지는 Supabase의 공개 갤러리 배열을 우선하되 오류·빈 값에서는 정적 데이터로 안전하게 되돌아가며, 관리자는 기존 메타데이터 편집기에 URL 기반 갤러리 순서 관리만 최소 추가한다.

**Tech Stack:** 정적 HTML/CSS/JavaScript, Node.js test runner, Pillow/WebP, Supabase Postgres·RLS·supabase-js v2

**Spec:** `docs/superpowers/specs/2026-09-08-portfolio-photo-recomposition-design.md`

## Global Constraints

- 현재 8개 프로젝트의 명칭·지역·평수·종류를 변경하거나 삭제하지 않는다.
- 제공된 ZIP의 실제 다함 시공사진만 사용한다.
- 홈페이지 포트폴리오와 홈페이지 관리자 외 기능·디자인을 수정하지 않는다.
- 정적 데이터는 항상 동작하는 fallback이어야 한다.
- 상세사진은 원본 비율을 보존하고 카드 대표사진만 의도적으로 crop한다.

---

### Task 1: 명시적 포트폴리오 데이터 계약

**Files:**
- Modify: `tests/portfolio-static.test.js`
- Modify: `tests/portfolio-binary-assets.test.js`
- Modify: `portfolio-static-domain.js`

**Interfaces:**
- Produces: `listProjects(): Project[]`, `findProject(slug): Project|null`; 각 `Project`는 `coverImage`, `coverPosition`, 명시적 `photos`를 가진다.

- [ ] **Step 1: Write the failing tests**

사진 수 자동생성 가정을 제거하고 각 프로젝트의 배열이 명시적이며 중복이 없고 의미 있는 WebP 경로만 포함하는지 검사한다. `coverPosition`은 CSS position으로 안전한 값인지 검사한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/portfolio-static.test.js tests/portfolio-binary-assets.test.js`
Expected: 기존 숫자 파일·고정 수량 가정 때문에 FAIL.

- [ ] **Step 3: Write minimal implementation**

`portfolio-static-domain.js`의 `project(..., count)` 자동생성을 `project({...})` 명시 객체로 바꾸고 복사 반환 시 `photos`를 복제한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/portfolio-static.test.js tests/portfolio-binary-assets.test.js`
Expected: PASS.

### Task 2: 원본 사진 선별과 WebP 자산 교체

**Files:**
- Replace: `portfolio-assets/projects/*/*.webp`
- Test: `tests/portfolio-binary-assets.test.js`

**Interfaces:**
- Consumes: Task 1의 정확한 `coverImage`와 `photos` 경로.
- Produces: 브라우저가 디코딩 가능한 WebP 대표·상세사진.

- [ ] **Step 1: Preserve the failing asset test**

Task 1 경로가 아직 존재하지 않아 실패하는 상태를 확인한다.

- [ ] **Step 2: Curate actual source photographs**

접촉표와 원본 확대 확인 결과를 기준으로 공간 다양성, 초점, 밝기, 수평·수직, 정리 상태를 평가한다. 유사 구도는 하나만 선택하고 원본에 존재하는 욕실·현관·방·수납을 우선 포함한다.

- [ ] **Step 3: Generate repository WebP files**

EXIF 회전을 적용한 뒤 원본 비율을 유지하며 최대 2400px, WebP quality 88로 변환한다. 대표사진은 별도 `cover.webp`로 저장하되 원본을 인위적으로 크롭하지 않는다.

- [ ] **Step 4: Run decoder and duplicate verification**

Run: `node --test tests/portfolio-binary-assets.test.js`
Expected: 모든 참조 파일이 존재하고 WebP로 완전 디코딩되며 한 프로젝트 내부 경로 중복이 없어 PASS.

### Task 3: 관리자 갤러리 데이터 정제

**Files:**
- Modify: `tests/website-admin-domain.test.js`
- Modify: `website-admin-domain.js`

**Interfaces:**
- Produces: `normalizeGalleryUrls(values): string[]`; `buildPortfolioRecord()`의 `gallery_image_urls` 필드.

- [ ] **Step 1: Write the failing domain tests**

HTTP(S), `/`, `./` 이미지만 허용하고 빈 값과 unsafe URL을 제거하며 입력 순서를 유지한 채 중복을 제거하는 예제를 추가한다. 저장 레코드가 `gallery_image_urls`만 추가하고 개인정보 필드를 포함하지 않는지 검사한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/website-admin-domain.test.js`
Expected: `normalizeGalleryUrls`와 `gallery_image_urls`가 없어 FAIL.

- [ ] **Step 3: Implement URL normalization**

기존 `safeImageUrl`을 재사용해 배열 또는 줄바꿈 문자열을 정제하고 `buildPortfolioRecord()`에 결과를 넣는다.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/website-admin-domain.test.js`
Expected: PASS.

### Task 4: Supabase 갤러리 컬럼과 보안

**Files:**
- Create: `supabase/migrations/` 아래에 CLI가 생성한 `website_portfolio_gallery` 마이그레이션
- Modify: `tests/website-db-security.test.js`
- Modify: `supabase/tests/website_public_security.sql`

**Interfaces:**
- Produces: `public.website_portfolio.gallery_image_urls jsonb not null default '[]'::jsonb`.

- [ ] **Step 1: Write the failing migration tests**

jsonb 배열 컬럼, 배열 타입 제약, 기존 공개 읽기 및 활성 직원 쓰기 정책을 검사한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/website-db-security.test.js`
Expected: 갤러리 마이그레이션이 없어 FAIL.

- [ ] **Step 3: Discover CLI and create migration**

Run: `supabase --help`와 `supabase migration new website_portfolio_gallery`.
Expected: CLI가 생성한 타임스탬프 파일 경로 출력.

- [ ] **Step 4: Implement the migration**

컬럼과 `jsonb_typeof(gallery_image_urls) = 'array'` 제약을 추가한다. 기존 grant와 RLS 정책은 넓히지 않는다.

- [ ] **Step 5: Run security tests**

Run: `node --test tests/website-db-security.test.js`
Expected: PASS.

### Task 5: 관리자 상세사진 순서 UI

**Files:**
- Modify: `tests/website-admin-ui.test.js`
- Modify: `website-admin.html`
- Modify: `portfolio-static-domain.js` script inclusion in admin page

**Interfaces:**
- Consumes: `normalizeGalleryUrls`, `gallery_image_urls`, 정적 프로젝트 목록.
- Produces: URL 추가·삭제·상하 이동·대표 선택 UI.

- [ ] **Step 1: Write the failing UI structure tests**

갤러리 목록, URL 입력, 추가 버튼, 이동 버튼, 삭제 버튼, 대표 선택 이벤트와 DB select/upsert의 `gallery_image_urls` 포함을 검사한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/website-admin-ui.test.js`
Expected: 갤러리 UI 토큰이 없어 FAIL.

- [ ] **Step 3: Implement minimal gallery editor**

정적 프로젝트를 관리자 목록에 합치고, 선택한 프로젝트의 정적 배열 또는 DB 배열을 썸네일 목록으로 표시한다. 추가·삭제·위·아래 이동은 메모리 배열에 반영하고 저장 시 `gallery_image_urls`로 전송한다. 대표 선택은 `cover_image_url`을 해당 URL로 설정한다.

- [ ] **Step 4: Run UI and domain tests**

Run: `node --test tests/website-admin-ui.test.js tests/website-admin-domain.test.js`
Expected: PASS.

### Task 6: 공개 상세 페이지의 동적 갤러리와 fallback

**Files:**
- Modify: `tests/website-public-domain.test.js`
- Modify: `tests/portfolio-static.test.js`
- Modify: `website-public-domain.js`
- Modify: `portfolio.html`
- Modify: `portfolio-page.js`
- Modify: `website-final.js`

**Interfaces:**
- Produces: `normalizePortfolioRow(row)`의 `galleryImageUrls`; 공개 DB 행을 slug로 정적 데이터에 병합하는 렌더링 흐름.

- [ ] **Step 1: Write failing normalization and wiring tests**

공개 행의 안전한 갤러리 URL 정제, `portfolio.html`의 Supabase 클라이언트 연결, 상세 페이지의 정적 fallback과 DB override, 메인 대표사진 링크 유지를 검사한다.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/website-public-domain.test.js tests/portfolio-static.test.js tests/website-ui.test.js`
Expected: 갤러리 필드와 상세 DB 연결이 없어 FAIL.

- [ ] **Step 3: Implement public merge and fallback**

정적 카드를 즉시 렌더링하고 Supabase 공개 행을 불러온다. slug가 일치하고 갤러리가 비어 있지 않으면 상세 배열을 교체하며, 대표 URL이 있으면 cover만 교체한다. 쿼리 실패 또는 빈 데이터에서는 정적 화면을 그대로 둔다.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/website-public-domain.test.js tests/portfolio-static.test.js tests/website-ui.test.js`
Expected: PASS.

### Task 7: 카드 crop과 상세 원본비율 반응형 검증

**Files:**
- Modify: `tests/portfolio-static.test.js`
- Modify: `portfolio-page.js`
- Modify: `portfolio-page.css`
- Modify: `website-final.js`

**Interfaces:**
- Consumes: `coverPosition`.
- Produces: 카드별 `object-position`; 상세 원본 비율 유지.

- [ ] **Step 1: Write failing presentation tests**

대표 이미지에 데이터의 `object-position`이 적용되고 상세 이미지에는 `object-fit: cover`가 적용되지 않는지 검사한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/portfolio-static.test.js tests/portfolio-binary-assets.test.js`
Expected: cover position wiring이 없어 FAIL.

- [ ] **Step 3: Implement presentation wiring**

카드 이미지에만 안전한 인라인 `object-position`을 적용한다. 상세 이미지는 width 100%, height auto를 유지하고 세로사진의 과도한 확대를 막도록 컨테이너 정렬과 최대 폭을 조정한다.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/portfolio-static.test.js tests/portfolio-binary-assets.test.js`
Expected: PASS.

### Task 8: 전체 회귀와 시각 검수

**Files:**
- Verify only

**Interfaces:**
- Consumes: 모든 이전 작업 결과.
- Produces: 자동검사 및 PC·태블릿·모바일 검수 기록.

- [ ] **Step 1: Run the complete test suite**

Run: `node --test tests/*.test.js`
Expected: 전체 PASS, stderr 오류 없음.

- [ ] **Step 2: Validate repository diff**

Run: `git diff --check`와 `git status --short`.
Expected: 공백 오류가 없고 포트폴리오 범위 파일만 변경됨.

- [ ] **Step 3: Inspect browser at three viewports**

로컬 서버에서 1440×1000, 768×1024, 390×844로 메인 카드와 8개 상세 모달을 연다. 대표 핵심부 crop, 상세 원본비율, 세로사진, 스크롤, 닫기, 로딩 오류를 확인한다.

- [ ] **Step 4: Report exact curation results**

프로젝트별 대표사진, 포함 공간, 원본 대비 제외 수, 노출 로직, 관리자 영향, 반응형 결과와 변경 파일을 기록한다.
