
const firebaseAdmin = require('firebase-admin');
const repository = require('../repositories/messagingToken.repository');

exports.sendNotificationToUser = async (userId, notification) => {
  try {
    const {
      title = '', body = '', icon = '', url = '', actions = '',
    } = notification;
    // console.log('notification: ', notification, userId);
    const messagingTokens = await repository.listarByFilter({ usuarioId: userId });
    // console.log('messagingTokens: ', messagingTokens);
    if (!messagingTokens || messagingTokens.length === 0) {
      return;
    }
    let token = null;
    let tokens = null;
    if (messagingTokens.length === 1) {
      token = messagingTokens[0].token;
    } else {
      tokens = await messagingTokens.map((t) => t.token);
    }
    /**
     * notification: {
     *   title: 'New message',
     *   body: 'Text message',
     *   icon: 'info.png',
     *   url: 'http://yourapp.com/', // URL action when clicking on the message
     *   actions: [
     *    {
     *      action: 'view-profile',
     *      urlAction: 'http://yourapp.com/profile',
     *      title: 'View your profile',
     *      icon: 'action-view-profile-128x128.png'
     *    },
     *  ]
     * }
     */
    const message = {
      data: {
        title,
        body,
        icon,
        url,
        actions,
      }, /*
      webpush: {
        fcm_options: {
          link: url,
        },
      }, */
    };
    if (token) {
      message.token = token;
      firebaseAdmin.messaging().send(message).catch((error) => {
        if (error.code === 'messaging/registration-token-not-registered') {
          repository.findeAndDelete({ token });
        } else {
          console.log('Firebase.sendNotification.messaging().send - Error: ', error);
        }
      });
    } else if (tokens && tokens.length > 0) {
      message.tokens = tokens;
      firebaseAdmin.messaging().sendMulticast(message).then((response) => {
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              repository.findeAndDelete({ token: tokens[idx] });
            }
          });
        }
      }).catch((error) => {
        console.log('Firebase.sendNotification.messaging().sendMulticast - Error: ', error);
      });
    }
  } catch (error) {
    console.log('Firebase.sendNotification - Error: ', error);
  }
};
