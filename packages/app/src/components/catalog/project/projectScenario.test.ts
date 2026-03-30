import {
  buildProjectEntityYaml,
  projectScenarioValuesFromEntity,
} from './projectScenario';

describe('projectScenario', () => {
  it('builds project yaml with placeholders for missing values', () => {
    expect(
      buildProjectEntityYaml({
        name: '',
        title: '',
        description: '',
        owner: '',
        team: '',
      }),
    ).toContain('name: <project-name>');
  });

  it('extracts editable values from an existing project entity', () => {
    expect(
      projectScenarioValuesFromEntity({
        apiVersion: 'kabang.cloud/v1',
        kind: 'Project',
        metadata: {
          name: 'guest-portal',
          title: 'Guest Portal',
          description: 'Portal project metadata',
        },
        spec: {
          owner: 'user:default/guest',
          team: 'group:default/guests',
        },
      }),
    ).toEqual({
      name: 'guest-portal',
      title: 'Guest Portal',
      description: 'Portal project metadata',
      owner: 'user:default/guest',
      team: 'group:default/guests',
    });
  });
});
