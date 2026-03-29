import { useEffect, useState } from 'react';
import { Card, CardContent, CircularProgress, Typography } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef, useEntity } from '@backstage/plugin-catalog-react';
import type { Entity } from '@backstage/catalog-model';
import {
  ProjectServiceMap,
  belongsToProject,
  buildProjectServiceMapModel,
  getProjectEntitiesForKindFilter,
  type ProjectServiceMapModel,
} from '@internal/plugin-service-map';

export function ProjectServiceMapContainer({
  inventoryOnly = false,
}: {
  inventoryOnly?: boolean;
}) {
  const { entity } = useEntity();
  const catalogApi = useApi(catalogApiRef);
  const [model, setModel] = useState<ProjectServiceMapModel | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(undefined);

      try {
        const [componentResponse, edgeStackResponse] = await Promise.all([
          catalogApi.getEntities({
            filter: getProjectEntitiesForKindFilter(entity as Entity, 'Component'),
          }),
          catalogApi.getEntities({
            filter: { kind: 'EdgeStack' },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setModel(
          buildProjectServiceMapModel(entity as Entity, [
            ...edgeStackResponse.items.filter(candidate =>
              belongsToProject(candidate, entity as Entity),
            ),
            ...componentResponse.items,
          ]),
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError
            : new Error('Failed to load project components from the catalog'),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [catalogApi, entity]);

  if (loading) {
    return (
      <div style={{ minHeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Service map could not be loaded</Typography>
          <Typography color="textSecondary">{error.message}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!model) {
    return null;
  }

  return <ProjectServiceMap model={model} inventoryOnly={inventoryOnly} />;
}
