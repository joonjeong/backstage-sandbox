import {
  type Entity,
  isSystemEntity,
  parseEntityRef,
  RELATION_PART_OF,
  RELATION_DEPENDS_ON,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  type EdgeStackExtension,
  EDGE_STACK_EXTENSION_KEY,
  isEdgeStackSystemEntity,
  PROJECT_MEMBER_ANNOTATION as PROJECT_ANNOTATION,
  RELATION_ROUTES_TRAFFIC_TO,
} from '@internal/plugin-catalog-extensions-common';

const SERVICE_ZONE_ANNOTATION = 'kabang.cloud/service-zone';
const TRAFFIC_EXPOSURE_ANNOTATION = 'kabang.cloud/traffic-exposure';
const TRAFFIC_TARGETS_ANNOTATION = 'kabang.cloud/traffic-targets';

const PUBLIC_ZONE_ID = 'public';
const PRIVATE_ZONE_ID = 'private';
const APP_ZONE_ID = 'app';
const K8S_ZONE_ID = 'k8s';
const DB_ZONE_ID = 'db';
const INTRA_ZONE_ID = 'intra';

type TopologyNodeKind = 'ingress' | 'component';
type TopologyComponentKind = 'component' | 'external';

export type TopologyNodeDetail = {
  id: string;
  entityRef?: string;
  title: string;
  subtitle: string;
  role: string;
  detailKind: 'hop' | 'attachment';
};

export type TopologyResourceLink = {
  id: string;
  entityRef?: string;
  title: string;
  subtitle: string;
};

export type TopologyNode = {
  id: string;
  kind: TopologyNodeKind;
  componentKind?: TopologyComponentKind;
  catalogKind?: string;
  entityRole?: 'edge-stack';
  entityRef?: string;
  title: string;
  subtitle?: string;
  zone: string;
  lane?: 'dns' | 'service';
  exposure?: 'public' | 'private';
  tone?: 'entry' | 'public' | 'private' | 'external';
  details?: TopologyNodeDetail[];
  ownedResources?: TopologyResourceLink[];
};

export type TopologyEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
  tone: 'entry' | 'traffic' | 'dependency';
};

export type TopologyZone = {
  id: string;
  title: string;
  description: string;
};

export type TopologyModel = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  zones: TopologyZone[];
};

