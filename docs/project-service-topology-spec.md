# Project Service Topology 문서 안내

프로젝트 서비스 맵 관련 문서는 성격에 따라 분리한다.

## 저장 위치

### 리포지토리 전역 문서

- ADR: [0001-service-topology-adr.md](/Users/joonjeong/workspace/backstage/docs/0001-service-topology-adr.md)
- 도메인 스키마: [edge-stack-schema.md](/Users/joonjeong/workspace/backstage/docs/edge-stack-schema.md)

### 플러그인 구현 문서

- frontend plugin 개요: [plugins/plugin-service-topology/README.md](/Users/joonjeong/workspace/backstage/plugins/plugin-service-topology/README.md)
- frontend plugin 상세 설계: [plugins/plugin-service-topology/docs/architecture.md](/Users/joonjeong/workspace/backstage/plugins/plugin-service-topology/docs/architecture.md)

## 원칙

- 조직 차원의 결정, 도메인 모델, 공용 스키마는 `docs/`
- 특정 plugin 패키지의 구조, export, wiring, 구현 제약은 각 plugin 디렉터리
