# 전 직원 자료 공유 및 휴대전화 푸시 알림 설계

## 목적

기존 직원 가입·대표 승인 흐름을 그대로 사용하면서, 승인된 직원이 다함 ERP의 모든 업무 자료를 함께 열람·등록·수정하도록 한다. 모든 업무 항목의 등록·수정·삭제와 일정 리마인드를 승인된 전 직원의 휴대전화에 웹 푸시로 전달한다. 삭제는 대표 또는 해당 현장의 지정 담당자만 수행할 수 있고 모든 변경은 감사 이력으로 남긴다.

## 확정 요구사항

- 기존 Supabase Auth 회원가입과 `profiles.is_active` 대표 승인 절차를 재사용한다.
- 승인된 직원은 상담, 실측, 견적, 계약, 일정, 공정, 발주, 정산, 시방서, 도면, 사진, 준공, 하자보증서, AS 및 첨부문서를 모두 공유한다.
- 승인된 직원은 모든 공유 항목을 등록·열람·수정할 수 있다.
- 삭제는 `owner` 또는 해당 현장에 지정된 담당자만 가능하다.
- 모든 항목의 등록·수정·삭제 알림은 승인된 전 직원에게 즉시 푸시한다.
- 일정 시작 1시간 전 알림과 시간 없는 종일 일정의 당일 오전 7시 알림도 승인된 전 직원에게 보낸다.
- 알림을 누르면 변경된 항목의 상세 화면으로 이동한다.
- 같은 항목을 짧은 시간에 반복 수정하면 하나의 알림으로 묶되 변경 이력은 각각 보존한다.
- 아이폰은 홈 화면 설치 후, 안드로이드는 설치 또는 브라우저 권한 허용 후 푸시를 받는다.
- 모든 시간 계산과 알림 표시는 `Asia/Seoul`을 기준으로 한다.

## 현재 구조

애플리케이션은 빌드 없는 정적 HTML/JavaScript이며 `auth.js`가 Supabase Auth와 `profiles` 승인 상태를 공통 관리한다. 업무 데이터 대부분은 브라우저의 localStorage를 캐시로 사용하면서 Supabase `sync_data`의 키별 JSON 문자열로 동기화한다. 직원 역할은 `owner`, `admin`, `staff`이며 직원관리 화면은 이미 존재한다.

현재 방식은 페이지별 저장 함수가 제각각이고 한 `sync_data` 행 안에 여러 업무 레코드가 배열로 들어간다. 따라서 `sync_data` 행 변경만 감지해서는 어떤 상담·견적·문서가 바뀌었는지 정확히 알기 어렵다. 알림과 감사 이력을 빠짐없이 남기려면 각 업무 저장 시 의미 있는 변경 이벤트를 공통 형식으로 기록해야 한다.

## 검토한 접근

### 1. 각 화면에서 푸시 서비스 직접 호출

구현은 빠르지만 페이지별 누락 가능성이 높고, 브라우저에 발송 자격 증명을 둘 수 없으며, 저장은 성공했지만 알림 기록이 실패하는 불일치가 생긴다. 전체 항목 보장 요구에 맞지 않아 사용하지 않는다.

### 2. `sync_data` 트리거에서 JSON 전체 비교

서버가 모든 변경을 관찰할 수 있지만 키마다 JSON 구조가 다르고 대용량 사진·문서 메타데이터 비교 비용이 크다. 사용자에게 보여 줄 현장명과 변경 필드를 안정적으로 복원하기도 어렵다. 보조 안전망으로는 쓸 수 있지만 주 경로로 사용하지 않는다.

### 3. 공통 업무 이벤트 발행 + 서버 푸시 발송함

모든 페이지가 저장 성공 후 공통 이벤트 API에 `create`, `update`, `delete` 이벤트를 기록한다. 서버는 이벤트를 감사 이력과 푸시 발송함에 원자적으로 넣고 Edge Function이 구독 단말에 전달한다. 저장 의미가 명확하고 재시도·중복 제거·감사가 가능하다. 이 방식을 채택한다.