function getStringValue(
  source: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

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
    case 'cloudfront':
      return 'CloudFront';
    case 's3':
      return 'S3';
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

function isEdgeStackEntity(entity: Entity): boolean {
  return isEdgeStackSystemEntity(entity);
}

function getEdgeStackSpec(entity: Entity): EdgeStackExtension | undefined {
  if (isEdgeStackSystemEntity(entity)) {
    return entity.spec[EDGE_STACK_EXTENSION_KEY];
  }

  return undefined;
}

function getEdgeStackIngressZone(entity: Entity): string | undefined {
  const edgeStack = getEdgeStackSpec(entity);
  const network =
    edgeStack?.network && typeof edgeStack.network === 'object'
      ? (edgeStack.network as Record<string, unknown>)
      : undefined;
  const exposure =
    edgeStack?.exposure && typeof edgeStack.exposure === 'object'
      ? (edgeStack.exposure as Record<string, unknown>)
      : undefined;

  const ingressZone = String(
    network?.ingressSubnet ?? exposure?.ingress ?? '',
  ).toLocaleLowerCase('en-US');

  return ingressZone || undefined;
}

function getZoneId(entity: Entity): string {
  if (isEdgeStackEntity(entity)) {
    const ingressSubnet = getEdgeStackIngressZone(entity);
    if (ingressSubnet) {
      return ingressSubnet;
    }
  }

  const explicitZone =
    entity.metadata.annotations?.[
      SERVICE_ZONE_ANNOTATION
    ]?.trim().toLocaleLowerCase('en-US');
  if (explicitZone) {
    return explicitZone;
  }

  const exposure =
    entity.metadata.annotations?.[
      TRAFFIC_EXPOSURE_ANNOTATION
    ]?.trim().toLocaleLowerCase('en-US');
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

function getZoneMeta(zoneId: string): TopologyZone {
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

  if (zoneId === APP_ZONE_ID) {
    return {
      id: zoneId,
      title: 'App Subnet',
      description: 'Direct-entry application services and cache workloads',
    };
  }

  if (zoneId === K8S_ZONE_ID) {
    return {
      id: zoneId,
      title: 'K8s Subnet',
      description: 'Direct-entry Kubernetes ingress and container workloads',
    };
  }

  if (zoneId === DB_ZONE_ID) {
    return {
      id: zoneId,
      title: 'DB Subnet',
      description:
        'Isolated database workloads reachable from app and k8s services',
    };
  }

  if (zoneId === INTRA_ZONE_ID) {
    return {
      id: zoneId,
      title: 'Intra Subnet',
      description:
        'Internal-only enterprise systems reachable from app and k8s',
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
  const relationTypes = isEdgeStackEntity(entity)
    ? [RELATION_ROUTES_TRAFFIC_TO]
    : [RELATION_DEPENDS_ON];
  const relationTargets = (entity.relations ?? [])
    .filter(relation => relationTypes.includes(relation.type))
    .map(relation => relation.targetRef);

  const annotatedTargets =
    entity.metadata.annotations?.[TRAFFIC_TARGETS_ANNOTATION]?.split(',').map(
      targetRef => parseTrafficTargetRef(targetRef, entity),
    ) ?? [];

  return Array.from(new Set([...relationTargets, ...annotatedTargets]));
}

function getEntityDescriptor(entity: Entity): string | undefined {
  const edgeStack = getEdgeStackSpec(entity);
  const spec = entity.spec as Record<string, unknown> | undefined;

  if (typeof edgeStack?.pattern === 'string') {
    return edgeStack.pattern;
  }

  if (typeof spec?.type === 'string') {
    return spec.type;
  }

  return undefined;
}

function getEdgeStackDetails(
  entity: Entity,
): TopologyNodeDetail[] | undefined {
  const spec = getEdgeStackSpec(entity);
  if (!spec) {
    return undefined;
  }
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
    title: humanizeInfraLabel(
      String(hop.kind ?? hop.role ?? `hop-${index + 1}`),
    ),
    subtitle: `${String(hop.role ?? 'hop')} · ${humanizeInfraLabel(
      String(hop.kind ?? 'resource'),
    )}${index === 0 && wafTitle ? ` · WAF: ${wafTitle}` : ''}`,
    role: String(hop.role ?? 'hop'),
    detailKind: 'hop' as const,
  }));

  const attachmentDetails = attachments
    .filter(attachment => {
      const kind = String(attachment.kind ?? '').toLocaleLowerCase('en-US');
      const role = String(attachment.role ?? '').toLocaleLowerCase('en-US');

      return (
        kind !== 'route53' &&
        kind !== 'dns' &&
        role !== 'dns' &&
        kind !== 'waf' &&
        role !== 'shield'
      );
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
      subtitle: `${String(
        attachment.role ?? 'attachment',
      )} · ${humanizeInfraLabel(String(attachment.kind ?? 'resource'))}`,
      role: String(attachment.role ?? 'attachment'),
      detailKind: 'attachment' as const,
    }));

  const details = [...attachmentDetails, ...hopDetails];

  return details.length > 0 ? details : undefined;
}

