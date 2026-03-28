import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import type {
  CatalogEntityDocument,
  InlineMappedSourceConfig,
  InlineMappedSourceRecord,
  TemplateContext,
} from './types';

function resolvePath(value: any, path: string): unknown {
  return path.split('.').reduce((current, part) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    return current[part];
  }, value);
}

function renderTemplateString(
  template: string,
  context: TemplateContext,
): unknown {
  const exactMatch =
    template.match(/^\$\{([^}]+)\}$/) ??
    template.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (exactMatch) {
    return resolvePath(context, exactMatch[1].trim());
  }

  return template
    .replace(/\$\{([^}]+)\}/g, (_, expression) => {
      const resolved = resolvePath(context, String(expression).trim());
      return resolved === null || resolved === undefined ? '' : String(resolved);
    })
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
      const resolved = resolvePath(context, String(expression).trim());
      return resolved === null || resolved === undefined ? '' : String(resolved);
    });
}

function renderTemplateValue(value: any, context: TemplateContext): any {
  if (typeof value === 'string') {
    return renderTemplateString(value, context);
  }
  if (Array.isArray(value)) {
    return value.map(item => renderTemplateValue(item, context));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        renderTemplateValue(nestedValue, context),
      ]),
    );
  }
  return value;
}

function normalizeMappedEntity(
  sourceName: string,
  entity: Entity,
  locationKey: string,
): Entity {
  const annotations = Object.fromEntries(
    Object.entries(entity.metadata.annotations ?? {}).map(([key, value]) => [
      key,
      String(value),
    ]),
  );
  const labels = Object.fromEntries(
    Object.entries(entity.metadata.labels ?? {}).map(([key, value]) => [
      key,
      String(value),
    ]),
  );

  return {
    ...entity,
    metadata: {
      ...entity.metadata,
      labels: Object.keys(labels).length > 0 ? labels : entity.metadata.labels,
      annotations: {
        ...annotations,
        'metadata.backstage.io/source-name': sourceName,
        'backstage.io/managed-by-location': annotations[
          'backstage.io/managed-by-location'
        ] ??
          `url:https://catalog-database-module/${encodeURIComponent(
            sourceName,
          )}/${encodeURIComponent(locationKey)}`,
        'backstage.io/managed-by-origin-location': annotations[
          'backstage.io/managed-by-origin-location'
        ] ??
          `url:https://catalog-database-module/${encodeURIComponent(
            sourceName,
          )}/${encodeURIComponent(locationKey)}`,
      },
    },
  };
}

export function toMappedCatalogEntityDocument(
  source: InlineMappedSourceConfig,
  record: InlineMappedSourceRecord,
): CatalogEntityDocument {
  const context: TemplateContext = {
    item: record.item,
    sourceName: source.name,
  };
  const renderedEntity = renderTemplateValue(source.entity, context) as Entity;

  if (
    !renderedEntity?.apiVersion ||
    !renderedEntity?.kind ||
    !renderedEntity?.metadata?.name
  ) {
    throw new Error(
      `database inline mapper for '${source.name}' rendered an invalid entity`,
    );
  }

  const entityRef = stringifyEntityRef(renderedEntity);
  const locationKey =
    (source.locationKeyTemplate
      ? renderTemplateString(source.locationKeyTemplate, {
          ...context,
          item: {
            ...record.item,
            entityRef,
          },
        })
      : undefined) ?? `catalog-database:${entityRef}`;

  return {
    sourceName: source.name,
    entityRef,
    locationKey: String(locationKey),
    entity: normalizeMappedEntity(
      source.name,
      renderedEntity,
      String(locationKey),
    ),
    updatedAt: record.updatedAt,
  };
}
