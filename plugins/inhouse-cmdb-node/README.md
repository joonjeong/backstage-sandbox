# Inhouse CMDB Node Library

`@internal/inhouse-cmdb-node`

Inhouse CMDB backend plugin 과 module 들이 공유하는 공통 node-library 패키지다. Backstage plugin/module 경계를 넘는 로직은 이 패키지에 둔다.

## 책임

- writer/catalogSource 저장소 factory
- SQLite / DynamoDB 저장소 구현
- entity provider 및 엔티티 생성 규칙
- 입력 파싱
- processing error in-memory debug store
- 저장소 단위 테스트

## 구현 위치

- exports: `src/index.ts`
- repository: `src/repository.ts`
- provider: `src/provider.ts`
- input parsing: `src/input.ts`
- debug store: `src/debugStore.ts`
- tests: `src/repository.test.ts`

## 왜 별도 패키지인가

- `backend-plugin-module` 이 `backend-plugin` 을 직접 import 하지 않도록 하기 위해서다.
- Catalog module, Scaffolder module, HTTP plugin 이 모두 같은 공통 코드를 재사용할 수 있게 하기 위해서다.
- 팀 커스텀 비즈니스 로직을 Backstage 기본 패키지와 분리하기 위해서다.

## 수정 가이드

- 저장소 구현을 바꾸면 plugin/module 패키지보다 먼저 여기서 수정한다.
- entity annotation, location key, provider name 같은 규칙도 여기서 관리한다.
- 설정 키는 `inhouse-cmdb.writer`, `inhouse-cmdb.catalogSource` 를 기준으로 읽는다.
