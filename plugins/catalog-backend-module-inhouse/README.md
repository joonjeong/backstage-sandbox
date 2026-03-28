# Catalog Inhouse Module

`@internal/plugin-catalog-backend-module-inhouse`

사내 `kabang.cloud/v1`, `Project` 엔티티 처리를 담당하는 inhouse catalog backend module 패키지다.

## 책임

- `Project` kind 스키마 검증
- `spec.owner`, `spec.team` entity ref 정규화
- `Project -> owner`, `Project -> team` relation 생성

## 구현 위치

- entrypoint: `src/index.ts`
- processor: `src/processor.ts`

## 엔티티 스펙

```yaml
apiVersion: kabang.cloud/v1
kind: Project
metadata:
  name: some-project-name
  title: Some Project
  description: Team-managed project metadata
spec:
  owner: user:default/alice
  team: group:default/platform
```

짧은 ref 도 허용한다. 예를 들어 `owner: alice`, `team: platform` 으로 들어오면
processor 가 각각 `user:default/alice`, `group:default/platform` 으로 정규화한다.
