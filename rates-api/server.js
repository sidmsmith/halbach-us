'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { handleRatesRequest } = require('./lib/rates-handler');

const PORT = Number(process.env.PORT) || 3000;
const staticRoot = path.join(__dirname, '..', 'halbach_us_reconstruction');

const app = express();

app.use(cors({ origin: true }));

app.get('/api/rates', (req, res) => {
  handleRatesRequest(req, res);
});

app.use(express.static(staticRoot));

app.listen(PORT, () => {
  console.log('Halbach rates API + static site at http://localhost:' + PORT);
  console.log('Rates endpoint: http://localhost:' + PORT + '/api/rates?from=2026-06-01&to=2027-12-31');
  console.log('Open rates page: http://localhost:' + PORT + '/rates.html');
});
