
module.exports = (app) => {
  const controller = require('../controllers/messagingToken.controller');
  app.route('/messagingtoken/')
    .post(controller.postMessagingToken)
    .delete(controller.deleteMessagingToken);
};
