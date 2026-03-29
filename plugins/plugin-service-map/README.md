# plugin-service-map

Project 서비스 맵 frontend visualization package.

Current exports:

- `ProjectServiceMap`
- `buildProjectServiceMapModel`
- `getProjectEntitiesForKindFilter`
- `belongsToProject`

This package contains:

- reusable service map rendering
- selected component panel
- inventory table view
- service map layout/model helpers

Catalog API wiring is intentionally outside this package. App-level containers are
expected to fetch catalog entities and pass a `ProjectServiceMapModel` into
`ProjectServiceMap`.

문서:

- 상세 설계: [docs/architecture.md](/Users/joonjeong/workspace/backstage/plugins/plugin-service-map/docs/architecture.md)
- 리포지토리 ADR: [/Users/joonjeong/workspace/backstage/docs/0001-project-service-map-adr.md](/Users/joonjeong/workspace/backstage/docs/0001-project-service-map-adr.md)
- `EdgeStack` 스키마: [/Users/joonjeong/workspace/backstage/docs/edge-stack-schema.md](/Users/joonjeong/workspace/backstage/docs/edge-stack-schema.md)
