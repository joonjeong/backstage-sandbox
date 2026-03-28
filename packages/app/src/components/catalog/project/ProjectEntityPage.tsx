import type { ReactNode } from 'react';
import { Grid } from '@material-ui/core';
import {
  EntityAboutCard,
  EntityHasComponentsCard,
  EntityLayout,
  EntityLinksCard,
} from '@backstage/plugin-catalog';
import { EntityOwnershipCard } from '@backstage/plugin-org';
import { ProjectServiceMap } from './ProjectServiceMap';

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
          <Grid item xs={12}>
            <ProjectServiceMap />
          </Grid>
          {entityWarningContent}
          <Grid item md={6}>
            <EntityAboutCard variant="gridItem" />
          </Grid>
          <Grid item md={6} xs={12}>
            <EntityOwnershipCard variant="gridItem" />
          </Grid>
          <Grid item md={6} xs={12}>
            <EntityLinksCard />
          </Grid>
          <Grid item md={6} xs={12}>
            <EntityHasComponentsCard
              variant="gridItem"
              title="Project Components"
            />
          </Grid>
        </Grid>
      </EntityLayout.Route>
      <EntityLayout.Route path="/components" title="Components">
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12}>
            <EntityHasComponentsCard
              variant="gridItem"
              title="Project Components"
            />
          </Grid>
        </Grid>
      </EntityLayout.Route>
    </EntityLayout>
  );
}
