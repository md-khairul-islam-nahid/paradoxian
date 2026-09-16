// Comprehensive end-to-end runner that launches server and runs governance and security tests
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for server at ${url}`));
      } else {
        setTimeout(check, 300);
      }
    };

    check();
  });
}

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> Executing ${path.basename(scriptPath)}...`);
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${path.basename(scriptPath)} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log("Starting server on port 5000...");
  const server = spawn(process.execPath, ['server/server.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe'
  });

  server.stdout.on('data', data => process.stdout.write(`[SERVER] ${data}`));
  server.stderr.on('data', data => process.stderr.write(`[SERVER-ERR] ${data}`));

  try {
    await waitForServer('http://localhost:5000/api/health');
    console.log("Server is ready on port 5000!\n");

    // Run backend governance test
    await runScript(path.join(__dirname, 'test-backend-governance.js'));

    // Run security remediation test
    await runScript(path.join(__dirname, 'test-security-remediation.js'));

    console.log("\n=======================================================");
    console.log("✅ ALL INTEGRATION, GOVERNANCE & SECURITY TESTS PASSED!");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("Test failure:", err.message);
    process.exitCode = 1;
  } finally {
    console.log("Shutting down test server...");
    server.kill('SIGTERM');
  }
}

main();
