/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */

const repository = require('../repositories/usuario.repository');
const firebaseHelper = require('../helper/firebase');
const ResponseInfor = require('../util/ResponseInfo');


exports.sendNotification = async (req, res) => {
  try {
    // console.log('req.boby', req.body);
    const { id, uid, message } = req.body;
    let usuario = null;
    if (id) {
      usuario = await repository.get(id);
    } else {
      usuario = await repository.getByUID(uid);
    }
    if (usuario && usuario._id) {
      setTimeout(() => {
        firebaseHelper.sendNotificationToUser(usuario._id, message);
      }, 3000);
    }
    res.status(200).json(new ResponseInfor(true, 'Mensagem enviada!'));
  } catch (error) {
    console.log('sendNotification - Error: ', error);
    res.status(400).json(new ResponseInfor(false, error));
  }
};