## 데이터 모델

새 테이블은 Data API 노출을 명시적으로 허용하고 RLS를 활성화한다.

### `company_memberships`

현재는 한 회사지만 회사 경계를 명시해 다른 업체 데이터가 섞이지 않게 한다.

- `company_id uuid`
- `profile_id uuid references profiles(id)`
- `status text`: `pending`, `active`, `revoked`
- `approved_by uuid`
- `approved_at timestamptz`
- 고유키: `(company_id, profile_id)`

기존 활성 직원은 기본 다함 회사의 `active` 회원으로 백필한다. 신규 가입자는 기존 `profiles.is_active` 승인 동작과 함께 회원 상태가 활성화된다.

### `project_assignments`

- `company_id uuid`
- `project_id text`: 기존 현장 ID
- `profile_id uuid`
- `assigned_by uuid`
- `created_at timestamptz`
- 고유키: `(company_id, project_id, profile_id)`

화면에 저장된 담당자 이름 문자열과 별도로 실제 권한은 프로필 UUID로 판단한다. 현장 담당자를 바꾸면 삭제 권한도 즉시 바뀐다.

### `activity_events`

- `id uuid`
- `company_id uuid`
- `actor_id uuid`
- `project_id text null`
- `entity_type text`: `consult`, `measurement`, `estimate`, `contract`, `schedule`, `order`, `payment`, `spec`, `drawing`, `photo`, `completion`, `warranty`, `as`, `document`, `other`
- `entity_id text`
- `action text`: `create`, `update`, `delete`
- `title text`
- `summary text`
- `changed_fields jsonb`
- `target_url text`
- `dedupe_key text`
- `created_at timestamptz`

승인된 직원은 회사 이벤트를 읽을 수 있다. 이벤트 생성은 서버 RPC가 현재 로그인 사용자를 `actor_id`로 강제하며 클라이언트가 다른 사용자 ID를 위조할 수 없게 한다. 이벤트는 삭제하지 않고 감사 기록으로 보존한다.

### `push_subscriptions`

- `id uuid`
- `company_id uuid`
- `profile_id uuid`
- `endpoint text`
- `p256dh text`
- `auth text`
- `device_label text`
- `user_agent text`
- `is_active boolean`
- `last_seen_at timestamptz`
- `created_at timestamptz`
- 고유키: `endpoint`

사용자는 자신의 구독만 등록·해제할 수 있다. 발송 서버만 같은 회사의 활성 구독을 읽는다. 만료되거나 404/410을 반환한 구독은 비활성화한다.

### `notification_outbox`

- `id uuid`
- `company_id uuid`
- `event_id uuid null`
- `kind text`: `activity`, `schedule_one_hour`, `all_day_morning`
- `title text`
- `body text`
- `target_url text`
- `dedupe_key text unique`
- `send_after timestamptz`
- `status text`: `pending`, `sending`, `sent`, `partial`, `failed`
- `attempt_count integer`
- `last_error text`
- `created_at`, `sent_at timestamptz`

발송함은 동일 이벤트의 중복 푸시를 막고 실패 재시도를 가능하게 한다.

## 권한과 삭제

- 회사 회원 상태가 `active`인 사용자만 공유 데이터와 이벤트를 읽고 등록·수정할 수 있다.
- 삭제 RPC는 현재 사용자가 `owner`인지, 또는 `project_assignments`에 해당 현장 담당자로 존재하는지 서버에서 확인한다.
- `admin`이라는 이유만으로 삭제 권한을 주지 않는다.
- 기존 상담 삭제 RPC와 페이지별 직접 삭제 경로는 공통 삭제 권한 검사로 교체한다.
- localStorage에서 먼저 삭제하지 않는다. 서버 삭제 성공 후 로컬 캐시를 갱신한다.
- 1차 구현은 기존 JSON 데이터를 실제로 제거하되 삭제 이벤트에 최소 식별 정보와 변경자를 영구 보존한다. 30일 복구 휴지통은 별도 후속 범위로 두며, 이번 확정 요구에는 포함하지 않는다.

