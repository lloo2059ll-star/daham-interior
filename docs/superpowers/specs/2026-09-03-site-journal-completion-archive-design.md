# 현장일지 및 준공자료 보관 설계

## 목적

현장일지의 공사내용과 원본 사진을 안전하게 저장하고, 현장 준공 시 날짜와 공종별로 정리된 PDF 및 ZIP 보관본을 생성한다. 사진 증가가 ERP의 로그인, 견적, 일정, 수금 등 다른 기능의 저장과 로딩에 영향을 주지 않아야 한다.

## 핵심 원칙

- 이미지 바이너리와 Base64 문자열을 `sync_data` 또는 브라우저 `localStorage`에 저장하지 않는다.
- 원본 사진은 비공개 Supabase Storage 버킷에 파일 단위로 저장한다.
- PostgreSQL에는 일지, 파일 경로, 크기, MIME 형식, 체크섬 등 작은 메타데이터만 행 단위로 저장한다.
- 사진 업로드와 현장일지 저장을 분리해 사진 한 장의 실패가 ERP 전체 저장을 막지 않게 한다.
- 생성된 ZIP을 검증하기 전에는 원본을 삭제하거나 변경하지 않는다.
- 파일 경로는 항상 새 UUID를 사용한다. 동일 경로 덮어쓰기는 사용하지 않는다.

## 사용자 흐름

### 현장일지 작성

1. 사용자가 현장, 날짜, 작성자, 공종, 작업내용을 입력한다.
2. 사진을 선택하면 브라우저는 파일 형식과 크기만 우선 검사한다.
3. 원본 사진은 Storage에 개별 업로드한다. 목록용 썸네일은 별도 객체로 생성하거나 이미지 변환 URL을 사용한다.
4. 각 업로드가 성공할 때마다 사진 메타데이터 행을 생성한다.
5. 일지 본문은 사진과 독립적으로 저장되며, 업로드 중인 사진은 `uploading`, 성공은 `ready`, 실패는 `failed` 상태로 표시한다.
6. 네트워크가 끊기면 일지 본문은 로컬 임시 초안에 남고, 사용자가 다시 연결했을 때 실패한 사진만 재시도한다.

### 준공자료 생성

1. 권한이 있는 사용자가 현장에서 `준공자료 생성`을 누른다.
2. 서버는 해당 현장의 일지와 `ready` 상태 원본 사진 수를 고정한 스냅샷을 만든다.
3. 백그라운드 작업이 날짜·공종 순서의 현장일지 PDF를 생성한다.
4. PDF, 원본 사진, `manifest.json`을 ZIP으로 묶는다.
5. ZIP SHA-256 체크섬, 파일 수, 전체 바이트 수를 계산하고 스냅샷과 대조한다.
6. 검증 성공 시 상태를 `ready`로 바꾸고 `PDF 보기`, `ZIP 다운로드`를 활성화한다.
7. 실패하면 상태를 `failed`로 남기고 원본은 그대로 유지하며 재시도할 수 있게 한다.

## 보관 파일 구조

```text
삼구트리니엔_준공자료_2026-09-03.zip
├─ 삼구트리니엔_현장일지.pdf
├─ manifest.json
└─ photos/
   ├─ 2026-08-27_철거공사/
   │  ├─ 001_<원본파일명>.jpg
   │  └─ 002_<원본파일명>.heic
   └─ 2026-08-28_목공공사/
      └─ 001_<원본파일명>.jpg
```

`manifest.json`에는 현장 ID, 아카이브 버전, 생성 시각, 일지 ID, 사진 ID, Storage 경로, 원본 파일명, MIME 형식, 바이트 수, SHA-256 체크섬을 기록한다.

## 데이터 모델

### `site_journals`

