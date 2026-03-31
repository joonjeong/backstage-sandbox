import {
  type EdgeStackEntity,
  type EdgeStackExtension,
  EDGE_STACK_EXTENSION_KEY,
  hasEdgeStackExtension as hasSharedEdgeStackExtension,
  isEdgeStackSystemEntity as isSharedEdgeStackSystemEntity,
} from '@internal/plugin-catalog-extensions-common';
import {
  type Entity,
  type SystemEntity,
} from '@backstage/catalog-model';

export {
  EDGE_STACK_EXTENSION_KEY,
  EDGE_STACK_PROJECT_ANNOTATION,
  EDGE_STACK_SYSTEM_ROLE,
  EDGE_STACK_SYSTEM_ROLE_ANNOTATION,
  type EdgeStackExtension,
  type EdgeStackLinkedEntity,
  type EdgeStackTarget,
  PROJECT_MEMBER_ANNOTATION,
  RELATION_RECEIVES_TRAFFIC_FROM,
  RELATION_ROUTES_TRAFFIC_TO,
} from '@internal/plugin-catalog-extensions-common';

export type EdgeStackSystemEntity = SystemEntity &
  EdgeStackEntity & {
  metadata: Entity['metadata'] & {
    annotations?: Record<string, string>;
  };
  spec: SystemEntity['spec'] & {
    lifecycle?: string;
    [EDGE_STACK_EXTENSION_KEY]: EdgeStackExtension;
  };
};

export function hasEdgeStackExtension(
  entity: Entity,
): entity is EdgeStackSystemEntity {
  return hasSharedEdgeStackExtension(entity);
}

export function isEdgeStackSystemEntity(
  entity: Entity,
): entity is EdgeStackSystemEntity {
  return isSharedEdgeStackSystemEntity(entity);
}
