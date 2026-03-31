import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from '@material-ui/core';
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

const EDGE_STACK_SYSTEM_ROLE_ANNOTATION = 'kabang.cloud/system-role';
const EDGE_STACK_SYSTEM_ROLE = 'edge-stack';

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
        const [componentResponse, edgeSystemResponse] = await Promise.all([
          catalogApi.getEntities({
            filter: getProjectEntitiesForKindFilter(
              entity as Entity,
              'Component',
            ),
          }),
          catalogApi.getEntities({
            filter: {
              kind: 'System',
              [`metadata.annotations.${EDGE_STACK_SYSTEM_ROLE_ANNOTATION}`]:
                EDGE_STACK_SYSTEM_ROLE,
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setModel(
          buildProjectServiceMapModel(entity as Entity, [
            ...edgeSystemResponse.items.filter(candidate =>
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
      <div
        style={{
          minHeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
