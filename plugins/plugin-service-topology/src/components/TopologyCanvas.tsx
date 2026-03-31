import { Card, CardContent, Chip, Typography } from '@material-ui/core';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  Position,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type {
  TopologyModel,
  TopologyNode,
  TopologyZone,
} from '../models/Topology.model';
import { useTopologyStyles } from './topologyStyles';

type FlowNodeData = {
  node: TopologyNode;
};

type ZoneNodeData = {
  zone: TopologyZone;
};

function hiddenHandleStyle(accent: string) {
  return {
    background: accent,
    width: 10,
    height: 10,
    opacity: 0,
    pointerEvents: 'none' as const,
  };
}

function toneColor(tone: TopologyNode['tone']): string {
  switch (tone) {
    case 'entry':
      return '#38bdf8';
    case 'public':
      return '#1d4ed8';
    case 'external':
      return '#c2410c';
    case 'private':
    default:
      return '#0f172a';
  }
}

function edgeColor(tone: Edge['data'] extends { tone: infer T } ? T : unknown) {
  switch (tone) {
    case 'entry':
      return '#0284c7';
    case 'dependency':
      return '#ea580c';
    case 'traffic':
    default:
      return '#2563eb';
  }
}

function getNodeCardClassName(
  classes: ReturnType<typeof useTopologyStyles>,
  node: TopologyNode,
  selected: boolean,
): string {
  const toneClassName = (() => {
    if (node.lane === 'dns') {
      return classes.nodeCardDns;
    }

    switch (node.tone) {
      case 'entry':
        return classes.nodeCardIngress;
      case 'public':
        return classes.nodeCardPublic;
      case 'external':
        return classes.nodeCardExternal;
      case 'private':
      default:
        return classes.nodeCardPrivate;
    }
  })();

  return `${toneClassName} ${selected ? classes.nodeCardSelected : ''}`;
}

