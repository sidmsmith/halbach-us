'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { runAvailabilitySync } = require('../lib/availability-handler');

runAvailabilitySync()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
