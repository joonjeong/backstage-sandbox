import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigReader } from '@backstage/config';
import {
  createSqliteProjectMetadataRepositoryForTests,
  getProjectMetadataCatalogSourceOptions,
} from './index';

describe('SqliteProjectMetadataRepository', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'inhouse-cmdb-'));
  const dbPath = join(tempDir, 'metadata.db');

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('stores append-only history and returns the latest row', async () => {
    const repository = createSqliteProjectMetadataRepositoryForTests(dbPath);

    const first = await repository.append({
      projectCode: 'PAYMENTS',
      projectName: 'Payments',
      projectDescription: 'First version',
    });

    await new Promise(resolve => setTimeout(resolve, 5));

    const second = await repository.append({
      projectCode: 'PAYMENTS',
      projectName: 'Payments Platform',
      projectDescription: 'Second version',
    });

    const latest = await repository.getLatest('PAYMENTS');
    const history = await repository.listHistory('PAYMENTS');
    const latestList = await repository.listLatest();

    expect(latest?.eventId).toBe(second.eventId);
    expect(latest?.projectName).toBe('Payments Platform');
    expect(history.map(item => item.eventId)).toEqual([
      second.eventId,
      first.eventId,
    ]);
    expect(latestList).toHaveLength(1);
    expect(latestList[0].eventId).toBe(second.eventId);
  });
});

describe('project metadata config', () => {
  it('reads inhouse-cmdb settings from app config', () => {
    const config = new ConfigReader({
      'inhouse-cmdb': {
        catalogSource: {
          enabled: false,
          pollIntervalSeconds: 5,
        },
      },
    });

    expect(getProjectMetadataCatalogSourceOptions(config)).toEqual({
      enabled: false,
      pollIntervalMs: 5000,
    });
  });
});
