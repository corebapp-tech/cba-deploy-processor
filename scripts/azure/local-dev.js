require('dotenv').config();

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const AdmZip = require('adm-zip');

class LocalDev {
  constructor() {
    this.localDir = './.local';
    this.serverlessDir = './.serverless';
  }

  async cleanup() {
    console.log('🧹 Cleaning up previous builds...');
    if (fs.existsSync(this.localDir)) {
      fs.rmSync(this.localDir, { recursive: true, force: true });
    }
    if (fs.existsSync(this.serverlessDir)) {
      fs.rmSync(this.serverlessDir, { recursive: true, force: true });
    }
  }

  async serverlessBuild() {
    console.log('📦 Running serverless package...');
    return new Promise((resolve, reject) => {
      const buildProcess = spawn(
        'serverless',
        ['package', '--stage', 'dev', '--config', 'serverless-azure.yml'],
        {
          stdio: 'pipe',
          shell: true,
        }
      );
      let output = '';
      let error = '';
      buildProcess.stdout.on('data', data => {
        const text = data.toString();
        output += text;
        console.log(text.trim());
      });
      buildProcess.stderr.on('data', data => {
        const text = data.toString();
        error += text;
        console.error(text.trim());
      });
      buildProcess.on('close', code => {
        if (code === 0) {
          console.log('✅ Serverless package completed successfully');
          resolve(output);
        } else {
          console.error('❌ Serverless package failed');
          reject(
            new Error(`Serverless package failed with code ${code}: ${error}`)
          );
        }
      });
    });
  }

  extractZip(zipPath) {
    console.log('📂 Extracting ZIP to .local directory...');
    if (!fs.existsSync(this.localDir)) {
      fs.mkdirSync(this.localDir, { recursive: true });
    }
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(this.localDir, true);
      console.log('✅ ZIP extracted successfully');
    } catch (error) {
      throw new Error(`Failed to extract ZIP: ${error.message}`);
    }
  }

  copyConfigFiles() {
    console.log('⚙️ Copying configuration files...');
    if (fs.existsSync('host.json')) {
      fs.copyFileSync('host.json', path.join(this.localDir, 'host.json'));
    }
    const defaultSettings = {
      IsEncrypted: false,
      Values: {
        AzureWebJobsStorage: 'UseDevelopmentStorage=true',
        FUNCTIONS_WORKER_RUNTIME: 'node',
        FUNCTIONS_EXTENSION_VERSION: '~4',
      },
      Host: {
        LocalHttpPort: 7071,
        CORS: '*',
      },
    };
    fs.writeFileSync(
      path.join(this.localDir, 'local.settings.json'),
      JSON.stringify(defaultSettings, null, 2)
    );
    console.log('✅ Configuration files ready');
  }

  loadEnvironmentFiles() {
    console.log('🔑 Load processor environment files...');
    const envFiles = glob.sync(
      path.join(`src/processor/${process.env.DEPLOY_PROCESSOR}`, '.env*')
    );
    envFiles.forEach(file => console.log(`- ${file}`));
    envFiles.forEach(file => {
      require('dotenv').config({ path: file });
      console.log(`✓ Loaded ${file}`);
    });
    console.log('✅ Environment files loaded');
  }

  async startFuncHost() {
    console.log('🚀 Starting Azure Functions host...');
    return new Promise((resolve, reject) => {
      const funcProcess = spawn('func', ['start'], {
        cwd: this.localDir,
        stdio: 'inherit',
        shell: true,
        env: process.env,
      });
      funcProcess.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`func start exited with code ${code}`));
        }
      });
      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping local development server...');
        funcProcess.kill('SIGINT');
        process.exit(0);
      });
    });
  }
  async run() {
    try {
      console.log('🎯 Starting local development workflow...\n');

      await this.cleanup();
      await this.serverlessBuild();

      const zipPath = path.join(
        this.serverlessDir,
        `${process.env.DEPLOY_PROCESSOR}.zip`
      );
      this.extractZip(zipPath);
      this.copyConfigFiles();
      this.loadEnvironmentFiles();

      console.log('\n🎉 Setup complete! Starting local server...\n');
      await this.startFuncHost();
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const dev = new LocalDev();
  dev.run();
}
