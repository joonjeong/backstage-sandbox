import {
  type Entity,
  parseEntityRef,
  RELATION_PART_OF,
  RELATION_DEPENDS_ON,
  stringifyEntityRef,
} from '@backstage/catalog-model';

const PROJECT_ANNOTATION = 'kabang.cloud/project';
const EDGE_STACK_KIND = 'EdgeStack';
const RELATION_ROUTES_TRAFFIC_TO = 'routesTrafficTo';
const SERVICE_ZONE_ANNOTATION = 'kabang.cloud/service-zone';
const TRAFFIC_EXPOSURE_ANNOTATION = 'kabang.cloud/traffic-exposure';
const TRAFFIC_TARGETS_ANNOTATION = 'kabang.cloud/traffic-targets';

const PUBLIC_ZONE_ID = 'public';
const PRIVATE_ZONE_ID = 'private';

type ServiceMapNodeKind = 'ingress' | 'component';
type ServiceMapComponentKind = 'component' | 'external';

export type ServiceMapNodeDetail = {
  id: string;
  entityRef?: string;
  title: string;
  subtitle: string;
  role: string;
  detailKind: 'hop' | 'attachment';
};

export type ServiceMapResourceLink = {
  id: string;
  entityRef?: string;
  title: string;
  subtitle: string;
};

export type ServiceMapNode = {
  id: string;
  kind: ServiceMapNodeKind;
  componentKind?: ServiceMapComponentKind;
  catalogKind?: string;
  entityRef?: string;
  title: string;
  subtitle?: string;
  zone: string;
  lane?: 'dns' | 'service';
  exposure?: 'public' | 'private';
  tone?: 'entry' | 'public' | 'private' | 'external';
  details?: ServiceMapNodeDetail[];
  ownedResources?: ServiceMapResourceLink[];
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

function humanizeInfraLabel(value: string): string {
  switch (value.toLocaleLowerCase('en-US')) {
    case 'alb':
      return 'ALB';
    case 'waf':
      return 'WAF';
    case 'route53':
      return 'Route53';
    case 'ecs-service':
      return 'ECS Service';
    case 'envoy-on-ecs':
      return 'Envoy on ECS';
    default:
      return titleCase(value);
  }
}

function getEntityRef(entity: Entity): string {
  return stringifyEntityRef(entity);
}

function getEntityTitle(entity: Entity): string {
  return entity.metadata.title ?? entity.metadata.name;
}

function getEdgeStackIngressZone(entity: Entity): string | undefined {
  const spec = entity.spec as Record<string, unknown> | undefined;
  const network =
    spec?.network && typeof spec.network === 'object'
      ? (spec.network as Record<string, unknown>)
      : undefined;
  const exposure =
    spec?.exposure && typeof spec.exposure === 'object'
      ? (spec.exposure as Record<string, unknown>)
      : undefined;

  const ingressZone = String(
    network?.ingressSubnet ?? exposure?.ingress ?? '',
  ).toLocaleLowerCase('en-US');

  return ingressZone || undefined;
}

function getZoneId(entity: Entity): string {
  if (entity.kind === EDGE_STACK_KIND) {
    const ingressSubnet = getEdgeStackIngressZone(entity);
    if (ingressSubnet === PUBLIC_ZONE_ID) {
      return PUBLIC_ZONE_ID;
    }
    if (ingressSubnet === PRIVATE_ZONE_ID) {
      return PRIVATE_ZONE_ID;
    }
  }

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
      title: 'Public Subnet',
      description: 'Internet-facing components in the public subnet',
    };
  }

  if (zoneId === PRIVATE_ZONE_ID) {
    return {
      id: zoneId,
      title: 'Private Subnet',
      description: 'Internal components behind the private subnet',
    };
  }

  return {
    id: zoneId,
    title: `${titleCase(zoneId)} Subnet`,
    description: 'Catalog-defined subnet boundary',
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
  const relationTypes =
    entity.kind === EDGE_STACK_KIND
      ? [RELATION_ROUTES_TRAFFIC_TO]
      : [RELATION_DEPENDS_ON];
  const relationTargets = (entity.relations ?? [])
    .filter(relation => relationTypes.includes(relation.type))
    .map(relation => relation.targetRef);

  const annotatedTargets =
    entity.metadata.annotations?.[TRAFFIC_TARGETS_ANNOTATION]
      ?.split(',')
      .map(targetRef => parseTrafficTargetRef(targetRef, entity)) ?? [];

  return Array.from(new Set([...relationTargets, ...annotatedTargets]));
}

function getEntityDescriptor(entity: Entity): string | undefined {
  const spec = entity.spec as Record<string, unknown> | undefined;

  if (typeof spec?.pattern === 'string') {
    return spec.pattern;
  }

  if (typeof spec?.type === 'string') {
    return spec.type;
  }

  return undefined;
}

