import express from 'express';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import {
  createProjectMetadataCatalogSourceRepository,
  createProjectMetadataWriterRepository,
  getProjectMetadataProcessingErrors,
  parseAppendProjectMetadataInput,
  toProjectMetadataEntityRef,
} from '@internal/inhouse-cmdb-node';

export default createBackendPlugin({
  pluginId: 'inhouse-cmdb',
  register(reg) {
    reg.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        auth: coreServices.auth,
        catalog: catalogServiceRef,
      },
      async init({ httpRouter, logger, config, auth, catalog }) {
        const writerRepository = createProjectMetadataWriterRepository(config);
        const catalogSourceRepository =
          createProjectMetadataCatalogSourceRepository(config);
        const router = express.Router();

        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/projects/latest',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/projects/:projectCode/latest',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/projects/:projectCode/history',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/debug/catalog-status',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/debug/processing-errors',
          allow: 'unauthenticated',
        });

        router.use(express.json());

        router.get('/health', (_req, res) => {
          res.json({ status: 'ok' });
        });

        router.post('/projects', async (req, res, next) => {
          try {
            const record = await writerRepository.append(
              parseAppendProjectMetadataInput(req.body),
            );
            logger.info(
              `inhouse-cmdb metadata appended for ${record.projectCode}`,
            );
            res.status(201).json(record);
          } catch (error) {
            next(error);
          }
        });

        router.get('/projects/:projectCode/latest', async (req, res, next) => {
          try {
            const record = await writerRepository.getLatest(
              req.params.projectCode,
            );
            if (!record) {
              res.status(404).json({ error: 'not_found' });
              return;
            }
            res.json(record);
          } catch (error) {
            next(error);
          }
        });

        router.get('/projects/:projectCode/history', async (req, res, next) => {
          try {
            const history = await writerRepository.listHistory(
              req.params.projectCode,
            );
            res.json({ items: history });
          } catch (error) {
            next(error);
          }
        });

        router.get('/projects/latest', async (_req, res, next) => {
          try {
            const items = await writerRepository.listLatest();
            res.json({ items });
          } catch (error) {
            next(error);
          }
        });

        router.get('/debug/catalog-status', async (_req, res, next) => {
          try {
            const credentials = await auth.getOwnServiceCredentials();
            const items = await catalogSourceRepository.listLatest();
            const processingErrors = getProjectMetadataProcessingErrors();
            const result = await Promise.all(
              items.map(async item => {
                const entityRef = toProjectMetadataEntityRef(item.projectCode);
                const entity = await catalog.getEntityByRef(entityRef, {
                  credentials,
                });
                const matchingProcessingError =
                  processingErrors.find(
                    error => error.entityRefHint === entityRef,
                  ) ??
                  processingErrors.find(
                    error => error.projectCode === item.projectCode,
                  );

                return {
                  projectCode: item.projectCode,
                  projectName: item.projectName,
                  expectedEntityRef: entityRef,
                  catalogEntityFound: Boolean(entity),
                  catalogEntityTitle: entity?.metadata.title,
                  catalogEntityDescription: entity?.metadata.description,
                  latestEventId: item.eventId,
                  latestCreatedAt: item.createdAt,
                  processingErrors: matchingProcessingError?.errors ?? [],
                };
              }),
            );

            res.json({ items: result });
          } catch (error) {
            next(error);
          }
        });

        router.get('/debug/processing-errors', (_req, res) => {
          res.json({ items: getProjectMetadataProcessingErrors() });
        });

        httpRouter.use(router);
      },
    });
  },
});
