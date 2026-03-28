# Inhouse CMDB Scaffolder Module

`@internal/plugin-inhouse-cmdb-backend-module-scaffolder`

Inhouse CMDB 도메인용 Scaffolder action 을 등록하는 backend module 패키지다.

## 책임

- custom action `inhouse-cmdb:append` 등록
- Scaffolder 입력을 writer 저장소 append 호출로 연결

## 구현 위치

- entrypoint: `src/index.ts`

## 의존 관계

- 공통 저장소/입력 파싱 로직은 `@internal/inhouse-cmdb-node` 에서 가져온다.
- `@backstage/plugin-scaffolder-node` 의 `scaffolderActionsExtensionPoint` 를 사용한다.
- backend 앱에서는 `packages/backend/src/index.ts` 에서 `backend.add(import('@internal/plugin-inhouse-cmdb-backend-module-scaffolder'))` 로 로드한다.

## 수정 가이드

- 템플릿 step action id 를 바꾸면 이 패키지와 `examples/template/inhouse-cmdb-template.yaml` 을 같이 수정해야 한다.
- action input schema 는 이 패키지에서 관리한다.
- 저장소 선택 정책은 `inhouse-cmdb.writer` 설정과 `@internal/inhouse-cmdb-node` repository factory가 담당한다.