## 공통 이벤트 흐름

1. 직원이 업무 화면에서 항목을 저장한다.
2. 기존 localStorage 캐시와 Supabase `sync_data` 저장이 성공한다.
3. 공통 `daham-activity.js`가 현재 사용자, 현장, 항목 종류, 변경 필드, 상세 URL을 정규화한다.
4. 인증된 RPC가 `activity_events`와 `notification_outbox`를 한 트랜잭션에서 생성한다.
5. Edge Function이 발송함을 가져와 같은 회사의 활성 구독 전체에 웹 푸시를 보낸다.
6. 휴대전화에서 알림을 누르면 서비스 워커가 `target_url`을 열거나 이미 열린 ERP 창을 전면으로 가져온다.

동일한 `entity_type`, `entity_id`, `action`이 짧은 시간 안에 반복되면 발송함의 `dedupe_key`로 푸시는 한 건으로 갱신한다. 감사 이벤트는 매번 남긴다. 저장은 성공했지만 이벤트 발행이 실패하면 로컬 재시도 큐에 넣고 화면 상단에 `알림 전송 대기` 상태를 표시한다.

## 일정 리마인드

Supabase Cron이 5분마다 리마인드 Edge Function을 호출한다. 함수는 모든 현장의 일정을 읽어 다음을 발송함에 넣는다.

- 시작 시각이 55~65분 뒤인 시간 일정: 전 직원에게 1시간 전 알림
- 시작 시각이 없는 오늘 종일 일정: 한국시간 오전 7시 전 직원 알림

`schedule_id + reminder_kind + occurrence_date`를 중복 키로 사용해 같은 알림이 한 번만 발송되게 한다. 일정 시간이 변경되면 기존 예정 알림은 무효화하고 새 시각을 기준으로 다시 계산한다.

## 휴대전화 설치와 권한

- `manifest.json`에 앱 이름, 아이콘, 시작 URL, `display: standalone`을 설정한다.
- 서비스 워커는 푸시 수신, 알림 표시, 알림 클릭 이동만 담당한다.
- 로그인 후 승인된 직원에게 `휴대전화 알림 설정` 안내를 한 번 보여 준다.
- 안드로이드는 설치 또는 브라우저에서 알림 허용을 요청한다.
- 아이폰은 먼저 홈 화면 추가 방법을 안내하고 홈 화면 앱으로 실행한 뒤 알림 권한을 요청한다.
- 사용자가 직접 누른 `알림 받기` 버튼에서만 권한을 요청한다. 거부 시 반복 팝업을 띄우지 않고 설정 화면에서 다시 시도하게 한다.
- 직원관리 화면에서 직원별 알림 연결 여부와 마지막 연결 시각을 대표가 볼 수 있게 한다. 구독 주소나 암호 키는 화면에 노출하지 않는다.

## 알림 문구

등록·수정·삭제 알림은 전 직원에게 다음 정보를 보여 준다.

- 앱 이름: `다함 ERP`
- 상태: `[등록]`, `[수정]`, `[삭제]`, `[1시간 전]`, `[오늘 일정]`
- 현장명과 업무 항목
- 일정이면 날짜와 시간
- 변경한 직원 이름

예: `[수정] 세영 청마루아파트 · 상담 / 14:00 → 15:30 / 변경자: 홍길동`

민감한 견적 금액이나 고객 전화번호는 잠금화면 본문에 표시하지 않고, 로그인 후 상세 화면에서 확인한다.

## 구성 요소와 파일 경계

- `auth.js`: 기존 승인 흐름과 회사 회원 상태 연결
- `daham-activity.js`: 페이지 공통 이벤트 생성, 요약, 재시도 큐
- `daham-push.js`: 설치 상태, 권한, 구독 등록 UI
- `service-worker.js`: 푸시 표시와 클릭 이동
- `manifest.json`: 설치 가능한 ERP 앱 정보
- 각 업무 HTML/도메인 파일: 저장·삭제 성공 지점에서 공통 이벤트 호출
- `supabase/migrations/*`: 회사 회원, 담당자, 이벤트, 구독, 발송함, RLS, RPC, Cron 정의
- `supabase/functions/send-push/*`: VAPID 기반 웹 푸시 발송과 실패 구독 정리
- `supabase/functions/schedule-reminders/*`: 리마인드 후보 생성
- `employees.html`: 승인·중지와 알림 연결 상태
- 일정 및 현장 화면: 프로필 UUID 기반 담당자 지정

