# Catalog Extensions Module

`@internal/plugin-catalog-backend-module-extensions`

catalog 확장을 한 곳에 모아 둔 backend module 패키지다.

현재 이 패키지는 다음 4가지 확장을 함께 등록한다.

- `Domain` 기반 `project` 역할 확장
- `System` 기반 `edge-stack` 역할 확장
- `Location` 기반 `x-database` inline mapped source 확장
- `Location` 기반 `x-dynamodb` inline mapped source 확장

## 책임

- 확장 엔티티별 validation
- entity ref normalization
- relation emission
- inline mapped location source ingestion
- 확장별 processor registration

## 구조

```text
src/
  index.ts
  utils/
    entity-ref-utils.ts
    relation-utils.ts
  entity-extensions/
    domain/
      project/
        types.ts
        utils.ts
        processor.ts
        processor.test.ts
    system/
      edge-stack/
        types.ts
        utils.ts
        processor.ts
        processor.test.ts
    location/
      database/
        types.ts
        templates.ts
        processor.ts
        templates.test.ts
        processor.test.ts
      dynamodb/
        types.ts
        templates.ts
        processor.ts
        processor.test.ts
```

## 네임스페이스 규칙

- `entity-extensions/<base-entity>/<role>/types.ts`
  확장 role 식별 상수와 타입 정의
- `entity-extensions/<base-entity>/<role>/utils.ts`
  validation, normalization, relation emission 등 role 로직
- `entity-extensions/<base-entity>/<role>/processor.ts`
  Backstage `CatalogProcessor` 구현
- `utils/`
  여러 확장에서 공유하는 일반 유틸

`routesTrafficTo` 같은 edge-stack 전용 개념은 공용 유틸에 두지 않고
`system/edge-stack` 네임스페이스 안에 둔다.

## 등록 방식

entrypoint는 [src/index.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/index.ts) 하나다.

여기서 다음 processor를 모두 등록한다.

- `ProjectDomainProcessor`
- `EdgeStackSystemProcessor`
- `DatabaseLocationProcessor`
- `DynamoDbLocationProcessor`

새 catalog 확장을 추가할 때는 같은 패턴으로 `entity-extensions/` 아래에 배치하고
`src/index.ts`에서 등록한다.

## 확장 상세

### Domain / project

위치:

- [types.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/domain/project/types.ts)
- [utils.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/domain/project/utils.ts)
- [processor.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/domain/project/processor.ts)

역할:

- `metadata.annotations.kabang.cloud/domain-role=project` 판별
- `spec.owner`, `spec.team` 정규화
- component `kabang.cloud/project` annotation 정규화
- `ownedBy`, `ownerOf`, `partOf`, `hasPart` relation 생성

## 엔티티 스펙

```yaml
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: some-project-name
  title: Some Project
  description: Team-managed project metadata
  annotations:
    kabang.cloud/domain-role: project
spec:
  owner: user:default/alice
  team: group:default/platform
```

짧은 ref 도 허용한다. 예를 들어 `owner: alice`, `team: platform` 으로 들어오면
processor 가 각각 `user:default/alice`, `group:default/platform` 으로 정규화한다.

### System / edge-stack

위치:

- [types.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/system/edge-stack/types.ts)
- [utils.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/system/edge-stack/utils.ts)
- [processor.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/system/edge-stack/processor.ts)

역할:

- `metadata.annotations.kabang.cloud/system-role=edge-stack` 판별
- `spec.x-edgestack.*` 정규화
- `System(edge-stack) -> Domain/Resource/Component` relation 생성
- edge-stack 전용 custom relation 이름 보유

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: shared-public-web-entry
  title: TLS/mTLS Gateway
  annotations:
    kabang.cloud/system-role: edge-stack
spec:
  owner: group:default/platform
  type: edge-stack
  lifecycle: production
  x-edgestack:
    team: group:default/platform
    pattern: tls-mtls-gateway
    projects:
      - domain:default/guest-portal
    attachments:
      - role: dns
        kind: route53
        entityRef: resource:default/public-hosted-zone
    hops:
      - role: ingress
        kind: alb
        entityRef: resource:default/public-alb
    targets:
      - entityRef: component:default/guest-portal-api
        trafficType: http
```

### Location / database

위치:

- [types.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/database/types.ts)
- [templates.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/database/templates.ts)
- [processor.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/database/processor.ts)

역할:

- `Location.spec.type=database` 처리
- `spec.x-database` inline target 인코딩
- Knex 기반 row fetch
- row -> catalog entity 템플릿 렌더링

### Location / dynamodb

위치:

- [types.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/dynamodb/types.ts)
- [templates.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/dynamodb/templates.ts)
- [processor.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/dynamodb/processor.ts)

역할:

- `Location.spec.type=dynamodb` 처리
- `spec.x-dynamodb` inline target 인코딩
- DynamoDB query 기반 row fetch
- row -> catalog entity 템플릿 렌더링

## 테스트

각 확장은 같은 디렉토리 안에서 테스트한다.

- domain/project:
  [processor.test.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/domain/project/processor.test.ts)
- system/edge-stack:
  [processor.test.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/system/edge-stack/processor.test.ts)
- location/database:
  [templates.test.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/database/templates.test.ts)
  [processor.test.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/database/processor.test.ts)
- location/dynamodb:
  [processor.test.ts](/Users/joonjeong/workspace/backstage/plugins/catalog-backend-module-extensions/src/entity-extensions/location/dynamodb/processor.test.ts)
