# plugin-service-topology

Project 서비스 토폴로지 frontend visualization package.

Current exports:

- `ServiceTopology`
- `buildTopologyModel`
- `getProjectEntitiesForKindFilter`
- `belongsToProject`

This package contains:

- reusable service topology rendering
- selected component panel
- inventory table view
- service topology layout/model helpers

Catalog API wiring is intentionally outside this package. App-level containers are
expected to fetch catalog entities and pass a `TopologyModel` into `ServiceTopology`.

문서:

- 상세 설계: [docs/architecture.md](/Users/joonjeong/workspace/backstage/plugins/plugin-service-topology/docs/architecture.md)
- 리포지토리 ADR: [/Users/joonjeong/workspace/backstage/docs/0001-service-topology-adr.md](/Users/joonjeong/workspace/backstage/docs/0001-service-topology-adr.md)
- `EdgeStack`/`System + x-edgestack` 스키마: [/Users/joonjeong/workspace/backstage/docs/edge-stack-schema.md](/Users/joonjeong/workspace/backstage/docs/edge-stack-schema.md)
