# plugin-service-map 아키텍처

## 목적

이 패키지는 `Project` 엔티티 페이지에서 사용하는 서비스 맵 UI를 제공한다.

범위:

- 서비스 맵 렌더링
- 선택 컴포넌트 패널
- inventory 표
- 서비스 맵 레이아웃/뷰 모델

비범위:

- `Project`, `EdgeStack` 엔티티 정의
- catalog relation 생성
- backend processor 로직

위 항목은 `plugins/catalog-backend-module-inhouse`가 담당한다.

## 패키지 정보

- package: `@internal/plugin-service-map`
- plugin id: `service-map`
- backstage role: `frontend-plugin`

## Public API

현재 export:

- `ProjectServiceMap`

의도된 사용 방식:

```tsx
import { ProjectServiceMap } from '@internal/plugin-service-map';
```

`ProjectEntityPage`에서 다음처럼 사용한다.

- Overview: `ProjectServiceMap`
- Inventory 탭: `ProjectServiceMap inventoryOnly`

## 내부 구성

### `src/components/ProjectServiceMap.tsx`

책임:

- catalog API 조회
- `Project` 기준 `Component`, `EdgeStack` 수집
- 서비스 맵 렌더링
- 선택 노드 상태 관리
- inventory 탭 표 렌더링
- selected component 패널 렌더링

### `src/components/ProjectServiceMap.model.ts`

책임:

- 서비스 맵 노드/엣지/zone 뷰 모델 생성
- project membership 판정
- `EdgeStack` detail/resource 정규화
- public ingress domain-record metadata 정규화
- static web component `spec.runtimeResources` 정규화

## 데이터 흐름

1. `ProjectServiceMap`이 현재 entity context에서 `Project`를 읽는다.
2. catalog에서 다음 엔티티를 조회한다.
   - `Component`
   - `EdgeStack`
3. `belongsToProject` 규칙으로 현재 프로젝트에 속한 엔티티만 선별한다.
4. `buildProjectServiceMapModel`이 UI용 모델을 만든다.
5. React Flow가 최종 노드/엣지를 렌더링한다.

## UX 원칙

### Service Map

- `InfoCard` 기반
- 좌에서 우로 읽는 트래픽 흐름
- `Public Subnet`, `Private Subnet` 구분
- public ingress는 별도 DNS 노드 대신 domain record 엔트리로 표현
- hosted zone 정보는 ingress 노드 메타데이터로 유지

### Selected Component

- `InfoCard` 기반
- 기본 메타데이터 표시
- ingress, edge stack, component 공통으로 topology metadata 표시
- 새 탭으로 열리는 entity 링크 제공
- `Owned Resources` 다이어그램 제공

### Inventory

- `InfoCard` + Backstage `Table`
- 서비스 맵에 드러난 엔티티를 표로 정리

## Theme 원칙

`Selected Component`와 `Owned Resources` 영역은 고정 밝은 색을 쓰지 않는다.

사용 기준:

- 제목: `theme.palette.text.primary`
- 보조 텍스트: `theme.palette.text.secondary`
- 링크: `theme.palette.primary.main`
- 카드 배경/보더: theme-aware 값

## 현재 제약

- `buildFlow`가 여전히 많은 배치 로직을 가진다.
- `Owned Resources`는 ordered chain 기반이며 실제 resource graph는 아니다.
- `WAF`는 독립 노드가 아니라 ALB 관련 세부 정보로만 드러난다.
- 현재 public API가 `ProjectServiceMap` 하나뿐이라 확장 여지가 제한적이다.

## 리팩토링 후보

우선순위 높은 것:

1. `ProjectServiceMap.tsx`에서 presenter 분리
2. `OwnedResourcesDiagram` 컴포넌트 분리
3. `buildFlow`를 별도 layout module로 분리

중간 우선순위:

4. inventory table columns 분리
5. selected component view model 분리
6. ingress/domain record metadata view model 분리

## 배치 원칙

plugin 패키지 문서에는 다음만 둔다.

- plugin 구조
- export surface
- app wiring 방식
- frontend 구현 제약

다음은 `docs/`에 둔다.

- ADR
- 도메인 모델
- `EdgeStack` 스키마
