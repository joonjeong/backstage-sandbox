import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';
import { ProjectProcessor } from './processor';

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
        catalog.addProcessor(new ProjectProcessor(config, logger));
      },
    });
  },
});
