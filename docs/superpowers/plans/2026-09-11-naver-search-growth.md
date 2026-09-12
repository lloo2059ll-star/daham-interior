# Naver Search Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네이버 일반검색에서 다함 인테리어 공식 홈페이지의 브랜드 검색 순위를 안정화하고 `구미 인테리어` 1페이지 진입 기반을 구축한다.

**Architecture:** 메인 페이지를 `구미 인테리어` 대표 문서로 유지하고, 실제 시공 사례마다 고유하고 수집 가능한 상세 문서를 연결한다. 기술 SEO, 현장 콘텐츠, 네이버 생태계의 업체 정보 일치, 자연스러운 외부 인용, 주간 측정을 하나의 반복 운영 체계로 묶는다.

**Tech Stack:** 정적 HTML/CSS/JavaScript, Supabase 포트폴리오 데이터, 네이버 서치어드바이저, 네이버 플레이스·블로그

**Spec:** `docs/superpowers/specs/2026-09-11-naver-search-growth.md`

## Global Constraints

- 메인 페이지와 경쟁하는 별도 `구미 인테리어` 랜딩 페이지를 만들지 않는다.
- 블로그 원문 복제, 키워드 나열, 얇은 지역 페이지 대량 생성, 구매 링크를 사용하지 않는다.
- 플레이스·블로그 노출과 홈페이지 웹문서 노출을 별도로 측정한다.
- 검색 결과 확인은 로그인 여부와 위치 영향을 기록하고 같은 조건으로 반복한다.
- 제목과 설명문은 페이지별로 고유하게 작성하며 동일 키워드를 반복하지 않는다.

---

### Task 1: 측정 기준과 주간 기록표 확정

**Files:**
- Create: `docs/seo/naver-weekly-scorecard.md`
- Modify: `worklog.html`

**Interfaces:**
- Consumes: 기준 검색어 4개와 2026-09-11 순위
- Produces: 매주 같은 방식으로 비교할 수 있는 기록 형식

- [ ] **Step 1: 기록표에 네 검색어와 최초 순위를 입력한다**

  필드는 `확인일`, `검색어`, `홈페이지 노출 여부`, `웹문서 순위`, `노출 섹션`, `로그인 상태`, `검색 위치`, `비고`로 고정한다.

- [ ] **Step 2: 서치어드바이저 주간 지표 항목을 추가한다**

  `노출수`, `클릭수`, `CTR`, `노출 쿼리`, `상위 URL`, `수집 오류`를 최근 7일과 28일로 기록한다. 서치어드바이저 지표는 약 1주 지연된다는 점을 표기한다.

- [ ] **Step 3: 수동 검색 측정 규칙을 문서화한다**

  일반 통합검색 1페이지의 클릭 가능한 `https://daham-interior.com/` 결과만 홈페이지 노출로 계산하고 플레이스·블로그·광고는 별도 칸에 기록한다.

- [ ] **Step 4: 매주 월요일 1회 기록 일정을 작업일지에 추가한다**

- [ ] **Step 5: 기록표 형식과 작업일지 링크를 검토하고 커밋한다**

  ```powershell
  git add docs/seo/naver-weekly-scorecard.md worklog.html
  git commit -m "docs: add Naver search scorecard"
  ```

### Task 2: 네이버 수집·색인 기반 점검

**Files:**
- Modify: `robots.txt`
- Modify: `sitemap.xml`
- Test: `tests/pages.test.js`

**Interfaces:**
- Consumes: 공개 페이지 목록
- Produces: 수집 가능한 대표 URL과 최신 사이트맵

- [ ] **Step 1: 공개 페이지별 응답·canonical·index 허용 테스트를 작성한다**

  `/`, `/portfolio.html`, 공개 포트폴리오 상세 URL이 `200`, 자기 자신 canonical, `noindex` 없음 조건을 만족하도록 테스트한다.

- [ ] **Step 2: 테스트를 실행해 현재 누락 항목을 확인한다**

  ```powershell
  npm test -- --runInBand tests/pages.test.js
  ```

- [ ] **Step 3: `robots.txt`에 네이버 로봇 차단이 없는지 확인하고 사이트맵 위치를 명시한다**

- [ ] **Step 4: `sitemap.xml`에 메인·포트폴리오 목록·각 공개 상세 URL을 넣는다**

  관리자, 견적, 로그인, ERP 페이지는 사이트맵에서 제외한다.

- [ ] **Step 5: 테스트를 다시 실행하고 통과 결과를 저장한다**

- [ ] **Step 6: 배포 후 서치어드바이저 URL 검사로 메인과 상세 문서의 수집 가능 여부를 확인한다**

- [ ] **Step 7: 변경 파일을 커밋한다**

  ```powershell
  git add robots.txt sitemap.xml tests/pages.test.js
  git commit -m "fix: strengthen Naver crawl discovery"
  ```

### Task 3: 메인 페이지를 대표 검색 문서로 강화