- `id uuid primary key`
- `company_id uuid not null`
- `project_id text not null`
- `work_date date not null`
- `trade text`
- `content text not null default ''`
- `visit_type text not null`
- `author_id uuid not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `version bigint not null default 1`
- `deleted_at timestamptz`

인덱스는 `(company_id, project_id, work_date desc)`와 활성 행에 대한 부분 인덱스 `where deleted_at is null`을 둔다.

### `site_journal_photos`

- `id uuid primary key`
- `company_id uuid not null`
- `journal_id uuid not null references site_journals(id)`
- `storage_path text not null unique`
- `thumbnail_path text`
- `original_name text not null`
- `mime_type text not null`
- `byte_size bigint not null`
- `sha256 text not null`
- `width integer`
- `height integer`
- `status text not null`
- `sort_order integer not null`
- `created_by uuid not null`
- `created_at timestamptz not null`
- `deleted_at timestamptz`

인덱스는 `(journal_id, sort_order)`와 `(company_id, status)`를 둔다.

### `completion_archives`

- `id uuid primary key`
- `company_id uuid not null`
- `project_id text not null`
- `status text not null`
- `snapshot_at timestamptz not null`
- `journal_count integer not null`
- `photo_count integer not null`
- `source_bytes bigint not null`
- `pdf_path text`
- `zip_path text`
- `zip_bytes bigint`
- `zip_sha256 text`
- `error_code text`
- `error_message text`
- `created_by uuid not null`
- `created_at timestamptz not null`
- `completed_at timestamptz`

동일 현장의 요청 중 `queued` 또는 `processing` 상태는 하나만 허용한다. 완성본은 버전별로 보존한다.

## Storage 구조

- 비공개 버킷 `site-journal-originals`
- 비공개 버킷 `site-journal-thumbnails`
- 비공개 버킷 `completion-archives`
- 원본 경로: `{company_id}/{project_id}/{journal_id}/{photo_id}/{original_name}`
- 준공 경로: `{company_id}/{project_id}/{archive_id}/...`

클라이언트에는 공개 URL을 저장하지 않는다. 화면 표시와 다운로드 시 짧은 만료시간의 signed URL을 발급한다.

## 업로드 제한과 웹앱 보호

- 허용 형식: JPEG, PNG, WebP, HEIC/HEIF. 파일 확장자뿐 아니라 MIME과 파일 시그니처를 검사한다.
- 기본 제한: 사진 한 장 25MB, 일지 한 건 20장. 운영 설정에서 더 낮게 조정할 수 있다.
- 6MB 이하 파일은 표준 업로드, 그보다 큰 원본은 재개 가능한 업로드를 사용한다.
- 동시 업로드는 최대 3개로 제한해 모바일 메모리와 네트워크 폭주를 막는다.
- 원본 전체를 Base64로 메모리에 만들지 않는다. `File`/`Blob`을 그대로 전송한다.
- 목록에서는 원본 대신 320px 안팎 썸네일만 지연 로딩한다.
- 무한 목록 대신 현장·기간 단위 페이지네이션을 사용한다.
- 업로드 진행률, 취소, 개별 재시도를 제공한다.
- 브라우저 로컬에는 사진 원문을 저장하지 않고 업로드 작업 ID와 일지 초안만 제한적으로 저장한다.
- 사진 업로드 장애가 견적·일정·수금 등 다른 `sync_data` 저장을 차단하지 않도록 별도 모듈과 테이블을 사용한다.

## 동시성 및 데이터 무결성

- 일지 수정은 `version`을 이용한 낙관적 잠금으로 덮어쓰기를 방지한다.
- 사진은 UUID 기반 불변 경로를 사용하며 수정 시 새 객체를 만든다.
- DB 행 생성 실패 후 남은 Storage 객체는 정리 작업이 회수한다.
- DB 행은 있지만 Storage 객체가 없는 경우 `missing`으로 표시하고 관리자 점검 목록에 올린다.
- 준공 작업은 고유 idempotency key로 중복 실행을 방지한다.
- ZIP 생성 작업은 체크포인트를 기록해 재시도 시 완료된 단계를 재사용한다.

## 권한과 보안

- 모든 업무 테이블에 RLS를 적용하고 `company_id`와 활성 사용자 여부를 함께 확인한다.
- 현장 접근 권한이 있는 직원만 일지와 사진을 조회한다.
- 사진 등록자는 업로드할 수 있고, 삭제는 대표·관리자 또는 정책상 허용된 담당자만 수행한다.
- 준공자료 생성과 삭제 권한은 대표·관리자로 제한한다.
- Storage `storage.objects` 정책도 동일한 회사·현장 경계를 강제한다.
- 브라우저에는 service role 키를 절대 노출하지 않는다.
- signed URL은 짧게 만료시키며 다운로드 감사 로그를 남긴다.

## 장애 격리 및 복구

- ERP 공통 초기화는 사진 목록이나 Storage 응답을 기다리지 않는다.
- 사진 영역은 실패 시 독립적인 오류 상태를 표시하고 나머지 현장일지는 계속 사용 가능해야 한다.
- 아카이브 생성은 브라우저가 아니라 서버 백그라운드 작업에서 수행한다.
- 작업 제한시간을 넘으면 실패 상태와 마지막 체크포인트를 저장한다.
- 원본, 메타데이터, 아카이브의 정합성을 주기적으로 검사하고 결과를 관리자 화면에 제공한다.
- DB 백업과 Storage 객체 백업은 별개로 구성한다. DB 백업만으로 원본 사진이 복구된다고 가정하지 않는다.

## 보관 정책

- 공사 진행 중 원본과 썸네일을 유지한다.
- 준공 후에도 원본을 유지한다.
- ZIP은 다운로드 편의와 증빙을 위한 불변 보관본이며 원본을 대체하지 않는다.
- 보관 용량 임계치 70%, 85%, 95%에서 관리자 경고를 제공한다.
- 향후 삭제 정책을 도입할 때는 유예기간, 법적 보존 예외, 이중 승인과 감사 로그를 필수로 한다.

## 화면 구성

### 준공자료 생성 화면

- `현장일지 확인 → 원본 사진 정리 → PDF 보고서 생성 → ZIP 보관 완료` 진행 상태
- 일지 수, 사진 수, 예상 원본 용량, 생성 파일명 표시
- PDF, 원본 사진, JSON, 무결성 검사 포함 여부 표시
- 생성 완료 전 원본이 삭제되지 않는다는 안내

### 준공자료 열람 화면

- 준공일, 일지 수, 사진 수, 보관 용량, 무결성 상태
- `PDF 보기`, `ZIP 다운로드`
- 날짜별 기록, 공종별 사진, 원본 사진, 복구용 데이터 탐색
- PDF 미리보기에서 공사내용과 썸네일을 함께 표시

## 단계적 전환

1. 새 테이블·버킷·RLS와 업로드 모듈을 추가한다.
2. 신규 현장일지만 새 구조에 저장한다.
3. 기존 Base64 일지 데이터는 배치 마이그레이션으로 Storage 객체와 행 데이터로 분리한다.
4. 항목별 체크섬과 개수 검증 후에만 기존 Base64를 제거한다.
5. 일정 기간 이중 읽기를 제공한 뒤 구형 `daham_worklog_v1` 경로를 읽기 전용으로 전환한다.
6. 준공 PDF 및 ZIP 백그라운드 생성 기능을 활성화한다.

## 검증 기준

- 25MB 원본 20장 등록 중 일부가 실패해도 성공한 파일과 일지 본문이 보존된다.
- 네트워크 중단 후 실패한 사진만 재시도된다.
- 두 직원이 같은 일지를 수정하면 조용히 덮어쓰지 않고 충돌을 알린다.
- 사진 1만 장이 있는 회사에서도 대시보드와 견적 화면은 사진 데이터를 내려받지 않는다.
- 준공 ZIP의 파일 수, 전체 크기, 개별 체크섬이 스냅샷과 일치한다.
- ZIP 생성 실패 또는 브라우저 종료에도 원본이 유지된다.
- 다른 회사 또는 권한 없는 직원은 Storage 경로나 signed URL을 통해 접근할 수 없다.
- 기존 Base64 데이터 마이그레이션은 검증 실패 시 원본 값을 유지하고 재실행할 수 있다.

