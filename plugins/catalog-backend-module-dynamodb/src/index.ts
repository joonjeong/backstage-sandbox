import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';
import { DynamoDbLocationProcessor } from './processor';

export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'dynamodb',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ catalog, logger, config }) {
        catalog.addProcessor(new DynamoDbLocationProcessor(config, logger));
      },
    });
  },
});
