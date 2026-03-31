import {
  getCompoundEntityRef,
  parseEntityRef,
  stringifyEntityRef,
  type CompoundEntityRef,
  type Entity,
} from '@backstage/catalog-model';

type LinkedEntity = {
  entityRef: string;
};

export function getEntityRef(entity: Entity): CompoundEntityRef {
  return getCompoundEntityRef(entity);
}

export function normalizeRef(
  ref: string,
  entity: Entity,
  defaultKind: string,
): string {
  return stringifyEntityRef(
    parseEntityRef(ref, {
      defaultKind,
      defaultNamespace: entity.metadata.namespace,
    }),
  );
}

export function normalizeProjectDomainRef(ref: string, entity: Entity): string {
  const parsedRef = parseEntityRef(ref, {
    defaultKind: 'Domain',
    defaultNamespace: entity.metadata.namespace,
  });

  return stringifyEntityRef({
    ...parsedRef,
    kind:
      parsedRef.kind.toLocaleLowerCase('en-US') === 'project'
        ? 'Domain'
        : parsedRef.kind,
  });
}

export function normalizeLinkedEntities<T extends LinkedEntity>(
  items: T[] | undefined,
  entity: Entity,
): T[] | undefined {
  return items?.map(item => ({
    ...item,
    entityRef: normalizeRef(item.entityRef, entity, 'Resource'),
  })) as T[] | undefined;
}
