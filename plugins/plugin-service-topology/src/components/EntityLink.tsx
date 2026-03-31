import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import { parseEntityRef } from '@backstage/catalog-model';
import { useTopologyStyles } from './topologyStyles';

function getEntityHref(entityRef: string): string {
  const parsed = parseEntityRef(entityRef);

  return `/catalog/${parsed.namespace ?? 'default'}/${parsed.kind.toLocaleLowerCase(
    'en-US',
  )}/${parsed.name}`;
}

export function EntityLinkWithIcon({
  entityRef,
  label,
}: {
  entityRef: string;
  label?: string;
}) {
  const classes = useTopologyStyles();

  return (
    <a
      href={getEntityHref(entityRef)}
      target="_blank"
      rel="noreferrer"
      className={classes.entityLink}
    >
      <span>{label ?? entityRef}</span>
      <OpenInNewIcon className={classes.entityLinkIcon} />
    </a>
  );
}
