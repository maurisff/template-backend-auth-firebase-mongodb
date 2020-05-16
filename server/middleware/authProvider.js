/* eslint-disable no-underscore-dangle */
/* eslint-disable func-names */
const firebaseAdmin = require('firebase-admin');
const httpLogProvider = require('./httpLogProvider');
const ResponseInfor = require('../util/ResponseInfo');
const usuarioRepo = require('../repositories/usuario.repository');

module.exports = async function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.header('Access-Control-Allow-Credentials', true);
  // check header or url parameters or post parameters for token
  const { authtoken } = req.headers;
  // console.log('authToken: ', authtoken);
  req.headers.usuarioId = null;
  // retorna server online
  if (req.method === 'OPTIONS') {
    res.status(204).json(new ResponseInfor(true, `server only ${new Date().toJSON()}`));
  // TODO: Se for rotas de atutenticação ou publica não valida nada
  } else if (req.path === '/' || global.App.ENUM.PUBLICPATHS.find((el) => req.path.toString().toLowerCase().indexOf(el.toString().toLowerCase()) > -1)) {
    next();
  // TODO:Verifica comfiguração se precisa de autenticação e faz validaçãoe acesso.
  } else {
    if (!authtoken || authtoken === null || authtoken === undefined) {
      res.status(401).json(new ResponseInfor(false, 'No "authtoken" provided.'));
      return;
    }
    firebaseAdmin.auth().verifyIdToken(authtoken).then(async (authUser) => {
      // console.log('admin.auth().verifyIdToken().authUser: ', authUser);
      const usuario = await usuarioRepo.getByUID(authUser.uid);
      if (usuario) {
        // res.status(401).json(new ResponseInfor(false, 'Usuário não cadastradao'));
        req.headers.usuarioId = usuario._id;
      }
      next();
    }).catch((err) => {
      console.log('admin.auth().verifyIdToken().err: ', err);
      res.status(401).json(new ResponseInfor(false, 'Unauthorized'));
      // res.status(401).json(new ResponseInfor(false, `invalid authtoken. error: ${err}`));
    });
  }
  httpLogProvider(req, res);
};
