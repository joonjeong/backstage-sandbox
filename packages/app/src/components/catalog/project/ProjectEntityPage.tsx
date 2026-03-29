import type { ReactNode } from 'react';
import { Grid } from '@material-ui/core';
import { EntityAboutCard, EntityLayout } from '@backstage/plugin-catalog';
import { ProjectServiceMap } from '@internal/plugin-service-map';

type ProjectEntityPageProps = {
  entityWarningContent: ReactNode;
};

export function ProjectEntityPage({
  entityWarningContent,
}: ProjectEntityPageProps) {
  return (
    <EntityLayout>
      <EntityLayout.Route path="/" title="Overview">
        <Grid container spacing={3} alignItems="stretch">
          {entityWarningContent}
          <Grid item xs={12}>
            <EntityAboutCard variant="gridItem" />
          </Grid>
          <Grid item xs={12}>
            <ProjectServiceMap />
          </Grid>
        </Grid>
      </EntityLayout.Route>
      <EntityLayout.Route path="/components" title="Inventory">
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12}>
            <ProjectServiceMap inventoryOnly />
          </Grid>
        </Grid>
      </EntityLayout.Route>
    </EntityLayout>
  );
}
