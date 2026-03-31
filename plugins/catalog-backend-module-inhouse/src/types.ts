import { Entity } from '@backstage/catalog-model';

export const PROJECT_DOMAIN_API_VERSION = 'backstage.io/v1alpha1';
export const PROJECT_DOMAIN_KIND = 'Domain';
export const PROJECT_DOMAIN_ROLE_ANNOTATION = 'kabang.cloud/domain-role';
export const PROJECT_DOMAIN_ROLE = 'project';
export const PROJECT_MEMBER_ANNOTATION = 'kabang.cloud/project';
export const PROJECT_COMPONENT_ANNOTATION = PROJECT_MEMBER_ANNOTATION;
export const EDGE_STACK_PROJECT_ANNOTATION = PROJECT_MEMBER_ANNOTATION;
export const EDGE_STACK_KIND = 'EdgeStack';
export const RELATION_ROUTES_TRAFFIC_TO = 'routesTrafficTo';
export const RELATION_RECEIVES_TRAFFIC_FROM = 'receivesTrafficFrom';

export type EdgeStackLinkedEntity = {
  role: string;
  kind: string;
  entityRef: string;
};

export type ProjectDomainEntity = Entity & {
  apiVersion: typeof PROJECT_DOMAIN_API_VERSION;
  kind: typeof PROJECT_DOMAIN_KIND;
  metadata: Entity['metadata'] & {
    annotations?: Record<string, string>;
  };
  spec: {
    owner: string;
    team: string;
  };
};

export type ProjectAwareComponentEntity = Entity & {
  kind: 'Component';
  metadata: Entity['metadata'] & {
    annotations?: Record<string, string>;
  };
};

export type EdgeStackEntity = Entity & {
  apiVersion: 'kabang.cloud/v1';
  kind: typeof EDGE_STACK_KIND;
  spec: {
    owner: string;
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
    targets?: Array<{
      entityRef: string;
      trafficType?: string;
    }>;
  };
  metadata: Entity['metadata'] & {
    annotations?: Record<string, string>;
  };
};

function normalizeProjectDomainRole(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

export function isProjectDomainEntity(
  entity: Entity,
): entity is ProjectDomainEntity {
  return (
    entity.apiVersion === PROJECT_DOMAIN_API_VERSION &&
    entity.kind === PROJECT_DOMAIN_KIND &&
    normalizeProjectDomainRole(
      entity.metadata.annotations?.[PROJECT_DOMAIN_ROLE_ANNOTATION],
    ) === PROJECT_DOMAIN_ROLE
  );
}
