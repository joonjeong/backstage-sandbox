# Catalog Inhouse Module

`@internal/plugin-catalog-backend-module-inhouse`

사내 `Domain` 확장과 `System + spec.x-edgestack` 확장을 처리하는 inhouse catalog backend module 패키지다.

## 책임

- `project-domain` 스키마 검증
- `spec.owner`, `spec.team` entity ref 정규화
- `Domain(project) -> owner`, `Domain(project) -> team` relation 생성
- `edge-stack system` 스키마 검증
- `System(edge-stack) -> project/resource/traffic-target` relation 생성

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

## Edge Stack System 스펙

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