**Files:**
- Modify: `index.html`
- Modify: `website-final.css`
- Test: `tests/website-ui.test.js`
- Test: `tests/pages.test.js`

**Interfaces:**
- Consumes: 현재 메인 제목 `다함 인테리어 | 구미 인테리어 · 아파트 리모델링`
- Produces: 구미 지역성과 실제 경험을 명확히 설명하는 대표 문서

- [ ] **Step 1: 메인 문서 SEO 구조 테스트를 작성한다**

  정확히 하나의 H1, 고유 title·description, canonical, LocalBusiness JSON-LD, 구미 주소·서비스 지역·전화번호, 포트폴리오 내부 링크가 있어야 한다.

- [ ] **Step 2: 테스트를 실행해 현재 부족한 항목을 확인한다**

- [ ] **Step 3: H1과 첫 화면의 역할을 분리한다**

  H1은 브랜드 문구를 유지하되 첫 화면의 검색 가능한 짧은 문단에서 `구미에서 아파트 전체 인테리어와 리모델링을 설계·시공하는 다함 인테리어`라는 업체 정체성을 한 번 명확히 설명한다.

- [ ] **Step 4: 실제 서비스 정보 블록을 추가한다**

  `주요 시공 지역`, `공사 범위`, `상담부터 완공까지 담당 방식`, `실제 구미 현장`을 광고 문구가 아닌 사실 중심의 텍스트로 작성한다.

- [ ] **Step 5: 메인에서 대표 구미 현장 4개로 설명형 내부 링크를 연결한다**

  링크 문구는 현장명과 평형을 사용하고 네 링크 모두를 `구미 인테리어`로 통일하지 않는다.

- [ ] **Step 6: 모바일과 데스크톱에서 추가 문단이 첫 화면을 과도하게 밀어내지 않는지 확인한다**

- [ ] **Step 7: 테스트를 통과시키고 커밋한다**

  ```powershell
  git add index.html website-final.css tests/website-ui.test.js tests/pages.test.js
  git commit -m "feat: strengthen Gumi relevance on homepage"
  ```

### Task 4: 포트폴리오마다 독립적인 검색 문서 제공

**Files:**
- Modify: `portfolio.html`
- Modify: `portfolio-page.js`
- Modify: `portfolio-static-domain.js`
- Modify: `portfolio-page.css`
- Modify: `sitemap.xml`
- Test: `tests/portfolio-static.test.js`
- Test: `tests/pages.test.js`

**Interfaces:**
- Consumes: 공개 포트폴리오의 slug, 현장명, 지역, 평형, 사진
- Produces: 공유·수집 가능한 고유 상세 URL과 현장별 메타데이터

- [ ] **Step 1: 상세 URL 직접 진입 테스트를 작성한다**

  새 탭에서 각 현장 URL로 바로 열어도 해당 현장 제목, 설명, 사진, 상담 링크가 나타나야 하며 다른 현장으로 바뀌지 않아야 한다.

- [ ] **Step 2: 현장별 메타데이터 테스트를 작성한다**

  각 문서에는 고유 title, description, canonical, H1, og:title, og:description, og:image가 있어야 한다.

- [ ] **Step 3: 현장 데이터에 설명 필드를 추가한다**

  `기존 상태`, `설계 판단`, `주요 시공`, `완공 결과`를 각 1~3문장으로 저장한다. 사진으로 확인되지 않거나 대표가 제공하지 않은 자재·공법은 작성하지 않는다.

- [ ] **Step 4: 공개 상세 URL을 렌더링한다**

  우선 대상은 `prugio-castle-a-32`, `imeun-kolon-35`, `bonggok-hyunjin-36`, `okgye-epyeon-35`로 한다.

- [ ] **Step 5: 이미지별 고유 alt를 적용한다**

  alt는 `현장명 + 공간 + 사진에서 확인되는 특징`으로 작성하고 같은 키워드를 모든 이미지에 반복하지 않는다.

- [ ] **Step 6: 상세 문서 사이 관련 현장 링크와 메인 페이지 링크를 추가한다**

- [ ] **Step 7: 상세 URL을 사이트맵에 포함하고 테스트를 실행한다**

- [ ] **Step 8: 변경 파일을 커밋한다**

  ```powershell
  git add portfolio.html portfolio-page.js portfolio-static-domain.js portfolio-page.css sitemap.xml tests/portfolio-static.test.js tests/pages.test.js
  git commit -m "feat: publish crawlable portfolio detail pages"
  ```

### Task 5: 네이버 채널과 업체 정보 일치

**Files:**
- Create: `docs/seo/business-profile-checklist.md`

**Interfaces:**
- Consumes: 공식 상호, 주소, 전화번호, 홈페이지 URL
- Produces: 플레이스·블로그·외부 프로필의 일관된 업체 정보

