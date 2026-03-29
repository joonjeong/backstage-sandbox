# EdgeStack 스키마 상세 설계

## 목적

`EdgeStack`은 공개 또는 내부 트래픽 경계를 대표하는 커스텀 엔티티다.

이 문서는 현재 채택된 `EdgeStack` 스키마와 relation 의미, YAML 예시를 정리한다.

## Kind 정의

```yaml
apiVersion: kabang.cloud/v1
kind: EdgeStack
```

## 필드 정의

### metadata

- `name`
- `title`
- `description`

### spec

- `owner: string`
- `team: string`
- `pattern: string`
- `shared?: boolean`
- `projects?: string[]`
- `exposure.ingress?: public | private`
- `exposure.upstream?: public | private`
- `network.ingressSubnet?: public | private`
- `network.upstreamSubnet?: public | private`
- `network.region?: string`
- `network.environment?: string`
- `network.vpcRef?: string`
- `routing.mode?: string`
- `routing.protocol?: string`
- `routing.tlsTerminationAt?: string`
- `attachments?: EdgeStackLinkedEntity[]`
- `hops?: EdgeStackLinkedEntity[]`
- `targets?: EdgeStackTarget[]`

### EdgeStackLinkedEntity

```yaml
role: string
kind: string
entityRef: string
```

의미:

- `attachments`
  - 트래픽 본선이 아닌 보조 리소스
  - 예: Route53, WAF
- `hops`
  - 스택이 소유한 런타임 경로 리소스
  - 예: ALB, Envoy on ECS

### EdgeStackTarget

```yaml
entityRef: string
trafficType?: string
```

의미:

- 실제 트래픽이 향하는 downstream 엔티티

## 관계 의미

### 표준 relation

- `partOf`
- `hasPart`
- `ownedBy`
- `ownerOf`

### 커스텀 relation

- `routesTrafficTo`
- `receivesTrafficFrom`

### relation 생성 규칙

- `owner`, `team`
  - `ownedBy`, `ownerOf`
- `projects[]`
  - `EdgeStack -> partOf -> Project`
  - `Project -> hasPart -> EdgeStack`
- `attachments[]`, `hops[]`
  - `Resource -> partOf -> EdgeStack`
  - `EdgeStack -> hasPart -> Resource`
- `targets[]`
  - `EdgeStack -> routesTrafficTo -> Component`
  - `Component -> receivesTrafficFrom -> EdgeStack`

## 해석 규칙

### 프로젝트 소속 판정

다음 중 하나를 만족하면 프로젝트 소속으로 간주한다.

- `metadata.annotations['kabang.cloud/project']`가 프로젝트 ref 와 일치
- `metadata.annotations['kabang.cloud/project']`가 프로젝트 name 과 일치
- `partOf` relation 이 프로젝트를 가리킴

### zone 판정

- `spec.network.ingressSubnet`
- 없으면 `spec.exposure.ingress`

### Domain Record 메타데이터

attachment 중 DNS 계열은 서비스맵에서 별도 DNS 노드로 승격되지 않는다.

대신 public ingress domain record 의 hosted zone 메타데이터로 유지된다.

### WAF 처리

WAF 는 현재 별도 서비스맵 노드가 아니다.

처리 방식:

- attachment 로는 유지
- ALB 관련 세부 정보로만 간접 표현
- `Owned Resources` 다이어그램에서도 별도 카드로 나열하지 않는다

## YAML 예시

### 1. Shared Public EdgeStack

```yaml
apiVersion: kabang.cloud/v1
kind: EdgeStack
metadata:
  name: shared-public-web-entry
  title: TLS/mTLS Gateway
  description: Shared public ALB to Envoy gateway for TLS and mTLS protected API traffic.
spec:
  owner: guests
  team: guests
  pattern: tls-mtls-gateway
  shared: true
  projects:
    - guest-portal
    - guest-ops-console
  exposure:
    ingress: public
    upstream: private
  network:
    ingressSubnet: public
    upstreamSubnet: private
    region: ap-northeast-2
    environment: production
  routing:
    mode: host-path
    protocol: http
    tlsTerminationAt: alb
  attachments:
    - role: dns
      kind: route53
      entityRef: resource:default/public-hosted-zone
    - role: shield
      kind: waf
      entityRef: resource:default/edge-waf
  hops:
    - role: ingress
      kind: alb
      entityRef: resource:default/public-alb
    - role: proxy
      kind: envoy-on-ecs
      entityRef: resource:default/envoy-on-ecs
  targets:
    - entityRef: component:default/guest-portal-api
      trafficType: http
    - entityRef: component:default/guest-ops-console-api
      trafficType: http
```

### 2. DNS Resource

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: public-hosted-zone
  title: Public Hosted Zone
spec:
  type: dns
  owner: guests
  system: examples
```

### 3. Public ALB

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: public-alb
  title: Public ALB
spec:
  type: load-balancer
  owner: guests
  system: examples
```

### 4. Envoy on ECS

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: envoy-on-ecs
  title: Envoy on ECS
spec:
  type: compute
  owner: guests
  system: examples
```

## 현재 구현 제약

- `attachments[]` 와 `hops[]` 순서는 곧 다이어그램 순서다.
- 리소스 간 실제 dependency graph 는 아직 없다.
- `WAF`는 독립 노드가 아니다.
- `WAF`는 owned resource chain 에서도 독립 리소스로 보이지 않고 ALB 속성으로만 표현된다.
- `projects[]`는 processor 단계에서 relation 으로 정규화된다.

## 향후 확장 포인트

- attachment category enum 화
- `Route53`, `WAF`, `ALB`를 더 엄격한 infra kind 로 분리
- resource-to-resource graph 도입
- `Owned Resources` 다이어그램 branching 지원
