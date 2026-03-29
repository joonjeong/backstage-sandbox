DROP TABLE IF EXISTS project_metadata;

CREATE TABLE project_metadata (
  id INTEGER PRIMARY KEY,
  source_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  owner_ref TEXT NOT NULL,
  team_ref TEXT NOT NULL,
  modified_at TEXT NOT NULL
);

INSERT INTO project_metadata (
  id,
  source_name,
  project_name,
  project_title,
  project_description,
  owner_ref,
  team_ref,
  modified_at
) VALUES
  (
    1,
    'sample-projects',
    'guest-portal',
    'Guest Portal',
    'Portal project metadata loaded from the sample sqlite catalog source.',
    'guest',
    'guests',
    '2026-03-29T00:00:00.000Z'
  ),
  (
    2,
    'sample-projects',
    'guest-ops-console',
    'Guest Ops Console',
    'Operations console project metadata loaded from the sample sqlite catalog source.',
    'user:default/guest',
    'group:default/guests',
    '2026-03-29T00:05:00.000Z'
  ),
  (
    3,
    'sample-projects',
    'app-webview',
    'App Webview',
    'Static webview project with a public TLS/mTLS gateway, segmented private subnets, and Kubernetes-backed application traffic.',
    'user:default/guest',
    'group:default/guests',
    '2026-03-30T00:00:00.000Z'
  );
