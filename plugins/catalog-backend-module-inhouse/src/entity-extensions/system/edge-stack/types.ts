import {
  type Entity,
  isSystemEntity,
  type SystemEntity,
} from '@backstage/catalog-model';
import { PROJECT_MEMBER_ANNOTATION } from '../../domain/project/types';

export const EDGE_STACK_PROJECT_ANNOTATION = PROJECT_MEMBER_ANNOTATION;
export const EDGE_STACK_SYSTEM_ROLE_ANNOTATION = 'kabang.cloud/system-role';
export const EDGE_STACK_SYSTEM_ROLE = 'edge-stack';
export const EDGE_STACK_EXTENSION_KEY = 'x-edgestack';
export const RELATION_ROUTES_TRAFFIC_TO = 'routesTrafficTo';
export const RELATION_RECEIVES_TRAFFIC_FROM = 'receivesTrafficFrom';

export type EdgeStackLinkedEntity = {
  role: string;
  kind: string;
  entityRef: string;
};

export type EdgeStackTarget = {
  entityRef: string;
  trafficType?: string;
};

export type EdgeStackExtension = {
  team: string;
  pattern: string;
  shared?: boolean;
  projects?: string[];
  exposure?: {
    ingress?: 'public' | 'private';
    upstream?: 'public' | 'private';
  };
  network?: {
    ingressSubnet?: 'public' | 'private';
    upstreamSubnet?: 'public' | 'private';
    region?: string;
    environment?: string;
    vpcRef?: string;
  };
  routing?: {
    mode?: string;
    protocol?: string;
    tlsTerminationAt?: string;
  };
  hops?: EdgeStackLinkedEntity[];
  attachments?: EdgeStackLinkedEntity[];
  targets?: EdgeStackTarget[];
  providers?: Record<string, unknown>;
};

export type EdgeStackSystemEntity = SystemEntity & {
  metadata: Entity['metadata'] & {
    annotations?: Record<string, string>;
  };
  spec: SystemEntity['spec'] & {
    lifecycle?: string;
    [EDGE_STACK_EXTENSION_KEY]: NonNullable<Entity['spec']>;
  };
};

function normalizeEdgeStackSystemRole(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

export function hasEdgeStackExtension(
  entity: Entity,
): entity is EdgeStackSystemEntity {
  const edgeStack = entity.spec?.[EDGE_STACK_EXTENSION_KEY];
  const edgeStackRecord =
    edgeStack && typeof edgeStack === 'object' && !Array.isArray(edgeStack)
      ? (edgeStack as Record<string, unknown>)
      : undefined;

  return (
    !!edgeStackRecord &&
    typeof edgeStackRecord.team === 'string' &&
    edgeStackRecord.team.trim() !== '' &&
    typeof edgeStackRecord.pattern === 'string' &&
    edgeStackRecord.pattern.trim() !== ''
  );
}

export function isEdgeStackSystemEntity(
  entity: Entity,
): entity is EdgeStackSystemEntity {
  return (
    isSystemEntity(entity) &&
    normalizeEdgeStackSystemRole(
      entity.metadata.annotations?.[EDGE_STACK_SYSTEM_ROLE_ANNOTATION],
    ) === EDGE_STACK_SYSTEM_ROLE &&
    hasEdgeStackExtension(entity)
  );
}
