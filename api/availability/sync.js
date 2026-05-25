'use strict';

const { handleAvailabilitySyncRequest } = require('../../lib/availability-handler');

async function handler(req, res) {
  await handleAvailabilitySyncRequest(req, res);
}

module.exports = handler;
