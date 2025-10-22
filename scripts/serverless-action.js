require('dotenv').config();

const { spawn } = require('child_process');

const stage = process.env.DEPLOY_STAGE || 'dev';
const action = process.argv[2];
const config = process.argv[3];

const serverless = spawn(
  'serverless',
  [action, '--stage', stage, '--config', config],
  {
    stdio: 'inherit',
    shell: true,
  }
);

serverless.on('close', code => {
  process.exit(code);
});
