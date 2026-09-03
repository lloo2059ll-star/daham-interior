# 다함 인테리어 공개 홈페이지 + ERP 연동 설계

## 목표

아까 확정한 다함 인테리어 홈페이지 시안의 구조와 톤을 유지하면서, 고객은 공개 홈페이지에서만 행동하고 ERP에는 로그인하지 않도록 한다. 공개 가능한 포트폴리오 데이터만 별도 공개 테이블로 복사하며, 홈페이지 견적 문의는 같은 Supabase 안에서 안전하게 ERP 상담 데이터(`daham_consult_v1`)로 자동 편입한다.

## 사용자 흐름

1. 고객은 `website.html`에 접속한다.
2. 고객은 헤더/히어로/포트폴리오/공사 프로세스/회사정보를 본다.
3. `견적 문의하기`를 누르면 홈페이지 내부 모달 폼이 열린다.
4. 고객이 폼을 제출하면 `website_inquiries`에 INSERT 된다.
5. DB 트리거가 같은 트랜잭션에서 문의를 ERP 상담 형식으로 변환해 `sync_data.key = 'daham_consult_v1'` JSON 배열 끝에 추가한다.
6. 고객은 ERP 화면/주소/로그인/내부 데이터에 접근하지 않는다.
7. 대표/직원은 기존 `consult.html`을 열었을 때 평소처럼 클라우드 동기화된 상담을 확인한다.

## 공개 포트폴리오 흐름

1. `website-admin.html`은 기존 `auth.js` 인증을 그대로 사용한다.
2. 인증된 활성 직원만 `sync_data`에서 프로젝트 인덱스와 프로젝트 상세를 읽는다.
3. 공개 관리 화면에서는 고객명·전화번호·견적금액을 포트폴리오 레코드에 복사하지 않는다.
4. 직원이 공개 제목, 공개 지역명, 평형, 스타일, 소개문, 대표 이미지 URL, 노출순서, 공개 여부를 저장한다.
5. 홈페이지는 `website_portfolio`에서 `is_published = true`인 행만 anon 권한으로 읽는다.

## 홈페이지 디자인

기준 시안은 다음을 유지한다.

- 흰색 헤더: 좌측 `다함 인테리어 / DAHAM INTERIOR`, 중앙 메뉴, 우측 검정 `견적 문의하기` 버튼
- 베이지/화이트 계열의 대형 히어로 비주얼과 좌측 카피/CTA
- 히어로 하단 4개 신뢰 포인트 바
- `PORTFOLIO` 4열 카드
- `OUR PROCESS` 6단계
- 하단 4분할 정보 영역
- 최하단 사업자 정보 푸터
- 모바일에서는 1열 중심으로 재배치

## 데이터 모델

### `public.website_portfolio`

공개에 필요한 필드만 저장한다.

- `id uuid`
- `source_project_id text unique`
- `slug text unique`
- `title text`
- `location text`
- `area_pyeong numeric`
- `style text`
- `summary text`
- `cover_image_url text`
- `sort_order integer`
- `is_published boolean`
- `published_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

고객명, 고객 전화번호, 계약금액, 견적금액, 원가, 마진 필드는 만들지 않는다.

### `public.website_inquiries`

- `id uuid`
- `name text`
- `phone text`
- `email text`
- `address text`
- `address_detail text`
- `site_name text`
- `area text`
- `budget text`
- `move_date date`
- `message text`
- `privacy_consent boolean`
- `honeypot text`
- `source text default 'website'`
- `erp_synced_at timestamptz`
- `created_at timestamptz`

## 문의 → ERP 변환

`private.import_website_inquiry_to_consult()` 트리거 함수가 `website_inquiries` INSERT 후 다음 형태를 `daham_consult_v1`에 추가한다.

- `id`: `web_<uuid without hyphen>`
- `status`: `inquiry`
- `source`: `홈페이지`
- `consultTitle`: `홈페이지 견적 문의`
- `name`, `tel`, `email`, `addr`, `addrDetail`, `siteName`, `area`, `budget`, `moveDate`, `memo`
- `websiteInquiryId`: 원본 문의 UUID
- `history`: `홈페이지 견적 문의 자동 접수` 메모 1건

트리거는 `SELECT ... FOR UPDATE`로 `daham_consult_v1` 행을 잠근 뒤 배열에 추가해 동시 접수 시 덮어쓰기를 방지한다. 같은 `websiteInquiryId`가 이미 있으면 중복 추가하지 않는다.

## 보안

- 기존 `sync_data`는 anon 권한을 열지 않는다.
- `website_portfolio`: anon은 published 행 SELECT만 허용한다.
- `website_inquiries`: anon은 INSERT만 허용하고 SELECT/UPDATE/DELETE 권한은 주지 않는다.
- 홈페이지 문의 INSERT 정책은 `source='website'`, `privacy_consent=true`, 빈 honeypot, 필수 필드 길이 조건을 확인한다.
- 인증된 활성 직원만 포트폴리오 CRUD 및 문의 조회를 할 수 있다.
- 트리거 함수는 `private` 스키마에 두고 `SECURITY DEFINER`, 빈 `search_path`, 명시적 스키마명을 사용한다.
- 트리거 함수에 대한 `PUBLIC`, `anon`, `authenticated` 직접 EXECUTE 권한을 회수한다.
- 공개 브라우저에는 service role/secret key를 절대 넣지 않는다. 기존 publishable key만 사용한다.

## 실패 처리

- 포트폴리오 API가 실패하면 홈페이지는 기본 플레이스홀더 카드를 보여주되 나머지 화면은 정상 표시한다.
- 문의 제출 실패 시 입력값은 유지하고 오류 메시지를 보여준다.
- 문의 트리거가 ERP 동기화에 실패하면 전체 INSERT 트랜잭션을 실패시켜 고객에게 성공으로 표시하지 않는다.

## 테스트

- `website-public-domain.js`: 전화번호 정규화, 폼 payload 생성, URL 안전성, 포트폴리오 정규화
- `website-admin-domain.js`: ERP 프로젝트에서 공개 안전 필드만 추출되는지, 고객명/전화번호가 결과 객체에 없는지
- `website-db-security.test.js`: migration SQL에 RLS, 최소 GRANT, anon insert-only, private security-definer trigger, 직접 EXECUTE revoke, sync_data anon 미개방이 명시돼 있는지
- `supabase/tests/website_public_security.sql`: rollback 안에서 anon 공개 SELECT/문의 INSERT/문의 SELECT 차단/ERP 상담 자동 편입을 검증
