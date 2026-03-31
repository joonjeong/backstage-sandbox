import { Typography } from '@material-ui/core';
import type { TopologySelectedNodeSummary } from '../models/Topology.view-model';
import { EntityLinkWithIcon } from './EntityLink';
import { useTopologyStyles } from './topologyStyles';

export function TopologyInspectorLane({
  selectedSummary,
}: {
  selectedSummary?: TopologySelectedNodeSummary;
}) {
  const classes = useTopologyStyles();
  const ownedResources = selectedSummary?.node.ownedResources ?? [];
  const hasOwnedResources = ownedResources.length > 0;

  return (
    <div className={classes.canvasLane}>
      <div className={classes.selectedLane}>
        <div className={classes.selectedGrid}>
          <div className={classes.selectedPrimary}>
            <div className={classes.inspector}>
              {selectedSummary ? (
                <>
                  <Typography variant="subtitle1" className={classes.inspectorTitle}>
                    {selectedSummary.node.title}
                  </Typography>
                  {selectedSummary.node.subtitle && (
                    <Typography
                      variant="body2"
                      className={classes.inspectorSubtitle}
                    >
                      {selectedSummary.node.subtitle}
                    </Typography>
                  )}
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>Zone</Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.zone}
                    </Typography>
                  </div>
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>Incoming</Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.incomingCount}
                    </Typography>
                  </div>
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>Outgoing</Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.outgoingCount}
                    </Typography>
                  </div>
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>Exposure</Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.node.exposure}
                    </Typography>
                  </div>
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>Entity</Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.node.componentKind === 'component' &&
                      selectedSummary.node.entityRef ? (
                        <EntityLinkWithIcon
                          entityRef={selectedSummary.node.entityRef}
                          label={selectedSummary.node.title}
                        />
                      ) : (
                        selectedSummary.node.entityRef ?? selectedSummary.node.id
                      )}
                    </Typography>
                  </div>
                </>
              ) : (
                <>
                  <Typography variant="subtitle1" className={classes.inspectorTitle}>
                    Select a component
                  </Typography>
                  <Typography variant="body2" className={classes.inspectorHint}>
                    Click a node in the service topology to inspect its traffic and
                    catalog information here.
                  </Typography>
                </>
              )}
            </div>
          </div>

          {hasOwnedResources ? (
            <div className={classes.selectedSection}>
              <Typography className={classes.selectedSectionTitle}>
                Topology Details
              </Typography>
              <Typography className={classes.selectedSectionHint}>
                Ordered owned resources shown as a top-to-bottom chain for the
                selected node.
              </Typography>
              <div className={classes.resourceDiagram}>
                {ownedResources.flatMap((resource, index) => [
                  <div key={`${resource.id}:diagram`} className={classes.resourceNode}>
                    {resource.entityRef ? (
                      <EntityLinkWithIcon
                        entityRef={resource.entityRef}
                        label={resource.title}
                      />
                    ) : (
                      <Typography className={classes.resourceNodeTitle}>
                        {resource.title}
                      </Typography>
                    )}
                    <Typography className={classes.resourceNodeSubtitle}>
                      {resource.subtitle}
                    </Typography>
                  </div>,
                  index < ownedResources.length - 1 ? (
                    <span key={`${resource.id}:arrow`} className={classes.resourceArrow}>
                      ↓
                    </span>
                  ) : null,
                ])}
              </div>
            </div>
          ) : null}

          {!hasOwnedResources ? (
            <Typography variant="body2" className={classes.inspectorHint}>
              No additional topology metadata is mapped for the current
              selection.
            </Typography>
          ) : null}
        </div>
      </div>
    </div>
  );
}
