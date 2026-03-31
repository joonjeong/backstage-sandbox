import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import type {
  CatalogEntityDocument,
  InlineMappedSourceConfig,
  InlineMappedSourceRecord,
  TemplateContext,
} from './types';

export function resolvePath(value: any, path: string): unknown {
  return path.split('.').reduce((current, part) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    return current[part];
  }, value);
}

export function renderTemplateString(
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
      return resolved === null || resolved === undefined
        ? ''
        : String(resolved);
    })
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
      const resolved = resolvePath(context, String(expression).trim());
      return resolved === null || resolved === undefined
        ? ''
        : String(resolved);
    });
}

export function renderTemplateValue(value: any, context: TemplateContext): any {
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

export function normalizeMappedEntity(
  sourceName: string,
  entity: Entity,
  locationKey: string,
): Entity {
  return {
    ...entity,
    metadata: {
      ...entity.metadata,
      annotations: {
        ...entity.metadata.annotations,
        'metadata.backstage.io/source-name': sourceName,
        'backstage.io/managed-by-location':
          entity.metadata.annotations?.['backstage.io/managed-by-location'] ??
          `url:https://inhouse-cmdb/catalog-mapped-sources/${encodeURIComponent(
            sourceName,
          )}/${encodeURIComponent(locationKey)}`,
        'backstage.io/managed-by-origin-location':
          entity.metadata.annotations?.[
            'backstage.io/managed-by-origin-location'
          ] ??
          `url:https://inhouse-cmdb/catalog-mapped-sources/${encodeURIComponent(
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
      `dynamodb inline mapper for '${source.name}' rendered an invalid entity`,
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
      : undefined) ?? `inhouse-cmdb:${entityRef}`;

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