## 보안

- VAPID 비밀키와 Supabase secret/service key는 Edge Function Secret에만 저장하고 프론트에 포함하지 않는다.
- 공개키만 브라우저 구독 생성에 사용한다.
- 새 공개 스키마 테이블은 명시적 `GRANT`와 RLS를 함께 적용한다.
- `TO authenticated`만 사용하는 정책을 만들지 않고 활성 회사 회원 조건을 함께 검사한다.
- UPDATE 정책에는 `USING`과 `WITH CHECK`를 모두 둔다.
- 권한은 `user_metadata`가 아니라 RLS로 보호된 `profiles`, `company_memberships`, `project_assignments`로 판단한다.
- 권한 RPC는 `auth.uid()`를 직접 확인하고 필요한 최소 함수만 `authenticated`에 실행 권한을 준다.
- 푸시 endpoint와 키는 일반 직원이 다른 사용자의 값을 조회할 수 없게 한다.
- 승인 해제 시 구독을 비활성화하고 이후 푸시 대상에서 즉시 제외한다.

## 오류 처리와 관찰성

- 저장 실패 시 이벤트와 푸시를 만들지 않는다.
- 이벤트 기록 실패 시 저장 내용을 되돌리지 않고 로컬 재시도 큐에 보존한다.
- 발송 실패는 지수 백오프로 제한 횟수 재시도하고 최종 오류를 발송함에 남긴다.
- 일부 단말만 실패하면 성공 단말을 재발송하지 않고 실패 단말만 재시도한다.
- 대표는 알림 설정 화면에서 최근 발송 성공·실패와 활성 단말 수를 확인한다.
- Edge Function 로그에 고객 전화번호, 견적 금액, 구독 암호 키를 남기지 않는다.

## 테스트 전략

- 도메인 단위 테스트: 이벤트 정규화, 한국시간 리마인드 판정, 중복 키, 알림 문구, 민감정보 제외
- 인증 테스트: 미승인·중지 직원 차단, 활성 회사 직원 공유, 타 회사 접근 차단
- RLS/SQL 테스트: 전 직원 읽기·쓰기, owner/지정 담당자 삭제 허용, 일반 직원 삭제 거부, 담당자 변경 즉시 반영
- 서비스 워커 테스트: 푸시 표시 정보와 클릭 URL 검증
- Edge Function 테스트: 전체 활성 구독 발송, 만료 구독 비활성화, 부분 실패 재시도
- 페이지 회귀 테스트: 모든 업무 저장·수정·삭제 경로가 공통 이벤트를 호출하는지 정적 목록으로 검증
- 일정 테스트: 1시간 전 및 오전 7시 전 직원 알림, 시간 변경, 중복 방지
- 전체 `npm test`, SQL 테스트, `git diff --check`, 비밀키 스캔을 통과한 후 배포한다.

## 배포 순서

1. 데이터베이스 테이블·RLS·RPC를 먼저 배포한다.
2. Edge Function Secret과 VAPID 키를 설정하고 발송 함수를 배포한다.
3. Cron과 리마인드 함수를 활성화한다.
4. 정적 웹 파일과 서비스 워커를 배포한다.
5. 대표 계정 한 대에서 구독·즉시 알림·리마인드·클릭 이동을 시험한다.
6. 직원 계정으로 공유 권한과 삭제 거부를 시험한 뒤 전 직원에게 설치 안내를 노출한다.

## 범위 밖

- 앱스토어·플레이스토어용 네이티브 앱
- SMS 또는 카카오 알림톡
- 직원별 알림 종류 끄기
- 고객용 외부 알림
- 30일 휴지통 복구 UI

