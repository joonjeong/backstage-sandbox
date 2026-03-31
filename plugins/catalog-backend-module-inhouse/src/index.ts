import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';
import { ProjectDomainProcessor } from './entity-extensions/domain/project/processor';
import { EdgeStackSystemProcessor } from './entity-extensions/system/edge-stack/processor';

export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'inhouse',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ catalog, logger, config }) {
        catalog.addProcessor(new ProjectDomainProcessor(config, logger));
        catalog.addProcessor(new EdgeStackSystemProcessor(config, logger));
      },
    });
  },
});
