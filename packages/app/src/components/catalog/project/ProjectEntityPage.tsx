import type { ReactNode } from 'react';
import { Grid } from '@material-ui/core';
import {
  EntityAboutCard,
  EntityLayout,
  EntityLinksCard,
  RelatedEntitiesCard,
} from '@backstage/plugin-catalog';
import { EntityOwnershipCard } from '@backstage/plugin-org';
import { EntityCatalogGraphCard } from '@backstage/plugin-catalog-graph';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  type Entity,
  RELATION_DEPENDENCY_OF,
  RELATION_DEPENDS_ON,
  RELATION_HAS_PART,
  RELATION_PART_OF,
  stringifyEntityRef,
} from '@backstage/catalog-model';

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
          <Grid item md={6}>
            <EntityAboutCard variant="gridItem" />
          </Grid>
          <Grid item md={6} xs={12}>
            <EntityCatalogGraphCard variant="gridItem" height={400} />
          </Grid>
          <Grid item md={6} xs={12}>
            <EntityOwnershipCard variant="gridItem" />
          </Grid>
          <Grid item md={6} xs={12}>
            <EntityLinksCard />
          </Grid>
        </Grid>
      </EntityLayout.Route>
      <EntityLayout.Route path="/components" title="Components">
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12}>
            <RelatedEntitiesCard
              title="Project Components"
              entityKind="Component"
              relationType={RELATION_HAS_PART}
              columns={RelatedEntitiesCard.componentEntityColumns}
              asRenderableEntities={RelatedEntitiesCard.asComponentEntities}
              emptyMessage="No components belong to this project"
              emptyHelpLink="https://backstage.io/docs/features/software-catalog/descriptor-format#kind-component"
            />
          </Grid>
        </Grid>
      </EntityLayout.Route>
      <EntityLayout.Route path="/graph" title="Graph">
        <ProjectComponentGraph />
      </EntityLayout.Route>
    </EntityLayout>
  );
}

function ProjectComponentGraph() {
  const { entity } = useEntity();
  const entityRef = stringifyEntityRef(entity);

  return (
    <Grid container spacing={3} alignItems="stretch">
      <Grid item xs={12}>
        <EntityCatalogGraphCard
          variant="gridItem"
          title="Project Component Graph"
          height={700}
          relations={[
            RELATION_HAS_PART,
            RELATION_PART_OF,
            RELATION_DEPENDS_ON,
            RELATION_DEPENDENCY_OF,
          ]}
          kinds={['Project', 'Component']}
          maxDepth={2}
          unidirectional={false}
          entityFilter={(candidate: Entity) => {
            if (stringifyEntityRef(candidate) === entityRef) {
              return true;
            }

            return (
              candidate.kind.toLocaleLowerCase('en-US') === 'component' &&
              (candidate.relations ?? []).some(
                relation =>
                  relation.type === RELATION_PART_OF &&
                  relation.targetRef === entityRef,
              )
            );
          }}
        />
      </Grid>
    </Grid>
  );
}
