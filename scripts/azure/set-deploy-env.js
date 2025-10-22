require('dotenv').config();

const { spawn } = require('child_process');

const regionAbbreviations = {
  'West Europe': 'weur',
  'East US': 'eus',
  'East US 2': 'eus2',
  'West US': 'wus',
  'West US 2': 'wus2',
  'Central US': 'cus',
  'North Central US': 'ncus',
  'South Central US': 'scus',
  'North Europe': 'neu',
  'UK South': 'uks',
  'UK West': 'ukw',
  'Southeast Asia': 'sea',
  'East Asia': 'ea',
  'Australia East': 'ae',
  'Australia Southeast': 'ase',
  'Japan East': 'je',
  'Japan West': 'jw',
  'Brazil South': 'bs',
  'Canada Central': 'cc',
  'Canada East': 'ce',
  'Central India': 'ci',
  'South India': 'si',
  'West India': 'wi',
};
const region =
  regionAbbreviations[process.env.DEPLOY_REGION] ||
  process.env.DEPLOY_REGION.toLowerCase().replace(/\s+/g, '');

process.env.AZURE_FUNCTION_NAME =
  'cba-processor-' +
  region +
  '-' +
  process.env.DEPLOY_STAGE +
  '-' +
  process.env.DEPLOY_PROCESSOR;
process.env.AZURE_RESOURCE_GROUP = process.env.AZURE_FUNCTION_NAME + '-rg';

const args = process.argv.slice(2);
if (args.length > 0) {
  const command = args[0];
  const commandArgs = args.slice(1);
  const child = spawn(command, commandArgs, {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  child.on('close', code => {
    process.exit(code);
  });
}
