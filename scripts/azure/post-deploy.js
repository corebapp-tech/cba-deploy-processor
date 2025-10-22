const { execSync } = require('child_process');

const functionName = process.env.AZURE_FUNCTION_NAME;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;

console.log('🚀 Setting Azure Function app settings');
try {
  const command = `az functionapp config appsettings set --name "${functionName}" --resource-group "${resourceGroup}" --settings "FUNCTIONS_EXTENSION_VERSION=~4" --output none`;
  console.log('📋 Executing:', command);
  const result = execSync(command, {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  console.log('✅ Azure deployment completed successfully');
} catch (error) {
  console.error('❌ Azure deployment failed:', error.message);
  process.exit(1);
}
