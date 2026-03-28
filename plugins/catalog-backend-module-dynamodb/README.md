# Catalog DynamoDB Module

`@internal/plugin-catalog-backend-module-dynamodb`

Backstage catalog 용 DynamoDB location processor 를 등록하는 backend module 패키지다.

## 책임

- `Location.spec.type: dynamodb` 처리
- `Location.spec.x-dynamodb` inline mapping 스펙 해석
- DynamoDB row 를 Backstage entity 로 변환

## 구현 위치

- entrypoint: `src/index.ts`
- processor: `src/processor.ts`

## 사용 예시

1. backend 에 module 을 로드한다.

```ts
backend.add(import('@internal/plugin-catalog-backend-module-dynamodb'));
```

2. `catalog.locations` 에 DynamoDB Location 엔티티 파일을 bootstrap 한다.

```yaml
catalog:
  locations:
    - type: file
      target: ./examples/database-locations.yaml
      rules:
        - allow: [Location, Component]
```

3. `Location` 엔티티에서 DynamoDB row -> entity mapping 을 inline 으로 정의한다.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: external-projects-dynamodb
spec:
  type: dynamodb
  target: external-projects-dynamodb
  x-dynamodb:
    region: us-east-1
    tableName: replace-me-external-metadata
    partitionKey: SOURCE#projects
    sortKeyPrefix: PROJECT#
    updatedAtField: modified_at
    locationKey: 'external:{{ item.entityRef }}'
    entity:
      apiVersion: backstage.io/v1alpha1
      kind: Component
      metadata:
        name: '{{ item.project_code }}'
        title: '{{ item.project_name }}'
        description: '{{ item.project_description }}'
      spec:
        type: external
        lifecycle: '{{ item.lifecycle }}'
        owner: 'group:default/{{ item.owner_group }}'
        system: '{{ item.system }}'
```

이 processor 는 `pk = partitionKey` 와 optional `begins_with(sk, sortKeyPrefix)`
조건으로 row 를 읽고, `entity` template 으로 Backstage entity 를 생성한다.

## 수정 가이드

- DynamoDB query 방식이나 inline 스펙을 바꿀 때는 이 패키지에서 수정한다.
- inhouse-cmdb 고유 규칙과 무관해야 한다.
