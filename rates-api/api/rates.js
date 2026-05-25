'use strict';

require('dotenv').config();

const { handleRatesRequest } = require('../lib/rates-handler');

module.exports = async (req, res) => {
  await handleRatesRequest(req, res);
};
