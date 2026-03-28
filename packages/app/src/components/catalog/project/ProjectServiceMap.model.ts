import {
  type Entity,
  parseEntityRef,
  RELATION_DEPENDS_ON,
  stringifyEntityRef,
} from '@backstage/catalog-model';

const PROJECT_ANNOTATION = 'kabang.cloud/project';
const SERVICE_ZONE_ANNOTATION = 'kabang.cloud/service-zone';
const TRAFFIC_EXPOSURE_ANNOTATION = 'kabang.cloud/traffic-exposure';
const TRAFFIC_TARGETS_ANNOTATION = 'kabang.cloud/traffic-targets';

const PUBLIC_ZONE_ID = 'public';
const PRIVATE_ZONE_ID = 'private';

type ServiceMapNodeKind = 'ingress' | 'component';
type ServiceMapComponentKind = 'component' | 'external';

export type ServiceMapNode = {
  id: string;
  kind: ServiceMapNodeKind;
  componentKind?: ServiceMapComponentKind;
  entityRef?: string;
  title: string;
  subtitle?: string;
  zone: string;
  exposure?: 'public' | 'private';
  tone?: 'entry' | 'public' | 'private' | 'external';
};

export type ServiceMapEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
  tone: 'entry' | 'traffic' | 'dependency';
};

export type ServiceMapZone = {
  id: string;
  title: string;
  description: string;
};

export type ProjectServiceMapModel = {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  zones: ServiceMapZone[];
};

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getEntityRef(entity: Entity): string {
  return stringifyEntityRef(entity);
}

function getEntityTitle(entity: Entity): string {
  return entity.metadata.title ?? entity.metadata.name;
}

function getZoneId(entity: Entity): string {
  const explicitZone = entity.metadata.annotations?.[
    SERVICE_ZONE_ANNOTATION
  ]
    ?.trim()
    .toLocaleLowerCase('en-US');
  if (explicitZone) {
    return explicitZone;
  }

  const exposure = entity.metadata.annotations?.[
    TRAFFIC_EXPOSURE_ANNOTATION
  ]
    ?.trim()
    .toLocaleLowerCase('en-US');
  if (exposure === PUBLIC_ZONE_ID) {
    return PUBLIC_ZONE_ID;
  }

  const componentType = String(entity.spec?.type ?? '').toLocaleLowerCase(
    'en-US',
  );
  if (componentType === 'website' || componentType === 'frontend') {
    return PUBLIC_ZONE_ID;
  }

  return PRIVATE_ZONE_ID;
}

function getExposure(zoneId: string): 'public' | 'private' {
  return zoneId === PUBLIC_ZONE_ID ? 'public' : 'private';
}

function getZoneMeta(zoneId: string): ServiceMapZone {
  if (zoneId === PUBLIC_ZONE_ID) {
    return {
      id: zoneId,
      title: 'Public Zone',
      description: 'Internet-facing entry points',
    };
  }

  if (zoneId === PRIVATE_ZONE_ID) {
    return {
      id: zoneId,
      title: 'Private Zone',
      description: 'Internal services and downstream systems',
    };
  }

  return {
    id: zoneId,
    title: `${titleCase(zoneId)} Zone`,
    description: 'Catalog-defined boundary',
  };
}

function parseTrafficTargetRef(targetRef: string, source: Entity): string {
  return stringifyEntityRef(
    parseEntityRef(targetRef.trim(), {
      defaultKind: 'Component',
      defaultNamespace: source.metadata.namespace,
    }),
  );
}

function getTrafficTargets(entity: Entity): string[] {
  const relationTargets = (entity.relations ?? [])
    .filter(relation => relation.type === RELATION_DEPENDS_ON)
    .map(relation => relation.targetRef);

  const annotatedTargets =
    entity.metadata.annotations?.[TRAFFIC_TARGETS_ANNOTATION]
      ?.split(',')
      .map(targetRef => parseTrafficTargetRef(targetRef, entity)) ?? [];

  return Array.from(new Set([...relationTargets, ...annotatedTargets]));
}

