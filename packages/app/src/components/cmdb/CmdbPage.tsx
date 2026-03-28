import { Link as RouterLink } from 'react-router-dom';
import {
  CodeSnippet,
  Content,
  Header,
  InfoCard,
  Link,
  Page,
} from '@backstage/core-components';
import {
  Box,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  makeStyles,
  Theme,
  Typography,
} from '@material-ui/core';

const templateRoute = '/create/templates/default/inhouse-cmdb-template';

const useStyles = makeStyles((theme: Theme) => ({
  hero: {
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.common.white,
    background:
      'linear-gradient(135deg, rgba(18,52,86,1) 0%, rgba(15,98,254,0.92) 52%, rgba(12,151,120,0.88) 100%)',
  },
  heroMetric: {
    minWidth: 140,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(3),
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  listDense: {
    paddingTop: 0,
    paddingBottom: 0,
  },
}));

const metadataBlueprint = `project:
  project_code: PAYMENTS
  project_name: Payments Platform
  project_description: Append-only metadata source for the payments domain
storage:
  write_model: event_log
  latest_projection: catalog_entity`;

const metadataAreas = [
  {
    title: '필수 필드',
    items: ['project_code', 'project_name', 'project_description'],
  },
  {
    title: '쓰기 모델',
    items: ['Append-only 입력', '프로젝트별 이력 보존', '최신 스냅샷 갱신'],
  },
  {
    title: '읽기 모델',
    items: ['Latest 조회 API', 'Catalog Source 옵션', 'SQLite 로컬 테스트'],
  },
];

const launchChecklist = [
  'writer 와 catalogSource 를 분리해 쓰기 경로와 Catalog 읽기 경로를 독립적으로 선택',
  '운영은 DynamoDB, 로컬/테스트는 SQLite로 같은 저장소 계약을 유지',
  'API는 append-only 이벤트를 저장하고 latest 조회와 history 조회를 동시에 제공',
  'Catalog는 latest projection만 읽어 Component 엔티티로 투영',
  'DynamoDB에서는 트래픽이 커지면 latest 전용 GSI 또는 별도 projection 최적화가 필요',
];

export const CmdbPage = () => {
  const classes = useStyles();

  return (
    <Page themeId="tool">
      <Header
        title="Inhouse CMDB"
        subtitle="Scaffolder 입력, append-only 저장, Catalog latest projection을 연결한 Inhouse CMDB 초안"
      />
      <Content>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box className={classes.hero}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h4">
                    입력은 append-only, Catalog는 latest 상태만 노출
                  </Typography>
                  <Typography variant="body1">
                    이 페이지는 Scaffolder로 프로젝트 메타데이터를 입력하고,
                    백엔드는 writer 설정에 따라 DynamoDB 또는 SQLite에
                    append-only로 저장한 뒤, catalogSource 옵션이 켜져 있으면
                    Catalog EntityProvider가 최신 상태만 엔티티로 공급하는
                    흐름을 설명합니다.
                  </Typography>
                  <div className={classes.chipRow}>
                    <Chip label="Scaffolder Form" />
                    <Chip label="Append-only Store" />
                    <Chip label="Latest Projection" />
                    <Chip label="Catalog Provider" />
                  </div>
                  <div className={classes.actions}>
                    <Button
                      color="primary"
                      component={RouterLink}
                      to={templateRoute}
                      variant="contained"
                    >
                      Inhouse CMDB 템플릿 실행
                    </Button>
                    <Button
                      component={RouterLink}
                      to="/create"
                      variant="outlined"
                    >
                      전체 템플릿 보기
                    </Button>
                  </div>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <div className={classes.heroMetric}>
                        <Typography variant="subtitle2">핵심 필드</Typography>
                        <div className={classes.statValue}>3</div>
                        <Typography variant="body2">
                          code, name, description
                        </Typography>
                      </div>
                    </Grid>
                    <Grid item xs={6}>
                      <div className={classes.heroMetric}>
                        <Typography variant="subtitle2">온보딩 단계</Typography>
                        <div className={classes.statValue}>3</div>
                        <Typography variant="body2">
                          입력, 검토, 실행
                        </Typography>
                      </div>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {metadataAreas.map(area => (
            <Grid item xs={12} md={4} key={area.title}>
              <InfoCard title={area.title}>
                <List className={classes.listDense} dense>
                  {area.items.map(item => (
                    <ListItem key={item}>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </InfoCard>
            </Grid>
          ))}

          <Grid item xs={12} md={7}>
            <InfoCard title="추천 폼 구조">
              <Typography paragraph variant="body2">
                Scaffolder 템플릿은 현재 세 개의 필수 필드만 입력받도록
                줄였습니다. 확장은 가능하지만, append-only 모델에서는 먼저
                식별자와 설명처럼 변경 추적 가치가 높은 필드부터 고정하는 편이
                안전합니다.
              </Typography>
              <CodeSnippet language="yaml" text={metadataBlueprint} />
            </InfoCard>
          </Grid>

          <Grid item xs={12} md={5}>
            <InfoCard title="초안에서 바로 검증할 것">
              <List className={classes.listDense}>
                {launchChecklist.map(item => (
                  <ListItem key={item}>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </InfoCard>
          </Grid>

          <Grid item xs={12}>
            <InfoCard title="다음 연결 포인트">
              <Typography variant="body2">
                현재 초안에는 Inhouse CMDB 수집 폼 템플릿과 백엔드 저장소 구조를
                함께 맞춰 두었습니다. 다음 단계에서는 Scaffolder action 또는
                프런트엔드 폼을 `/api/inhouse-cmdb/projects` API에 연결하면
                됩니다. 템플릿 진입 경로는{' '}
                <Link to={templateRoute}>{templateRoute}</Link> 입니다.
              </Typography>
            </InfoCard>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
