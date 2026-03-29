import { Entity } from '@backstage/catalog-model';

export const PROJECT_API_VERSION = 'kabang.cloud/v1';
export const PROJECT_KIND = 'Project';
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

export type ProjectEntity = Entity & {
  apiVersion: typeof PROJECT_API_VERSION;
  kind: typeof PROJECT_KIND;
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
  apiVersion: typeof PROJECT_API_VERSION;
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