- [ ] **Step 1: 공식 표준 정보를 한 줄로 확정한다**

  상호 `다함 인테리어`, 대표 전화 `010-2059-0347`, 구미 사업장 주소, 홈페이지 `https://daham-interior.com/`를 기준으로 삼는다. 주소는 사업자등록 및 플레이스 정보와 대조한 뒤 확정한다.

- [ ] **Step 2: 네이버 플레이스의 홈페이지·전화·주소·소개를 점검한다**

- [ ] **Step 3: 네이버 블로그 프로필과 소개의 홈페이지 링크를 점검한다**

- [ ] **Step 4: 당근·오늘의집·인스타그램의 업체 정보와 홈페이지 링크를 동일하게 맞춘다**

- [ ] **Step 5: 수정 전후 화면과 확인일을 체크리스트에 기록한다**

- [ ] **Step 6: 체크리스트를 커밋한다**

  ```powershell
  git add docs/seo/business-profile-checklist.md
  git commit -m "docs: standardize public business profiles"
  ```

### Task 6: 블로그와 홈페이지의 콘텐츠 연결 운영

**Files:**
- Create: `docs/seo/content-publishing-checklist.md`

**Interfaces:**
- Consumes: 네이버 블로그 원고와 홈페이지 현장 상세 URL
- Produces: 중복 없이 서로 보완하는 발행 흐름

- [ ] **Step 1: 홈페이지 현장 문서를 먼저 발행한다**

  홈페이지는 시공 판단과 포트폴리오 요약을 제공하고, 블로그는 사진 흐름과 대표의 현장 설명을 제공한다.

- [ ] **Step 2: 블로그 글마다 대응하는 현장 상세 URL 하나를 연결한다**

  상담 배너와 별도로 본문 또는 마무리에 고객이 목적을 이해할 수 있는 자연스러운 링크 문장 하나를 사용한다.

- [ ] **Step 3: 홈페이지 상세 문서에서 관련 블로그 후기 하나를 연결한다**

- [ ] **Step 4: 월 2개 이상의 실제 현장 상세 문서와 대응 블로그 글을 발행한다**

- [ ] **Step 5: 발행 후 URL 검사, 사이트맵 반영, 링크 작동을 확인한다**

- [ ] **Step 6: 운영 체크리스트를 커밋한다**

  ```powershell
  git add docs/seo/content-publishing-checklist.md
  git commit -m "docs: define Naver content publishing workflow"
  ```

### Task 7: 30·60·90일 성과 평가와 조정

**Files:**
- Modify: `docs/seo/naver-weekly-scorecard.md`
- Create: `docs/seo/naver-90day-review.md`

**Interfaces:**
- Consumes: 주간 순위, 서치어드바이저 노출·클릭·CTR, 상위 URL
- Produces: 유지·개선·중단 결정을 포함한 다음 분기 계획

- [ ] **Step 1: 30일차에 기술 오류와 브랜드 검색 순위를 평가한다**

  브랜드 검색 미노출이 남아 있으면 대표 URL, 제목·설명 중복, 외부 업체 정보 불일치를 우선 재점검한다.

- [ ] **Step 2: 60일차에 노출 쿼리와 CTR을 평가한다**

  노출은 높고 CTR이 낮은 URL은 제목과 설명이 검색 의도에 맞는지 한 번만 개선하고 변경일을 기록한다.

- [ ] **Step 3: 90일차에 `구미 인테리어` 1페이지 진입 여부를 확인한다**

  미진입이면 상위 결과 10개의 콘텐츠 범위, 지역 신뢰 신호, 외부 인용, 페이지 유형을 비교한다.

- [ ] **Step 4: 실적이 있는 주제만 확장한다**

  서치어드바이저에서 실제 노출이 발생한 `구미 + 아파트명/동명/평형/공간` 조합을 다음 현장 콘텐츠 우선순위로 사용한다.

- [ ] **Step 5: 평가 문서를 커밋한다**

  ```powershell
  git add docs/seo/naver-weekly-scorecard.md docs/seo/naver-90day-review.md
  git commit -m "docs: review Naver search growth results"
  ```

## 실행 우선순위

1. Task 1과 Task 2로 측정 및 수집 오류를 먼저 제거한다.
2. Task 3과 Task 4로 메인 및 실제 현장 콘텐츠를 강화한다.
3. Task 5와 Task 6으로 네이버 채널과 외부 신뢰 신호를 연결한다.
4. Task 7에서 30·60·90일 데이터를 근거로 조정한다.

## 기대 범위

- 브랜드 검색어는 기술·정보 일치 작업 후 상대적으로 빠르게 개선될 가능성이 있다.
- `구미 인테리어`는 광고, 플레이스, 오래된 경쟁 도메인이 함께 경쟁하므로 단기간 순위를 보장할 수 없다.
- 목표는 키워드를 많이 넣는 것이 아니라 네이버가 `다함 인테리어 = 구미의 실제 시공 업체`라고 일관되게 이해할 증거를 축적하는 것이다.
