import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import {
  createTemplateAction,
  scaffolderActionsExtensionPoint,
} from '@backstage/plugin-scaffolder-node';
import {
  createProjectMetadataWriterRepository,
  parseAppendProjectMetadataInput,
} from '@internal/inhouse-cmdb-node';

export default createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'inhouse-cmdb-action',
  register(reg) {
    reg.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ scaffolder, config, logger }) {
        const repository = createProjectMetadataWriterRepository(config);

        scaffolder.addActions(
          createTemplateAction({
            id: 'inhouse-cmdb:append',
            description:
              'Append a new inhouse-cmdb metadata event to the configured metadata store',
            schema: {
              input: {
                projectCode: z =>
                  z
                    .string()
                    .min(1)
                    .describe(
                      'Stable project identifier used as partition key',
                    ),
                projectName: z =>
                  z.string().min(1).describe('Human-readable project name'),
                projectDescription: z =>
                  z.string().min(1).describe('Current project description'),
              },
              output: {
                eventId: z => z.string(),
                projectCode: z => z.string(),
                createdAt: z => z.string(),
              },
            },
            async handler(ctx) {
              const record = await repository.append(
                parseAppendProjectMetadataInput(ctx.input),
              );

              logger.info(
                `inhouse-cmdb metadata appended from scaffolder for ${record.projectCode}`,
              );

              ctx.output('eventId', record.eventId);
              ctx.output('projectCode', record.projectCode);
              ctx.output('createdAt', record.createdAt);
            },
          }),
        );

        logger.info('Registered scaffolder action inhouse-cmdb:append');
      },
    });
  },
});