function getEdgeStackDetails(entity: Entity): ServiceMapNodeDetail[] | undefined {
  if (entity.kind !== EDGE_STACK_KIND) {
    return undefined;
  }

  const spec = entity.spec as Record<string, unknown> | undefined;
  const hops = Array.isArray(spec?.hops)
    ? (spec?.hops as Array<Record<string, unknown>>)
    : [];
  const attachments = Array.isArray(spec?.attachments)
    ? (spec?.attachments as Array<Record<string, unknown>>)
    : [];
  const wafAttachment = attachments.find(
    attachment =>
      String(attachment.kind ?? '').toLocaleLowerCase('en-US') === 'waf' ||
      String(attachment.role ?? '').toLocaleLowerCase('en-US') === 'shield',
  );
  const wafTitle = wafAttachment
    ? humanizeInfraLabel(
        String(
          wafAttachment.kind ??
            wafAttachment.role ??
            parseEntityRef(String(wafAttachment.entityRef ?? 'waf')).name,
        ),
      )
    : undefined;

  const hopDetails = hops.map((hop, index) => ({
    id: `${getEntityRef(entity)}:hop:${index}`,
    entityRef:
      typeof hop.entityRef === 'string' ? String(hop.entityRef) : undefined,
    title: humanizeInfraLabel(String(hop.kind ?? hop.role ?? `hop-${index + 1}`)),
    subtitle: `${String(hop.role ?? 'hop')} · ${humanizeInfraLabel(
      String(hop.kind ?? 'resource'),
    )}${
      index === 0 && wafTitle ? ` · WAF: ${wafTitle}` : ''
    }`,
    role: String(hop.role ?? 'hop'),
    detailKind: 'hop' as const,
  }));

  const attachmentDetails = attachments
    .filter(attachment => {
      const kind = String(attachment.kind ?? '').toLocaleLowerCase('en-US');
      const role = String(attachment.role ?? '').toLocaleLowerCase('en-US');

      return kind !== 'route53' && kind !== 'dns' && role !== 'dns' && kind !== 'waf' && role !== 'shield';
    })
    .map((attachment, index) => ({
    id: `${getEntityRef(entity)}:attachment:${index}`,
    entityRef:
      typeof attachment.entityRef === 'string'
        ? String(attachment.entityRef)
        : undefined,
    title: humanizeInfraLabel(
      String(attachment.kind ?? attachment.role ?? `attachment-${index + 1}`),
    ),
    subtitle: `${String(attachment.role ?? 'attachment')} · ${humanizeInfraLabel(
      String(attachment.kind ?? 'resource'),
    )}`,
    role: String(attachment.role ?? 'attachment'),
    detailKind: 'attachment' as const,
    }));

  const details = [...attachmentDetails, ...hopDetails];

  return details.length > 0 ? details : undefined;
}

function getEdgeStackOwnedResources(
  entity: Entity,
): ServiceMapResourceLink[] | undefined {
  if (entity.kind !== EDGE_STACK_KIND) {
    return undefined;
  }

  const spec = entity.spec as Record<string, unknown> | undefined;
  const attachments = Array.isArray(spec?.attachments)
    ? (spec?.attachments as Array<Record<string, unknown>>)
    : [];
  const hops = Array.isArray(spec?.hops)
    ? (spec?.hops as Array<Record<string, unknown>>)
    : [];
  const wafAttachment = attachments.find(
    attachment =>
      String(attachment.kind ?? '').toLocaleLowerCase('en-US') === 'waf' ||
      String(attachment.role ?? '').toLocaleLowerCase('en-US') === 'shield',
  );
  const wafTitle = wafAttachment
    ? humanizeInfraLabel(
        String(
          wafAttachment.kind ??
            wafAttachment.role ??
            parseEntityRef(String(wafAttachment.entityRef ?? 'waf')).name,
        ),
      )
    : undefined;

  const resources = [
    ...attachments.filter(item => {
      const kind = String(item.kind ?? '').toLocaleLowerCase('en-US');
      const role = String(item.role ?? '').toLocaleLowerCase('en-US');

      return kind !== 'waf' && role !== 'shield';
    }),
    ...hops,
  ].map((item, index) => {
    const entityRef =
      typeof item.entityRef === 'string' ? String(item.entityRef) : undefined;
    const parsedRef = entityRef ? parseEntityRef(entityRef) : undefined;
    const baseSubtitle = `${String(item.role ?? 'resource')} · ${humanizeInfraLabel(
      String(item.kind ?? parsedRef?.kind ?? 'resource'),
    )}`;
    const subtitle =
      index === 1 && wafTitle
        ? `${baseSubtitle} · WAF: ${wafTitle}`
        : baseSubtitle;

    return {
      id: `${getEntityRef(entity)}:resource:${index}`,
      entityRef,
      title: parsedRef
        ? humanizeInfraLabel(parsedRef.name)
        : humanizeInfraLabel(String(item.kind ?? item.role ?? 'resource')),
      subtitle,
    };
  });

  return resources.length > 0 ? resources : undefined;
}

