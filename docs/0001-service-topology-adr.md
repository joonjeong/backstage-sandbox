# ADR 0001: Project Service Topology 와 Edge-Stack System 모델

## 상태

채택

## 날짜

2026-03-29

## 맥락

`Project` 엔티티 페이지에서 단순 catalog graph 대신, 실제 웹서비스 트래픽에 가까운 서비스 맵이 필요했다.

핵심 요구사항:

- Public 트래픽 유입 지점을 표현할 수 있어야 한다.
- `Public Subnet`, `Private Subnet`을 구분해야 한다.
- 공유 인그레스 스택을 프로젝트와 함께 보여야 한다.
- Backstage 카탈로그를 데이터 원천으로 써야 한다.
- 향후 custom relation, custom kind 확장을 감당해야 한다.

운영 모델 측면에서 다음도 표현 대상이었다.

- Route53 기반 DNS 진입점
- Public ALB -> Envoy on ECS -> Internal API 경로
- 여러 프로젝트가 공유하는 edge stack
- WAF 같은 보조 리소스

## 결정

### 1. Project 페이지에 전용 Service Topology를 둔다

Overview 구성:

1. `About`
2. `Service Topology`
3. `Selected Component`

`Inventory`는 별도 탭으로 둔다.

제거한 패널:

- `Links`
- `Ownership`
- `Project Components`

### 2. 공유 인그레스/런타임 경계는 `System + x-edgestack` 확장으로 모델링한다

`ALB`, `Envoy on ECS`를 단순 `Resource` 나열로만 두면 “공개형 edge stack”이라는 운영 의미가 약하다.

따라서 운영 경계 자체를 나타내는 `System` 확장을 사용한다.

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  annotations:
    kabang.cloud/system-role: edge-stack
spec:
  x-edgestack: {}
```

의미:

- 공개 또는 내부 트래픽 경계
- 공유 가능한 ingress/runtime stack 인스턴스
- 프로젝트와 연결되는 운영 단위

### 3. 트래픽 방향은 custom relation 으로 분리한다

사용 relation:

- 표준
  - `partOf`
  - `hasPart`
  - `ownedBy`
  - `ownerOf`
  - `dependsOn`
- 커스텀
  - `routesTrafficTo`
  - `receivesTrafficFrom`

의미:

- `Project -> hasPart -> Component`
- `Project -> hasPart -> System(edge-stack)`
- `System(edge-stack) -> hasPart -> Resource`
- `System(edge-stack) -> routesTrafficTo -> Component`

즉, 프로젝트 멤버십과 트래픽 방향을 분리한다.

### 4. Public ingress 는 domain record 로 표현하고, hosted zone 은 그 속성으로 유지한다

Public ingress 카드는 특정 domain record 를 나타낸다.

Route53 / DNS 계열 attachment 는 더 이상 별도 DNS 노드로 승격하지 않는다.
대신 ingress 노드의 topology metadata 로 유지한다.

WAF 는 현재 1급 맵 노드로 올리지 않고 ALB 관련 세부 정보로만 유지한다.
`Owned Resources` 다이어그램에서도 WAF 는 독립 리소스로 나열하지 않고 ALB 노드의 속성으로 흡수한다.

### 5. Selected Component 는 서비스맵 아래의 Backstage 카드로 둔다

이 패널은 다음을 보여준다.

- 기본 메타데이터
- zone
- incoming / outgoing count
- exposure
- entity 링크
- owned resources 다이어그램

entity 링크는 새 탭으로 열리고 외부 링크 아이콘을 가진다.

### 6. Owned Resources 는 작은 다이어그램으로 표현한다

`Stack Chain`은 별도 정보 섹션으로 유지하지 않는다.

대신 `Owned Resources`를 좌에서 우로 읽는 미니 다이어그램으로 표현한다.

- 각 리소스는 작은 카드
- 리소스 간은 화살표
- 순서는 `attachments[]`, `hops[]` 정규화 결과 기준
- 단, WAF 는 별도 카드가 아니라 ALB 카드의 속성으로 표시

## 결과

이 결정으로 다음이 가능해졌다.

- 프로젝트 단위의 트래픽 중심 서비스 맵
- shared edge stack 표현
- domain record, ALB, Envoy on ECS, internal API 를 하나의 문맥에서 이해
- `Inventory` 탭과 서비스맵의 데이터 정렬

## 제약

- `fitView`는 사용 중이지만, 실제 품질은 사전 계산된 노드 위치와 zone 폭에 크게 좌우된다.
- domain record 문자열은 catalog metadata에 명시되어 있지 않으면 현재 project name fallback 을 사용한다.
- `Owned Resources`는 실제 리소스 간 dependency graph 없이 단순 ordered chain 으로 렌더링된다.
- WAF 는 독립 노드가 아니라 ALB 관련 세부 정보로만 남는다.

## 후속 리팩토링 검토

우선순위 높은 후보:

1. `Selected Component` presenter 분리
2. `Owned Resources` 다이어그램 컴포넌트 분리
3. `buildFlow` 레이아웃 로직을 별도 모듈로 분리

중간 우선순위 후보:

4. `edge-stack system` attachment category 정형화
5. 선택 노드용 view model 도입
6. `Inventory` 컬럼 정의 분리

## 결론

현재 구조는 유지 가능하다.

다만 아래 중 하나가 발생하면 다음 기능 추가 전에 리팩토링을 검토해야 한다.

- custom entity kind 증가
- subnet lane 증가
- owned resource diagram branching 도입
- selected panel 정보 증가