function getEdgeStackOwnedResources(
  entity: Entity,
): TopologyResourceLink[] | undefined {
  const spec = getEdgeStackSpec(entity);
  if (!spec) {
    return undefined;
  }
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

      return (
        kind !== 'waf' &&
        role !== 'shield' &&
        kind !== 'route53' &&
        kind !== 'dns' &&
        role !== 'dns'
      );
    }),
    ...hops,
  ].map((item, index) => {
    const entityRef =
      typeof item.entityRef === 'string' ? String(item.entityRef) : undefined;
    const parsedRef = entityRef ? parseEntityRef(entityRef) : undefined;
    const baseSubtitle = `${String(
      item.role ?? 'resource',
    )} · ${humanizeInfraLabel(
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

function getComponentOwnedResources(
  entity: Entity,
): TopologyResourceLink[] | undefined {
  if (entity.kind !== 'Component') {
    return undefined;
  }

  const spec = entity.spec as Record<string, unknown> | undefined;
  const runtimeResources = Array.isArray(spec?.runtimeResources)
    ? (spec?.runtimeResources as Array<Record<string, unknown>>)
    : [];

  const resources = runtimeResources.map((item, index) => {
    const entityRef =
      typeof item.entityRef === 'string' ? String(item.entityRef) : undefined;
    const parsedRef = entityRef
      ? parseEntityRef(entityRef, {
          defaultKind: 'Resource',
          defaultNamespace: entity.metadata.namespace,
        })
      : undefined;
    let title: string;
    if (typeof item.title === 'string' && item.title.trim()) {
      title = item.title.trim();
    } else if (parsedRef) {
      title = humanizeInfraLabel(parsedRef.name);
    } else {
      title = humanizeInfraLabel(
        String(item.kind ?? item.role ?? `resource-${index + 1}`),
      );
    }

    return {
      id: `${getEntityRef(entity)}:runtime-resource:${index}`,
      entityRef: parsedRef ? stringifyEntityRef(parsedRef) : entityRef,
      title,
      subtitle: `${String(item.role ?? 'resource')} · ${humanizeInfraLabel(
        String(item.kind ?? parsedRef?.kind ?? 'resource'),
      )}`,
    };
  });

  return resources.length > 0 ? resources : undefined;
}

function getEdgeStackDnsAttachments(
  entity: Entity,
): Array<Record<string, unknown>> {
  const spec = getEdgeStackSpec(entity);
  if (!spec) {
    return [];
  }
  const attachments = Array.isArray(spec?.attachments)
    ? (spec?.attachments as Array<Record<string, unknown>>)
    : [];

  return attachments.filter(attachment => {
    const kind = String(attachment.kind ?? '').toLocaleLowerCase('en-US');
    const role = String(attachment.role ?? '').toLocaleLowerCase('en-US');

    return kind === 'route53' || kind === 'dns' || role === 'dns';
  });
}

function getIngressRecordLabel(
  project: Entity,
  projectComponents: Entity[],
): string {
  const publicEdgeStacks = projectComponents.filter(
    entity => isEdgeStackEntity(entity) && getZoneId(entity) === PUBLIC_ZONE_ID,
  );

  for (const entity of publicEdgeStacks) {
    const spec = getEdgeStackSpec(entity);
    const routing =
      spec?.routing && typeof spec.routing === 'object'
        ? (spec.routing as Record<string, unknown>)
        : undefined;

    const routingLabel = getStringValue(routing, [
      'hostname',
      'host',
      'fqdn',
      'record',
      'recordName',
      'dnsName',
      'domain',
      'domainName',
    ]);
    if (routingLabel) {
      return routingLabel;
    }

    for (const attachment of getEdgeStackDnsAttachments(entity)) {
      const attachmentLabel = getStringValue(attachment, [
        'hostname',
        'host',
        'fqdn',
        'record',
        'recordName',
        'dnsName',
        'domain',
        'domainName',
      ]);
      if (attachmentLabel) {
        return attachmentLabel;
      }
    }
  }

  return project.metadata.name;
}

function getIngressDetails(
  projectComponents: Entity[],
): TopologyNodeDetail[] | undefined {
  const publicEdgeStacks = projectComponents.filter(
    entity => isEdgeStackEntity(entity) && getZoneId(entity) === PUBLIC_ZONE_ID,
  );
  const details: TopologyNodeDetail[] = [];
  const seen = new Set<string>();

  for (const entity of publicEdgeStacks) {
    for (const attachment of getEdgeStackDnsAttachments(entity)) {
      const entityRef =
        typeof attachment.entityRef === 'string'
          ? attachment.entityRef
          : undefined;
      const parsedRef = entityRef
        ? parseEntityRef(entityRef, {
            defaultKind: 'Resource',
            defaultNamespace: entity.metadata.namespace,
          })
        : undefined;
      const normalizedEntityRef = parsedRef
        ? stringifyEntityRef(parsedRef)
        : undefined;
      const title = parsedRef
        ? humanizeInfraLabel(parsedRef.name)
        : humanizeInfraLabel(
            String(
              attachment.title ??
                attachment.kind ??
                attachment.role ??
                'hosted-zone',
            ),
          );
      const subtitle = `hosted zone · ${humanizeInfraLabel(
        String(attachment.kind ?? parsedRef?.kind ?? 'resource'),
      )}`;
      const key = normalizedEntityRef ?? `${title}:${subtitle}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      details.push({
        id: `public-traffic:detail:${details.length}`,
        entityRef: normalizedEntityRef,
        title,
        subtitle,
        role: 'hosted-zone',
        detailKind: 'attachment',
      });
    }
  }

  return details.length > 0 ? details : undefined;
}

function getIngressSubtitle(details?: TopologyNodeDetail[]): string {
  if (!details || details.length === 0) {
    return 'Domain Record';
  }

  if (details.length === 1) {
    return `Domain Record · ${details[0].title}`;
  }

  return `Domain Record · ${details.length} hosted zones`;
}

function createComponentNode(entity: Entity): TopologyNode {
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
    catalogKind: isSystemEntity(entity) ? 'System' : entity.kind,
    entityRole: isEdgeStackEntity(entity) ? 'edge-stack' : undefined,
    entityRef: getEntityRef(entity),
    title: getEntityTitle(entity),
    subtitle: subtitleParts.join(' · '),
    zone,
    lane: 'service',
    exposure: getExposure(zone),
    tone: zone === PUBLIC_ZONE_ID ? 'public' : 'private',
    details: getEdgeStackDetails(entity),
    ownedResources: isEdgeStackEntity(entity)
      ? getEdgeStackOwnedResources(entity)
      : getComponentOwnedResources(entity),
  };
}

