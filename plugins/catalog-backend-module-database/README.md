# Catalog Database Module

`@internal/plugin-catalog-backend-module-database`

Backstage catalog 용 SQL/Knex 기반 location processor 를 등록하는 backend module 패키지다.

## 책임

- `Location.spec.type: database` 처리
- `Location.spec.x-database` inline mapping 스펙 해석
- Knex 기반 SQL row 조회
- SQL row 를 Backstage entity 로 변환

## 구현 위치

- entrypoint: `src/index.ts`
- processor: `src/processor.ts`

## 사용 예시

1. backend 에 module 을 로드한다.

```ts
backend.add(import('@internal/plugin-catalog-backend-module-database'));
```

2. `catalog.locations` 에 database Location 엔티티 파일을 bootstrap 한다.

```yaml
catalog:
  locations:
    - type: file
      target: ./examples/database-locations.yaml
      rules:
        - allow: [Location, Component]
```

3. `Location` 엔티티에서 SQL row -> entity mapping 을 inline 으로 정의한다.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: external-projects-database
spec:
  type: database
  target: external-projects-database
  x-database:
    client: better-sqlite3
    connection:
      filename: /tmp/external-project-metadata.db
    tableName: external_project_metadata
    where:
      - column: source_name
        equals: external-projects
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

현재 `x-database.client` 는 `better-sqlite3`, `pg` 를 지원한다. 조회는 Knex 로
수행되므로, 향후 SQL backend 확장은 `client` / `connection` 계약을 유지한 채
넓힐 수 있다.
