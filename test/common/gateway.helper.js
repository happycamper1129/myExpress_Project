const yaml = require('js-yaml');
const fs = require('fs');
const { fork } = require('child_process');
const path = require('path');
const request = require('superagent');
const util = require('util');
const _cpr = util.promisify(require('cpr'));
const { generateBackendServer, findOpenPortNumbers } = require('../common/server-helper');
let gatewayPort = null;
let adminPort = null;
let backendPort = null;

// Set gateway.config or system.config yml files
module.exports.setYmlConfig = function ({ ymlConfigPath, newConfig }) {
  fs.writeFileSync(ymlConfigPath, yaml.dump(newConfig));
};

// Get config by path (gateway.config.yml or system.config.yml)
module.exports.getYmlConfig = function ({ ymlConfigPath }) {
  const content = fs.readFileSync();
  return yaml.load(content);
};

module.exports.startGatewayInstance = function ({ dirInfo, gatewayConfig }) {
  return findOpenPortNumbers(4)
    .then(ports => {
      gatewayPort = ports[0];
      backendPort = ports[1];
      adminPort = ports[2];

      gatewayConfig.http = { port: gatewayPort };
      gatewayConfig.admin = { port: adminPort };
      gatewayConfig.serviceEndpoints = gatewayConfig.serviceEndpoints || {};
      gatewayConfig.serviceEndpoints.backend = { url: `http://localhost:${backendPort}` };
      return this.setYmlConfig({
        ymlConfigPath: dirInfo.gatewayConfigPath,
        newConfig: gatewayConfig
      });
    })
    .then(() => _cpr(path.join(__dirname, '../../lib/config/models'), path.join(dirInfo.configDirectoryPath, 'models'), { overwrite: true }))
    .then(() => generateBackendServer(backendPort))
    .then(({ app }) => {
      return new Promise((resolve, reject) => {
        const childEnv = Object.assign({}, process.env);
        childEnv.EG_CONFIG_DIR = dirInfo.configDirectoryPath;
        // Tests, by default have config watch disabled.
        // Need to remove this paramter in the child process.
        delete childEnv.EG_DISABLE_CONFIG_WATCH;

        const modulePath = path.join(__dirname, '..', '..',
          'lib', 'index.js');
        const gatewayProcess = fork(modulePath, [], {
          cwd: dirInfo.basePath,
          env: childEnv,
          stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        gatewayProcess.on('error', reject);
        gatewayProcess.stdout.on('data', () => {
          request
            .get(`http://localhost:${gatewayPort}/not-found`)
            .ok(res => true)
            .end((err, res) => {
              if (err) {
                gatewayProcess.kill();
                reject(err);
              }
              resolve({ gatewayProcess, gatewayPort, adminPort, backendPort, dirInfo, backendServer: app });
            });
        });
      });
    });
};
