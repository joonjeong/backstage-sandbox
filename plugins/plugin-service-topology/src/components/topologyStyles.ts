import { makeStyles } from '@material-ui/core';

export const useTopologyStyles = makeStyles(theme => ({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
  },
  wrapper: {
    minHeight: 700,
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    background:
      'radial-gradient(circle at top left, rgba(33, 150, 243, 0.08), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%)',
  },
  canvas: {
    flex: 1,
    height: 700,
    minWidth: 0,
  },
  canvasLane: {
    width: 360,
    minWidth: 360,
    height: 700,
    padding: theme.spacing(2),
    boxSizing: 'border-box',
    borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
    background:
      theme.palette.type === 'dark'
        ? 'rgba(15, 23, 42, 0.4)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.74) 0%, rgba(248, 250, 252, 0.96) 100%)',
  },
  nodeCard: {
    width: '100%',
    borderRadius: 18,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
    background: '#ffffff',
    cursor: 'pointer',
    transition:
      'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
  },
  nodeCardSelected: {
    transform: 'translateY(-2px)',
    boxShadow: '0 22px 48px rgba(37, 99, 235, 0.22)',
    borderColor: 'rgba(37, 99, 235, 0.42)',
  },
  nodeCardPublic: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f2f8ff 100%)',
    borderColor: 'rgba(30, 136, 229, 0.32)',
  },
  nodeCardDns: {
    background: 'linear-gradient(180deg, #ffffff 0%, #eef6ff 100%)',
    borderColor: 'rgba(37, 99, 235, 0.4)',
    boxShadow: '0 14px 28px rgba(37, 99, 235, 0.1)',
  },
  nodeCardPrivate: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)',
  },
  nodeCardExternal: {
    background: 'linear-gradient(180deg, #ffffff 0%, #faf5ee 100%)',
    borderStyle: 'dashed',
  },
  nodeCardIngress: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    color: '#fff',
    borderColor: 'rgba(29, 78, 216, 0.4)',
  },
  nodeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  nodeTitle: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#111827',
  },
  nodeTitleLight: {
    color: '#ffffff',
  },
  nodeSubtitle: {
    color: 'rgba(15, 23, 42, 0.82)',
    fontSize: '0.78rem',
    lineHeight: 1.4,
  },
  nodeSubtitleLight: {
    color: 'rgba(255, 255, 255, 0.94)',
  },
  nodeBadge: {
    textTransform: 'uppercase',
    fontSize: '0.64rem',
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  zoneCard: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    border: '1px solid rgba(148, 163, 184, 0.34)',
    background: 'rgba(255, 255, 255, 0.82)',
    backdropFilter: 'blur(3px)',
    padding: theme.spacing(2.5),
    boxSizing: 'border-box',
  },
  zoneHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
    position: 'relative',
    zIndex: 1,
  },
  zoneTitle: {
    fontSize: '0.82rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  zoneDescription: {
    fontSize: '0.75rem',
    color: 'rgba(15, 23, 42, 0.76)',
  },
  selectedLane: {
    height: '100%',
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    boxShadow:
      theme.palette.type === 'dark'
        ? '0 12px 28px rgba(0, 0, 0, 0.32)'
        : '0 12px 28px rgba(15, 23, 42, 0.08)',
    padding: theme.spacing(2),
  },
  empty: {
    padding: theme.spacing(6),
    textAlign: 'center',
  },
  inspector: {
    height: '100%',
  },
  selectedGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2.5),
  },
  selectedPrimary: {
    minWidth: 0,
  },
  selectedSection: {
    marginTop: theme.spacing(2),
  },
  selectedSectionTitle: {
    color: theme.palette.text.primary,
    fontWeight: 800,
    fontSize: '0.85rem',
    marginBottom: theme.spacing(1),
  },
  selectedSectionHint: {
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
    marginBottom: theme.spacing(1.5),
  },
  inspectorTitle: {
    fontWeight: 800,
    marginBottom: theme.spacing(0.5),
    color: theme.palette.text.primary,
  },
  inspectorSubtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1.5),
  },
  inspectorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  inspectorLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  inspectorValue: {
    fontWeight: 700,
    textAlign: 'right',
    color: theme.palette.text.primary,
  },
  inspectorHint: {
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  entityLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: theme.palette.primary.main,
    fontWeight: 700,
    textDecoration: 'none',
  },
  entityLinkIcon: {
    fontSize: '0.95rem',
  },
  cellTitle: {
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  cellSubtle: {
    color: theme.palette.text.secondary,
  },
  chipCompact: {
    fontSize: '0.68rem',
    fontWeight: 700,
  },
  resourceDiagram: {
    marginTop: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
  },
  resourceNode: {
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.type === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : '#ffffff',
    padding: theme.spacing(1.25),
    minWidth: 170,
    maxWidth: 220,
    width: '100%',
    textAlign: 'center',
  },
  resourceNodeTitle: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  resourceNodeSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: '0.78rem',
    marginTop: theme.spacing(0.5),
  },
  resourceArrow: {
    color: theme.palette.primary.main,
    fontWeight: 800,
    fontSize: '1.1rem',
    lineHeight: 1,
    padding: theme.spacing(0.25, 0),
  },
}));
