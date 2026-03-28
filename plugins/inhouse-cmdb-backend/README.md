# Inhouse CMDB Backend

`@internal/plugin-inhouse-cmdb-backend`

Inhouse CMDB 도메인의 전용 backend plugin 패키지다. 이 패키지는 `project-metadata` 성격의 HTTP API를 `inhouse-cmdb` 명칭으로 노출한다.

## 책임

- `POST /api/inhouse-cmdb/projects`
- `GET /api/inhouse-cmdb/projects/latest`
- `GET /api/inhouse-cmdb/projects/:projectCode/latest`
- `GET /api/inhouse-cmdb/projects/:projectCode/history`
- `GET /api/inhouse-cmdb/debug/catalog-status`
- `GET /api/inhouse-cmdb/debug/processing-errors`

## 구현 위치

- entrypoint: `src/index.ts`
- plugin implementation: `src/service/projectMetadataPlugin.ts`

## 의존 관계

- 공통 로직은 `@internal/inhouse-cmdb-node` 에서 가져온다.
- Catalog나 Scaffolder 확장은 직접 하지 않는다.
- backend 앱에서는 `packages/backend/src/index.ts` 에서 `backend.add(import('@internal/plugin-inhouse-cmdb-backend'))` 로 로드한다.

## 수정 가이드

- HTTP API를 바꿀 때는 이 패키지에서 작업한다.
- 저장소 구현, 엔티티 생성 규칙, 입력 파싱 공통 코드는 `@internal/inhouse-cmdb-node` 에 둔다.
- Catalog ingest 또는 Scaffolder action 변경은 각 module 패키지에서 처리한다.