function createComponentNode(entity: Entity): ServiceMapNode {
  const zone = getZoneId(entity);
  const subtitleParts = [
    entity.kind,
    entity.spec?.type ? String(entity.spec.type) : undefined,
    entity.spec?.lifecycle ? String(entity.spec.lifecycle) : undefined,
  ].filter(Boolean);

  return {
    id: getEntityRef(entity),
    kind: 'component',
    componentKind: 'component',
    entityRef: getEntityRef(entity),
    title: getEntityTitle(entity),
    subtitle: subtitleParts.join(' · '),
    zone,
    exposure: getExposure(zone),
    tone: zone === PUBLIC_ZONE_ID ? 'public' : 'private',
  };
}

function createExternalNode(entityRef: string): ServiceMapNode {
  const parsedRef = parseEntityRef(entityRef);
  const title =
    parsedRef.kind.toLocaleLowerCase('en-US') === 'component'
      ? titleCase(parsedRef.name)
      : `${titleCase(parsedRef.name)} ${titleCase(parsedRef.kind)}`;

  return {
    id: entityRef,
    kind: 'component',
    componentKind: 'external',
    entityRef,
    title,
    subtitle: `${titleCase(parsedRef.kind)} · outside project`,
    zone: PRIVATE_ZONE_ID,
    exposure: 'private',
    tone: 'external',
  };
}

function compareZoneIds(left: string, right: string): number {
  const orderedZones = [PUBLIC_ZONE_ID, PRIVATE_ZONE_ID];
  const leftIndex = orderedZones.indexOf(left);
  const rightIndex = orderedZones.indexOf(right);

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  }

  return left.localeCompare(right);
}

function buildComponentEdges(
  projectNodes: ServiceMapNode[],
  projectComponents: Entity[],
): ServiceMapEdge[] {
  const visibleNodeIds = new Set(projectNodes.map(node => node.id));
  const edges: ServiceMapEdge[] = [];
  const externalNodes = new Map<string, ServiceMapNode>();

  for (const component of projectComponents) {
    const sourceRef = getEntityRef(component);

    for (const targetRef of getTrafficTargets(component)) {
      if (!visibleNodeIds.has(targetRef)) {
        externalNodes.set(targetRef, createExternalNode(targetRef));
      }

      edges.push({
        id: `${sourceRef}->${targetRef}`,
        source: sourceRef,
        target: targetRef,
        label: visibleNodeIds.has(targetRef) ? 'routes traffic' : 'dependency',
        animated: true,
        tone: visibleNodeIds.has(targetRef) ? 'traffic' : 'dependency',
      });
    }
  }

  for (const node of externalNodes.values()) {
    projectNodes.push(node);
    visibleNodeIds.add(node.id);
  }

  return edges;
}

export function getProjectComponentFilter(project: Entity) {
  const projectRef = getEntityRef(project);
  const projectName = project.metadata.name;

  return [
    {
      kind: 'Component',
      [`metadata.annotations.${PROJECT_ANNOTATION}`]: projectRef,
    },
    {
      kind: 'Component',
      [`metadata.annotations.${PROJECT_ANNOTATION}`]: projectName,
    },
  ];
}

export function buildProjectServiceMapModel(
  project: Entity,
  projectComponents: Entity[],
): ProjectServiceMapModel {
  const componentNodes = projectComponents.map(createComponentNode);
  const edges = buildComponentEdges(componentNodes, projectComponents);
  const publicNodes = componentNodes.filter(node => node.zone === PUBLIC_ZONE_ID);

  const nodes: ServiceMapNode[] = [
    {
      id: 'public-traffic',
      kind: 'ingress',
      title: 'Public Traffic',
      subtitle: getEntityTitle(project),
      zone: PUBLIC_ZONE_ID,
      exposure: 'public',
      tone: 'entry',
    },
    ...componentNodes,
  ];

  for (const node of publicNodes) {
    edges.unshift({
      id: `public-traffic->${node.id}`,
      source: 'public-traffic',
      target: node.id,
      label: 'ingress',
      animated: true,
      tone: 'entry',
    });
  }

  const zones = Array.from(new Set(nodes.map(node => node.zone)))
    .sort(compareZoneIds)
    .map(getZoneMeta);

  return {
    nodes,
    edges,
    zones,
  };
}
