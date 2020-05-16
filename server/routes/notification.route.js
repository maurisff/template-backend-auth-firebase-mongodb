module.exports = (app) => {
  const controller = require('../controllers/notificationController');
  app.route('/notification/send')
    .post(controller.sendNotification);
};
