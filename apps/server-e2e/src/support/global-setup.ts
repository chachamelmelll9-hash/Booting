import * as net from 'net';
import * as http from 'http';
import * as https from 'https';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

async function waitForPortOpen(
  port: number,
  options: { host?: string; timeout?: number } = {}
): Promise<void> {
  const { host = 'localhost', timeout = 30000 } = options;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket();

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for port ${port} to open`));
        } else {
          setTimeout(tryConnect, 100);
        }
      });

      socket.connect(port, host);
    };

    tryConnect();
  });
}

async function waitForHttpOk(
  url: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;
  const startTime = Date.now();
  const client = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const tryRequest = () => {
      const req = client.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
        res.resume();
      });

      req.on('error', () => {
        retry();
      });

      req.setTimeout(5000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for ${url} to respond`));
      } else {
        setTimeout(tryRequest, 1000);
      }
    };

    tryRequest();
  });
}

module.exports = async function () {
  console.log('\nSetting up...\n');

  if (process.env.API_BASE_URL) {
    // Deployed environment: HTTP health check against remote server
    console.log(`Waiting for deployed server: ${process.env.API_BASE_URL}`);
    await waitForHttpOk(process.env.API_BASE_URL);
  } else {
    // Local development: TCP port wait
    const host = process.env.HOST ?? 'localhost';
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await waitForPortOpen(port, { host });
  }

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
