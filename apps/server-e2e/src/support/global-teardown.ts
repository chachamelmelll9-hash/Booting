/* eslint-disable */

module.exports = async function () {
  // The server under test is started and stopped by the caller
  // (implement-orchestrator / e2e-verify), never by this suite.
  // Do not kill ports here — retest loops reuse the running server.
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