function getEdgeStackDnsNodes(entity: Entity): ServiceMapNode[] {
  if (entity.kind !== EDGE_STACK_KIND) {
    return [];
  }

  const spec = entity.spec as Record<string, unknown> | undefined;
  const attachments = Array.isArray(spec?.attachments)
    ? (spec?.attachments as Array<Record<string, unknown>>)
    : [];

  return attachments
    .filter(attachment => {
      const kind = String(attachment.kind ?? '').toLocaleLowerCase('en-US');
      const role = String(attachment.role ?? '').toLocaleLowerCase('en-US');

      return kind === 'route53' || kind === 'dns' || role === 'dns';
    })
    .map((attachment, index) => {
      const ref =
        typeof attachment.entityRef === 'string'
          ? attachment.entityRef
          : `${getEntityRef(entity)}:dns:${index}`;
      const parsedRef = parseEntityRef(ref, {
        defaultKind: 'Resource',
        defaultNamespace: entity.metadata.namespace,
      });

      return {
        id: `${getEntityRef(entity)}:dns:${index}`,
        kind: 'component',
        componentKind: 'component',
        catalogKind: parsedRef.kind,
        entityRef: stringifyEntityRef(parsedRef),
        title: humanizeInfraLabel(parsedRef.name),
        subtitle: `${humanizeInfraLabel(String(attachment.kind ?? 'route53'))} · dns`,
        zone: PUBLIC_ZONE_ID,
        lane: 'dns',
        exposure: 'public',
        tone: 'public',
      };
    });
}

function createComponentNode(entity: Entity): ServiceMapNode {
  const zone = getZoneId(entity);
  const subtitleParts = [
    entity.kind,
    getEntityDescriptor(entity),
    entity.spec?.lifecycle ? String(entity.spec.lifecycle) : undefined,
  ].filter(Boolean);

  return {
    id: getEntityRef(entity),
    kind: 'component',
    componentKind: 'component',
    catalogKind: entity.kind,
    entityRef: getEntityRef(entity),
    title: getEntityTitle(entity),
    subtitle: subtitleParts.join(' · '),
    zone,
    lane: 'service',
    exposure: getExposure(zone),
    tone: zone === PUBLIC_ZONE_ID ? 'public' : 'private',
    details: getEdgeStackDetails(entity),
    ownedResources: getEdgeStackOwnedResources(entity),
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
    catalogKind: parsedRef.kind,
    entityRef,
    title,
    subtitle: `${titleCase(parsedRef.kind)} · outside project`,
    zone: PRIVATE_ZONE_ID,
    lane: 'service',
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
      if (component.kind === EDGE_STACK_KIND && !visibleNodeIds.has(targetRef)) {
        continue;
      }

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

export function getProjectEntitiesForKindFilter(project: Entity, kind: string) {
  const projectRef = getEntityRef(project);
  const projectName = project.metadata.name;

  return [
    {
      kind,
      [`metadata.annotations.${PROJECT_ANNOTATION}`]: projectRef,
    },
    {
      kind,
      [`metadata.annotations.${PROJECT_ANNOTATION}`]: projectName,
    },
  ];
}

export function belongsToProject(entity: Entity, project: Entity): boolean {
  const projectRef = getEntityRef(project);
  const projectName = project.metadata.name;
  const annotatedProjects =
    entity.metadata.annotations?.[PROJECT_ANNOTATION]
      ?.split(',')
      .map(ref => ref.trim()) ?? [];

  if (annotatedProjects.includes(projectRef) || annotatedProjects.includes(projectName)) {
    return true;
  }

  return (entity.relations ?? []).some(
    relation =>
      relation.type === RELATION_PART_OF && relation.targetRef === projectRef,
  );
}

export function buildProjectServiceMapModel(
  project: Entity,
  projectComponents: Entity[],
): ProjectServiceMapModel {
  const componentNodes = projectComponents.map(createComponentNode);
  const dnsNodes = projectComponents.flatMap(getEdgeStackDnsNodes);
  const edges = [
    ...dnsNodes.map(node => ({
      id: `${node.id}->${node.id.split(':dns:')[0]}`,
      source: node.id,
      target: node.id.split(':dns:')[0],
      label: 'resolves',
      animated: false,
      tone: 'entry' as const,
    })),
    ...buildComponentEdges([...dnsNodes, ...componentNodes], projectComponents),
  ];
  const incomingTargets = new Set(edges.map(edge => edge.target));
  const publicNodes = [...dnsNodes, ...componentNodes].filter(
    node => node.zone === PUBLIC_ZONE_ID && !incomingTargets.has(node.id),
  );

  const nodes: ServiceMapNode[] = [
    {
      id: 'public-traffic',
      kind: 'ingress',
      title: 'Public Traffic',
      subtitle: getEntityTitle(project),
      zone: PUBLIC_ZONE_ID,
      lane: 'service',
      exposure: 'public',
      tone: 'entry',
    },
    ...dnsNodes,
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
