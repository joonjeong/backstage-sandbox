import { Entity } from '@backstage/catalog-model';

export const PROJECT_API_VERSION = 'kabang.cloud/v1';
export const PROJECT_KIND = 'Project';
export const PROJECT_COMPONENT_ANNOTATION = 'kabang.cloud/project';

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
