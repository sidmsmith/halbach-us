'use strict';

const { handleAvailabilityGet } = require('../lib/availability-handler');

module.exports = async (req, res) => {
  await handleAvailabilityGet(req, res);
};
