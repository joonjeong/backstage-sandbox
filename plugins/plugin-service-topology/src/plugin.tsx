import { createFrontendPlugin } from '@backstage/frontend-plugin-api';

export const serviceTopologyPlugin = createFrontendPlugin({
  pluginId: 'service-topology',
  extensions: [],
});
