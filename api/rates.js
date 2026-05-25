'use strict';

const { handleRatesRequest } = require('../lib/rates-handler');

module.exports = async (req, res) => {
  await handleRatesRequest(req, res);
};
