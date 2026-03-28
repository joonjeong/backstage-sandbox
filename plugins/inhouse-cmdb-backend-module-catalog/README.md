# Inhouse CMDB Catalog Module

`@internal/plugin-inhouse-cmdb-backend-module-catalog`

Inhouse CMDB 데이터를 Backstage Software Catalog source 로 연결하는 backend module 패키지다.

## 책임

- `catalog` plugin 에 entity provider 등록
- `inhouse-cmdb.catalogSource.enabled` 설정에 따라 source 활성화 여부 결정
- processing error 수집 및 로그 출력

## 구현 위치

- entrypoint: `src/index.ts`

## 의존 관계

- 공통 저장소/엔티티 생성 로직은 `@internal/inhouse-cmdb-node` 에서 가져온다.
- `@backstage/plugin-catalog-node` 의 `catalogProcessingExtensionPoint` 를 사용한다.
- backend 앱에서는 `packages/backend/src/index.ts` 에서 `backend.add(import('@internal/plugin-inhouse-cmdb-backend-module-catalog'))` 로 로드한다.

## 수정 가이드

- Catalog에 어떤 엔티티를 넣을지 바꾸려면 먼저 `@internal/inhouse-cmdb-node` 의 provider/entity 생성 로직을 검토한다.
- Catalog source enable/disable 정책이나 processing error 처리 규칙은 이 패키지에서 관리한다.
- Catalog와 무관한 HTTP API 수정은 backend plugin 패키지에서 처리한다.
