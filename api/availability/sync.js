'use strict';

const { handleAvailabilitySyncRequest } = require('../../lib/availability-handler');

async function handler(req, res) {
  await handleAvailabilitySyncRequest(req, res);
}

handler.config = {
  maxDuration: 60,
};

module.exports = handler;
