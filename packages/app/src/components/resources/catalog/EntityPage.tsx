import { EntitySwitch, isKind } from '@backstage/plugin-catalog';
import { type Entity } from '@backstage/catalog-model';
import { isProjectDomainEntity } from '../project/projectDomain';
import { apiEntityPage } from './entityPage/apiEntityPage';
import { componentEntityPage } from './entityPage/componentEntityPage';
import { defaultEntityPage } from './entityPage/defaultEntityPage';
import { domainEntityPage } from './entityPage/domainEntityPage';
import { groupEntityPage } from './entityPage/groupEntityPage';
import { ProjectEntityPage } from './entityPage/ProjectEntityPage';
import { entityWarningContent } from './entityPage/shared';
import { systemEntityPage } from './entityPage/systemEntityPage';
import { userEntityPage } from './entityPage/userEntityPage';

export const entityPage = (
  <EntitySwitch>
    <EntitySwitch.Case
      if={isKind('component')}
      children={componentEntityPage}
    />
    <EntitySwitch.Case if={isKind('api')} children={apiEntityPage} />
    <EntitySwitch.Case if={isKind('group')} children={groupEntityPage} />
    <EntitySwitch.Case if={isKind('user')} children={userEntityPage} />
    <EntitySwitch.Case if={isKind('system')} children={systemEntityPage} />
    <EntitySwitch.Case
      if={(entity: Entity) => isProjectDomainEntity(entity)}
      children={
        <ProjectEntityPage entityWarningContent={entityWarningContent} />
      }
    />
    <EntitySwitch.Case if={isKind('domain')} children={domainEntityPage} />

    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);
