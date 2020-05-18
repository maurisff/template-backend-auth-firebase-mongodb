/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */

const repository = require('../repositories/messagingToken.repository');
const ResponseInfor = require('../util/ResponseInfo');

exports.postMessagingToken = async (req, res) => {
  try {
    const { token } = req.body;
    const { usuarioId } = req.headers;
    if (!token) {
      res.status(200).json(new ResponseInfor(false, 'messagingToken client is null.'));
      return;
    }
    const tokens = await repository.listarByFilter({ token });

    if (tokens && tokens.length > 0
      && tokens.filter((t) => ((t.usuarioId && t.usuarioId.toString() === usuarioId.toString()) || (!t.usuarioId && !usuarioId))).length > 0) {
      res.status(200).json(new ResponseInfor(true, 'OK'));
      return;
    }
    const objToken = {
      token,
    };
    if (usuarioId) {
      objToken.usuarioId = usuarioId;
    }
    await repository.create(objToken);
    res.status(200).json(new ResponseInfor(true, 'OK'));
  } catch (error) {
    console.error('postMessagingToken - Error: ', error)
    res.status(500).json(new ResponseInfor(false, error));
  }
};

exports.deleteMessagingToken = async (req, res) => {
  try {
    if (!req.params.token) {
      res.status(200).json(new ResponseInfor(false, 'messagingToken client is null.'));
      return;
    }
    const tokens = await repository.listarByFilter({ token: req.params.token });
    if (tokens && tokens.length > 0) {
      await global.util.asyncForEach(tokens, async (obj) => {
        await repository.delete(obj._id);
      });
    }
    res.status(200).json(new ResponseInfor(true, 'OK'));
  } catch (error) {
    res.status(500).json(new ResponseInfor(false, error));
  }
};
