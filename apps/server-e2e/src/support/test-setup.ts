/* eslint-disable */

module.exports = async function () {
  // API_BASE_URL takes precedence (for deployed environment testing)
  // Falls back to HOST/PORT for local development
  process.env.API_BASE_URL =
    process.env.API_BASE_URL ??
    `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? '3000'}`;
};
