import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';
import {
  ProjectMetadataEntityProvider,
  createProjectMetadataCatalogSourceRepository,
  getProjectMetadataCatalogSourceOptions,
  recordProjectMetadataProcessingError,
} from '@internal/inhouse-cmdb-node';

export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'inhouse-cmdb-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ catalog, logger, config }) {
        const sourceOptions = getProjectMetadataCatalogSourceOptions(config);
        if (!sourceOptions.enabled) {
          logger.info('Kabang cloud catalog source is disabled');
          return;
        }

        const repository = createProjectMetadataCatalogSourceRepository(config);
        const provider = new ProjectMetadataEntityProvider(
          repository,
          logger,
          sourceOptions.pollIntervalMs,
        );

        catalog.setOnProcessingErrorHandler(event => {
          const projectCode =
            event.unprocessedEntity.metadata.annotations?.[
              'metadata.backstage.io/project-code'
            ];
          const name = event.unprocessedEntity.metadata.name ?? 'unknown';
          const namespace =
            event.unprocessedEntity.metadata.namespace ?? 'default';
          const kind = event.unprocessedEntity.kind ?? 'Component';
          const entityRefHint = `${kind.toLowerCase()}:${namespace}/${name}`;

          if (
            event.unprocessedEntity.spec?.type === 'inhouse-cmdb' ||
            projectCode
          ) {
            recordProjectMetadataProcessingError({
              entityRefHint,
              projectCode,
              errors: event.errors.map(error => error.message),
              capturedAt: new Date().toISOString(),
            });
            logger.error(
              `Kabang cloud catalog processing failed for ${entityRefHint}: ${event.errors
                .map(error => error.message)
                .join('; ')}`,
            );
          }
        });

        catalog.addEntityProvider(provider);
        logger.info('Registered inhouse-cmdb catalog source');
      },
    });
  },
});