function ServiceNodeCard({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const classes = useTopologyStyles();
  const { node } = data;
  const accent = toneColor(node.tone);
  const cardClassName = getNodeCardClassName(classes, node, selected);

  return (
    <>
      {node.kind !== 'ingress' && (
        <>
          <Handle
            id="west"
            type="target"
            position={Position.Left}
            style={{ background: accent, width: 10, height: 10 }}
          />
          <Handle
            id="north"
            type="target"
            position={Position.Top}
            style={hiddenHandleStyle(accent)}
          />
        </>
      )}
      <Card
        className={`${classes.nodeCard} ${cardClassName}`}
        style={{ borderTop: `4px solid ${accent}` }}
        elevation={0}
      >
        <CardContent>
          <div className={classes.nodeHeader}>
            <Typography
              className={`${classes.nodeTitle} ${
                node.tone === 'entry' ? classes.nodeTitleLight : ''
              }`}
            >
              {node.title}
            </Typography>
            <Chip
              label={node.exposure ?? node.kind}
              size="small"
              className={classes.nodeBadge}
              style={{
                background:
                  node.tone === 'entry'
                    ? 'rgba(255, 255, 255, 0.16)'
                    : `${accent}14`,
                color: node.tone === 'entry' ? '#fff' : accent,
              }}
            />
          </div>
          {node.subtitle && (
            <Typography
              className={`${classes.nodeSubtitle} ${
                node.tone === 'entry' ? classes.nodeSubtitleLight : ''
              }`}
            >
              {node.subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
      <Handle
        id="east"
        type="source"
        position={Position.Right}
        style={{ background: accent, width: 10, height: 10 }}
      />
      <Handle
        id="south"
        type="source"
        position={Position.Bottom}
        style={hiddenHandleStyle(accent)}
      />
    </>
  );
}

function ZoneNode({ data }: NodeProps<Node<ZoneNodeData>>) {
  const classes = useTopologyStyles();

  return (
    <div className={classes.zoneCard}>
      <div className={classes.zoneHeader}>
        <Typography className={classes.zoneTitle}>{data.zone.title}</Typography>
      </div>
      <Typography className={classes.zoneDescription}>
        {data.zone.description}
      </Typography>
    </div>
  );
}

function resolveEdgeHandles(
  edge: {
    source: string;
    target: string;
  },
  nodeById: Map<string, TopologyNode>,
) {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);

  if (
    sourceNode?.kind === 'component' &&
    targetNode?.kind === 'component' &&
    targetNode.zone === 'intra' &&
    ['app', 'k8s'].includes(sourceNode.zone)
  ) {
    return {
      sourceHandle: 'south',
      targetHandle: 'north',
    };
  }

  return {
    sourceHandle: 'east',
    targetHandle: 'west',
  };
}

export function buildFlow(
  model: TopologyModel,
  selectedNodeId?: string,
): {
  nodes: Node[];
  edges: Edge[];
} {
  const zoneOrder = model.zones.map(zone => zone.id);
  const zoneIndexLookup = new Map(
    zoneOrder.map((zoneId, index) => [zoneId, index]),
  );
  const componentNodes = model.nodes.filter(node => node.kind === 'component');
  const nodeWidth = 240;
  const nodeHeight = 96;
  const nodeGapX = 48;
  const nodeGapY = 44;
  const minZoneWidth = 360;
  const minZoneHeight = 248;
  const zoneGap = 72;
  const zoneStartX = 160;
  const zoneStartY = 80;
  const zoneHeaderHeight = 72;
  const zonePaddingLeft = 40;
  const zonePaddingRight = 40;
  const zonePaddingTop = 28;
  const zonePaddingBottom = 36;
  const privateGroupColumnGap = 40;
  const privateGroupRowGap = 56;
  const ingressGap = 64;
  const ingressX = zoneStartX - nodeWidth - ingressGap;
  const defaultIngressY = 196;
  const outgoingBySource = new Map<string, string[]>();

  for (const edge of model.edges) {
    const outgoing = outgoingBySource.get(edge.source) ?? [];
    outgoing.push(edge.target);
    outgoingBySource.set(edge.source, outgoing);
  }

  const nodesByZone = new Map<string, TopologyNode[]>();
  for (const zone of zoneOrder) {
    nodesByZone.set(zone, []);
  }

  for (const node of componentNodes) {
    const zoneNodes = nodesByZone.get(node.zone) ?? [];
    zoneNodes.push(node);
    nodesByZone.set(node.zone, zoneNodes);
  }

  const localColumnByNode = new Map<string, number>();
  const nodeById = new Map(model.nodes.map(node => [node.id, node]));

  for (const node of componentNodes) {
    localColumnByNode.set(node.id, 0);
  }

  for (let iteration = 0; iteration < componentNodes.length; iteration += 1) {
    let changed = false;

    for (const edge of model.edges) {
      const sourceNode = nodeById.get(edge.source);
      const targetNode = nodeById.get(edge.target);

      if (!sourceNode || !targetNode || targetNode.kind !== 'component') {
        continue;
      }

      let nextColumn = 0;
      if (sourceNode.kind === 'component' && sourceNode.zone === targetNode.zone) {
        nextColumn = (localColumnByNode.get(sourceNode.id) ?? 0) + 1;
      }

      if ((localColumnByNode.get(targetNode.id) ?? 0) < nextColumn) {
        localColumnByNode.set(targetNode.id, nextColumn);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  const preferredRowByNode = new Map<string, number>();
  preferredRowByNode.set('public-traffic', 0);

  const traversalOrder = [...componentNodes].sort((left, right) => {
    const leftZone = zoneIndexLookup.get(left.zone) ?? 0;
    const rightZone = zoneIndexLookup.get(right.zone) ?? 0;
    if (leftZone !== rightZone) {
      return leftZone - rightZone;
    }

    const leftColumn = localColumnByNode.get(left.id) ?? 0;
    const rightColumn = localColumnByNode.get(right.id) ?? 0;
    if (leftColumn !== rightColumn) {
      return leftColumn - rightColumn;
    }

    return left.title.localeCompare(right.title);
  });

  for (const sourceId of ['public-traffic', ...traversalOrder.map(node => node.id)]) {
    const sourceRow = preferredRowByNode.get(sourceId) ?? 0;
    const outgoingTargets = (outgoingBySource.get(sourceId) ?? [])
      .map(targetId => nodeById.get(targetId))
      .filter((node): node is TopologyNode => Boolean(node))
      .sort((left, right) => {
        const leftZone = zoneIndexLookup.get(left.zone) ?? 0;
        const rightZone = zoneIndexLookup.get(right.zone) ?? 0;
        if (leftZone !== rightZone) {
          return leftZone - rightZone;
        }

        const leftColumn = localColumnByNode.get(left.id) ?? 0;
        const rightColumn = localColumnByNode.get(right.id) ?? 0;
        if (leftColumn !== rightColumn) {
          return leftColumn - rightColumn;
        }

        return left.title.localeCompare(right.title);
      });

    outgoingTargets.forEach((targetNode, branchIndex) => {
      const preferredRow = sourceRow + branchIndex;
      const currentRow = preferredRowByNode.get(targetNode.id);

      if (currentRow === undefined || preferredRow < currentRow) {
        preferredRowByNode.set(targetNode.id, preferredRow);
      }
    });
  }

  const positionedRows = new Map<string, number>();
  const positionedColumns = new Map<string, number>();
  const zoneLayoutMetrics = new Map<
    string,
    {
      rows: number;
      columns: number;
      width: number;
      height: number;
      x: number;
      y: number;
    }
  >();
  for (const zoneId of zoneOrder) {
    const zoneNodes = [...(nodesByZone.get(zoneId) ?? [])].sort((left, right) => {
      const leftColumn = localColumnByNode.get(left.id) ?? 0;
      const rightColumn = localColumnByNode.get(right.id) ?? 0;
      if (leftColumn !== rightColumn) {
        return leftColumn - rightColumn;
      }

      const leftRow = preferredRowByNode.get(left.id) ?? 0;
      const rightRow = preferredRowByNode.get(right.id) ?? 0;
      if (leftRow !== rightRow) {
        return leftRow - rightRow;
      }

      return left.title.localeCompare(right.title);
    });

    const occupiedRowsByColumn = new Map<number, Set<number>>();
    const zoneColumnValues = zoneNodes.map(node => localColumnByNode.get(node.id) ?? 0);
    const minColumn = zoneColumnValues.length > 0 ? Math.min(...zoneColumnValues) : 0;
    const provisionalRows = new Map<string, number>();

    for (const node of zoneNodes) {
      const column = (localColumnByNode.get(node.id) ?? 0) - minColumn;
      const preferredRow = preferredRowByNode.get(node.id) ?? 0;
      const occupiedRows = occupiedRowsByColumn.get(column) ?? new Set<number>();
      let row = preferredRow;

      while (occupiedRows.has(row)) {
        row += 1;
      }

      occupiedRows.add(row);
      occupiedRowsByColumn.set(column, occupiedRows);
      positionedColumns.set(node.id, column);
      provisionalRows.set(node.id, row);
    }

    const minRow =
      provisionalRows.size > 0 ? Math.min(...provisionalRows.values()) : 0;

    for (const node of zoneNodes) {
      const normalizedRow = (provisionalRows.get(node.id) ?? 0) - minRow;
      positionedRows.set(node.id, normalizedRow);
    }

    const maxColumn =
      Math.max(...zoneNodes.map(node => positionedColumns.get(node.id) ?? 0), 0) + 1;
    const maxRow =
      Math.max(...zoneNodes.map(node => positionedRows.get(node.id) ?? 0), 0) + 1;
    const zoneWidth = Math.max(
      minZoneWidth,
      zonePaddingLeft +
        zonePaddingRight +
        maxColumn * nodeWidth +
        Math.max(0, maxColumn - 1) * nodeGapX,
    );
    const zoneHeight = Math.max(
      minZoneHeight,
      zoneHeaderHeight +
        zonePaddingTop +
        zonePaddingBottom +
        maxRow * nodeHeight +
        Math.max(0, maxRow - 1) * nodeGapY,
    );

    zoneLayoutMetrics.set(zoneId, {
      rows: maxRow,
      columns: maxColumn,
      width: zoneWidth,
      height: zoneHeight,
      x: 0,
      y: zoneStartY,
    });
  }

  const customPrivateZoneIds = zoneOrder.filter(
    zoneId => !['public', 'private'].includes(zoneId),
  );
  const groupedZoneColumns = [
    ['app', 'k8s'],
    ['db', 'intra'],
  ]
    .map(zoneIds => zoneIds.filter(zoneId => customPrivateZoneIds.includes(zoneId)))
    .filter(zoneIds => zoneIds.length > 0);
  const groupedZoneIds = new Set(groupedZoneColumns.flat());
  const remainingCustomZoneIds = customPrivateZoneIds.filter(
    zoneId => !groupedZoneIds.has(zoneId),
  );
  const flowNodes: Node[] = [];

  if (groupedZoneColumns.length > 0) {
    const publicZoneMetrics = zoneLayoutMetrics.get('public');

    let currentZoneX = zoneStartX;
    if (publicZoneMetrics) {
      zoneLayoutMetrics.set('public', {
        ...publicZoneMetrics,
        x: currentZoneX,
        y: zoneStartY,
      });
      currentZoneX += publicZoneMetrics.width + zoneGap;
    }

    for (const columnZoneIds of groupedZoneColumns) {
      const columnWidth = Math.max(
        ...columnZoneIds.map(
          zoneId => zoneLayoutMetrics.get(zoneId)?.width ?? minZoneWidth,
        ),
      );
      let currentZoneY = zoneStartY;

      for (const zoneId of columnZoneIds) {
        const metrics = zoneLayoutMetrics.get(zoneId)!;
        zoneLayoutMetrics.set(zoneId, {
          ...metrics,
          width: columnWidth,
          x: currentZoneX,
          y: currentZoneY,
        });
        currentZoneY += metrics.height + privateGroupRowGap;
      }

      currentZoneX += columnWidth + privateGroupColumnGap;
    }

    for (const zoneId of remainingCustomZoneIds) {
      const metrics = zoneLayoutMetrics.get(zoneId)!;
      zoneLayoutMetrics.set(zoneId, {
        ...metrics,
        x: currentZoneX,
        y: zoneStartY,
      });
      currentZoneX += metrics.width + zoneGap;
    }
  } else {
    let currentZoneX = zoneStartX;
    for (const zoneId of zoneOrder) {
      const metrics = zoneLayoutMetrics.get(zoneId)!;
      zoneLayoutMetrics.set(zoneId, {
        ...metrics,
        x: currentZoneX,
        y: zoneStartY,
      });
      currentZoneX += metrics.width + zoneGap;
    }
  }

  flowNodes.push(
    ...zoneOrder.map(zoneId => {
      const zone = model.zones.find(candidate => candidate.id === zoneId)!;
      const zoneMetrics = zoneLayoutMetrics.get(zoneId)!;

      return {
        id: `zone:${zoneId}`,
        type: 'zone',
        position: {
          x: zoneMetrics.x,
          y: zoneMetrics.y,
        },
        draggable: false,
        selectable: false,
        style: {
          width: zoneMetrics.width,
          height: zoneMetrics.height,
          border: 'none',
          background: 'transparent',
        },
        data: { zone },
        zIndex: 0,
      };
    }),
  );

  const ingressNode = model.nodes.find(node => node.kind === 'ingress');
  if (ingressNode) {
    const publicZoneId =
      zoneOrder.find(zoneId => zoneId === 'public') ?? zoneOrder[0];
    const publicZoneMetrics = publicZoneId
      ? zoneLayoutMetrics.get(publicZoneId)
      : undefined;
    const ingressY = publicZoneMetrics
      ? publicZoneMetrics.y + zoneHeaderHeight + zonePaddingTop
      : defaultIngressY;

    flowNodes.push({
      id: ingressNode.id,
      type: 'service',
      position: { x: ingressX, y: ingressY },
      draggable: false,
      selectable: true,
      selected: ingressNode.id === selectedNodeId,
      data: { node: ingressNode },
      style: {
        width: nodeWidth,
      },
      zIndex: 2,
    });
  }

  for (const zoneId of zoneOrder) {
    const zoneNodes = nodesByZone.get(zoneId) ?? [];
    const zoneMetrics = zoneLayoutMetrics.get(zoneId)!;
    const zoneContentY = zoneMetrics.y + zoneHeaderHeight + zonePaddingTop;

    zoneNodes.forEach(node => {
      const column = positionedColumns.get(node.id) ?? 0;
      const row = positionedRows.get(node.id) ?? 0;

      flowNodes.push({
        id: node.id,
        type: 'service',
        position: {
          x: zoneMetrics.x + zonePaddingLeft + column * (nodeWidth + nodeGapX),
          y: zoneContentY + row * (nodeHeight + nodeGapY),
        },
        draggable: false,
        selectable: true,
        selected: node.id === selectedNodeId,
        data: { node },
        style: {
          width: nodeWidth,
        },
        zIndex: 2,
      });
    });
  }

  const flowEdges: Edge[] = model.edges.map(edge => {
    const color = edgeColor(edge.tone);
    const handles = resolveEdgeHandles(edge, nodeById);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      animated: edge.animated,
      label: edge.label,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 20,
        height: 20,
      },
      style: {
        stroke: color,
        strokeWidth: edge.tone === 'dependency' ? 2 : 2.5,
      },
      labelStyle: {
        fill: '#1f2937',
        fontSize: 11,
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: 'rgba(255, 255, 255, 0.92)',
        fillOpacity: 1,
      },
      data: {
        tone: edge.tone,
      },
      zIndex: 1,
    };
  });

  return {
    nodes: flowNodes,
    edges: flowEdges,
  };
}

export function TopologyCanvas({
  model,
  selectedNodeId,
  onSelectedNodeIdChange,
}: {
  model: TopologyModel;
  selectedNodeId?: string;
  onSelectedNodeIdChange: (nodeId?: string) => void;
}) {
  const classes = useTopologyStyles();
  const flow = buildFlow(model, selectedNodeId);
  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onSelectedNodeIdChange(node.id);
  };

  return (
    <div className={classes.canvas}>
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        fitView
        fitViewOptions={{ padding: 0.04 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={handleNodeClick}
        onPaneClick={() => onSelectedNodeIdChange(undefined)}
        zoomOnDoubleClick={false}
        nodeTypes={{
          service: ServiceNodeCard,
          zone: ZoneNode,
        }}
      >
        <Background gap={28} size={1.2} color="rgba(148, 163, 184, 0.22)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
