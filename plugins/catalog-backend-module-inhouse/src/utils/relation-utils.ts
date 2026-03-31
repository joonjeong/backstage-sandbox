import {
  RELATION_HAS_PART,
  RELATION_OWNED_BY,
  RELATION_OWNER_OF,
  RELATION_PART_OF,
  type CompoundEntityRef,
} from '@backstage/catalog-model';
import type { CatalogProcessorEmit } from '@backstage/plugin-catalog-node';
import { processingResult } from '@backstage/plugin-catalog-node';

export function emitOwnershipRelations(
  emit: CatalogProcessorEmit,
  source: CompoundEntityRef,
  target: CompoundEntityRef,
): void {
  emit(
    processingResult.relation({
      source,
      type: RELATION_OWNED_BY,
      target,
    }),
  );
  emit(
    processingResult.relation({
      source: target,
      type: RELATION_OWNER_OF,
      target: source,
    }),
  );
}

export function emitPartOfRelations(
  emit: CatalogProcessorEmit,
  source: CompoundEntityRef,
  target: CompoundEntityRef,
): void {
  emit(
    processingResult.relation({
      source,
      type: RELATION_PART_OF,
      target,
    }),
  );
  emit(
    processingResult.relation({
      source: target,
      type: RELATION_HAS_PART,
      target: source,
    }),
  );
}
