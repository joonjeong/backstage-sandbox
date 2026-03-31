# Catalog Inhouse Module

`@internal/plugin-catalog-backend-module-inhouse`

사내 `Domain` 확장과 `kabang.cloud/v1` `EdgeStack` 엔티티 처리를 담당하는 inhouse catalog backend module 패키지다.

## 책임

- `project-domain` 스키마 검증
- `spec.owner`, `spec.team` entity ref 정규화
- `Domain(project) -> owner`, `Domain(project) -> team` relation 생성

## 구현 위치

- entrypoint: `src/index.ts`
- processor: `src/processor.ts`

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
