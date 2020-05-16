/* eslint-disable global-require */

module.exports = (app) => {
  const controller = require('../controllers/authentication.controller');

  app.route('/authentication/registration')
    .post(controller.registration);
};