function createExternalNode(entityRef: string): TopologyNode {
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
  const orderedZones = [
    PUBLIC_ZONE_ID,
    APP_ZONE_ID,
    K8S_ZONE_ID,
    DB_ZONE_ID,
    PRIVATE_ZONE_ID,
    INTRA_ZONE_ID,
  ];
  const leftIndex = orderedZones.indexOf(left);
  const rightIndex = orderedZones.indexOf(right);

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (
      (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
    );
  }

  return left.localeCompare(right);
}

function buildZoneOrder(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
): TopologyZone[] {
  const zoneIds = Array.from(new Set(nodes.map(node => node.zone)));
  if (!zoneIds.includes(PUBLIC_ZONE_ID)) {
    return zoneIds.sort(compareZoneIds).map(getZoneMeta);
  }

  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();

  for (const zoneId of zoneIds) {
    adjacency.set(zoneId, new Set<string>());
  }

  for (const edge of edges) {
    const sourceZone =
      edge.source === 'public-traffic'
        ? PUBLIC_ZONE_ID
        : nodeById.get(edge.source)?.zone;
    const targetZone = nodeById.get(edge.target)?.zone;

    if (!sourceZone || !targetZone || sourceZone === targetZone) {
      continue;
    }

    const targets = adjacency.get(sourceZone) ?? new Set<string>();
    targets.add(targetZone);
    adjacency.set(sourceZone, targets);
  }

  const zoneDistance = new Map<string, number>([[PUBLIC_ZONE_ID, 0]]);
  const queue = [PUBLIC_ZONE_ID];

  while (queue.length > 0) {
    const zoneId = queue.shift()!;
    const distance = zoneDistance.get(zoneId) ?? 0;

    for (const nextZone of adjacency.get(zoneId) ?? []) {
      if (zoneDistance.has(nextZone)) {
        continue;
      }

      zoneDistance.set(nextZone, distance + 1);
      queue.push(nextZone);
    }
  }

  return zoneIds
    .sort((left, right) => {
      if (left === PUBLIC_ZONE_ID) {
        return -1;
      }
      if (right === PUBLIC_ZONE_ID) {
        return 1;
      }
      if (left === INTRA_ZONE_ID && right !== INTRA_ZONE_ID) {
        return 1;
      }
      if (right === INTRA_ZONE_ID && left !== INTRA_ZONE_ID) {
        return -1;
      }

      const leftDistance = zoneDistance.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightDistance = zoneDistance.get(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return compareZoneIds(left, right);
    })
    .map(getZoneMeta);
}

function buildComponentEdges(
  projectNodes: TopologyNode[],
  projectComponents: Entity[],
): TopologyEdge[] {
  const visibleNodeIds = new Set(projectNodes.map(node => node.id));
  const edges: TopologyEdge[] = [];
  const externalNodes = new Map<string, TopologyNode>();

  for (const component of projectComponents) {
    const sourceRef = getEntityRef(component);

    for (const targetRef of getTrafficTargets(component)) {
      if (isEdgeStackEntity(component) && !visibleNodeIds.has(targetRef)) {
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
    entity.metadata.annotations?.[PROJECT_ANNOTATION]?.split(',').map(ref =>
      ref.trim(),
    ) ?? [];

  if (
    annotatedProjects.includes(projectRef) ||
    annotatedProjects.includes(projectName)
  ) {
    return true;
  }

  return (entity.relations ?? []).some(
    relation =>
      relation.type === RELATION_PART_OF && relation.targetRef === projectRef,
  );
}

export function buildTopologyModel(
  project: Entity,
  projectComponents: Entity[],
): TopologyModel {
  const componentNodes = projectComponents.map(createComponentNode);
  const ingressDetails = getIngressDetails(projectComponents);
  const edges = buildComponentEdges([...componentNodes], projectComponents);
  const incomingTargets = new Set(edges.map(edge => edge.target));
  const publicNodes = componentNodes.filter(
    node => node.zone === PUBLIC_ZONE_ID && !incomingTargets.has(node.id),
  );

  const nodes: TopologyNode[] = [
    {
      id: 'public-traffic',
      kind: 'ingress',
      title: getIngressRecordLabel(project, projectComponents),
      subtitle: getIngressSubtitle(ingressDetails),
      zone: PUBLIC_ZONE_ID,
      lane: 'service',
      exposure: 'public',
      tone: 'entry',
      details: ingressDetails,
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

  const zones = buildZoneOrder(nodes, edges);

  return {
    nodes,
    edges,
    zones,
  };
}
