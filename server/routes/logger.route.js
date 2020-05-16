module.exports = (app) => {
  const controller = require('../controllers/logger.controller');
  app.route('/logclientprovider/list')
    .get(controller.list);
  app.route('/logclientprovider/logger')
    .post(controller.create);
};
