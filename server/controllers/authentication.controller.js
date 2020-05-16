
const firebaseAdmin = require('firebase-admin');
const ResponseInfor = require('../util/ResponseInfo');
const usuarioRepo = require('../repositories/usuario.repository');
const messagingTokenRepository = require('../repositories/messagingToken.repository');
const firebaseHelper = require('../helper/firebase');

const backListSenhas = ['admin', 'administrador'];

exports.registration = async (req, res) => {
  const {
    uid, nome, email, senha, messagingToken,
  } = req.body;
  console.log('uid: ', uid);
  console.log('nome: ', nome);
  console.log('email: ', email);
  console.log('senha: ', senha);
  console.log('messagingToken: ', messagingToken);
  try {
    if (!nome) {
      res.status(200).json(new ResponseInfor(false, 'Nome do usuário não informado'));
      return;
    } if (!email) {
      res.status(200).json(new ResponseInfor(false, 'Email do usuário não informado'));
      return;
    } if (!uid && !senha) {
      res.status(200).json(new ResponseInfor(false, 'Senha do usuário não informadoa'));
      return;
    } if (!uid && !(senha.length >= 6)) {
      res.status(200).json(new ResponseInfor(false, 'Senha deve ser composta de pelo menos 6 digitos'));
      return;
    } if (!uid && backListSenhas.indexOf(senha.toString().toLowerCase()) > -1) {
      res.status(200).json(new ResponseInfor(false, 'Senha informada não é permitida'));
      return;
    }
    const userByUID = await usuarioRepo.getByUID(uid);
    if (userByUID) {
      res.status(200).json(new ResponseInfor(false, 'Já existe um usuário cadastrado com os dados informados'));
      return;
    }

    const usuario = await usuarioRepo.getOne({ email });
    if (usuario && usuario.uid) {
      res.status(200).json(new ResponseInfor(false, 'Já existe um usuário cadastrado com os dados informados'));
      return;
    }

    try {
      const userAuth = await firebaseAdmin.auth().getUserByEmail(email);
      // console.log('Successfully firebaseAdmin.auth().getUserByEmail:', userAuth.toJSON());
      if (uid && userAuth && userAuth.uid !== uid) {
        res.status(200).json(new ResponseInfor(false, 'Já existe um usuário cadastrado com os dados informados'));
        return;
      } if (!uid && userAuth) {
        const isUserByUID = await usuarioRepo.getByUID(userAuth.uid);
        if (isUserByUID) {
          res.status(200).json(new ResponseInfor(false, 'Já existe um usuário cadastrado com os dados informados'));
          return;
        }
      }
    } catch (error) {
      if (['auth/user-not-found'].indexOf(error.code) === -1) {
        // console.log('Error firebaseAdmin.auth().getUserByEmail:', error);
        res.status(500).json(new ResponseInfor(false, error));
        return;
      }
    }
    let currentUid = null;
    try {
      const newUserAuth = {
        email,
        emailVerified: false,
        password: senha,
        displayName: nome,
        disabled: false,
      };
      let userAuth = null;
      if (uid) {
        userAuth = await firebaseAdmin.auth().getUser(uid);
      } else {
        userAuth = await firebaseAdmin.auth().createUser(newUserAuth);
      }
      currentUid = userAuth.uid;
      // See the UserRecord reference doc for the contents of userRecord.
      // console.log('Successfully firebaseAdmin.auth().createUser new user:', userAuth);

      const data = {
        uid: userAuth.uid,
        nome,
        email,
        verificado: userAuth.emailVerified,
      };
      let newUser = null;
      if (usuario) {
        newUser = await usuarioRepo.update(usuario._id, data);
      } else {
        newUser = await usuarioRepo.create(data);
      }
      if (messagingToken) {
        const tokens = await messagingTokenRepository.listarByFilter({ token: messagingToken });

        if (!(tokens && tokens.length > 0 && tokens.filter((t) => !!t.usuarioId && t.usuarioId.toString() === newUser._id.toString()).length > 0)) {
          const objToken = {
            token: messagingToken,
          };
          if (newUser._id) {
            objToken.usuarioId = newUser._id;
          }
          await messagingTokenRepository.create(objToken);
        }
      }

      if (messagingToken) {
        setTimeout(() => {
          const message = {
            title: 'Parabéns',
            boby: 'Sua conta de usuário foi criada com sucesso!',
          };
          firebaseHelper.sendNotificationToUser(newUser._id, message);
          console.log('Message new Registretions sended!!');
        }, 10000);
      }
      res.status(200).json(new ResponseInfor(true, `Usuario (${newUser.nome}) cadastrado com sucesso!`));
    } catch (error) {
      if (!uid && currentUid) {
        firebaseAdmin.auth().deleteUser(currentUid);
      }
      console.log('Error creating new user:', error);
      res.status(500).json(new ResponseInfor(false, error));
    }
  } catch (error) {
    res.status(500).json(new ResponseInfor(false, error));
  }
};


exports.updateCreadential = async (req, res) => {
  const {
    uid, nome, email, senha,
  } = req.body;
  try {
    if (!nome) {
      res.status(200).json(new ResponseInfor(false, 'Nome do usuário não informado'));
      return;
    } if (!email) {
      res.status(200).json(new ResponseInfor(false, 'Email do usuário não informado'));
      return;
    } if (!uid && !senha) {
      res.status(200).json(new ResponseInfor(false, 'Senha do usuário não informadoa'));
      return;
    } if (!uid && !(senha.length >= 6)) {
      res.status(200).json(new ResponseInfor(false, 'Senha deve ser composta de pelo menos 6 digitos'));
      return;
    } if (!uid && backListSenhas.indexOf(senha.toString().toLowerCase()) > -1) {
      res.status(200).json(new ResponseInfor(false, 'Senha informada não é permitida'));
      return;
    }
    const userByUID = await usuarioRepo.getByUID(uid);
    if (userByUID) {
      res.status(200).json(new ResponseInfor(false, 'Já existe um usuário cadastrado com os dados informados'));
      return;
    }

    const usuario = await usuarioRepo.getOne({ email });
    if (usuario && usuario.uid) {
      res.status(200).json(new ResponseInfor(false, 'Já existe um usuário cadastrado com os dados informados'));
      return;
    }

    try {
      const userAuth = await firebaseAdmin.auth().getUserByEmail(email);
      console.log('Successfully firebaseAdmin.auth().getUserByEmail:', userAuth.toJSON());
      if (uid && userAuth && userAuth.uid !== uid) {
        res.status(200).json(new ResponseInfor(false, 'Já existe um usuário cadastrado com os dados informados'));
        return;
      } if (!uid && userAuth) {
        res.status(200).json(new ResponseInfor(false, 'Já existe um usuário cadastrado com os dados informados'));
        return;
      }
    } catch (error) {
      console.log('Error firebaseAdmin.auth().getUserByEmail:', error);
      res.status(500).json(new ResponseInfor(false, error));
      return;
    }

    try {
      const newUserAuth = {
        email,
        emailVerified: false,
        password: senha,
        displayName: nome,
        disabled: false,
      };
      let userAuth = null;
      if (uid) {
        userAuth = await firebaseAdmin.auth().getUser(uid);
      } else {
        userAuth = await firebaseAdmin.auth().createUser(newUserAuth);
      }
      // See the UserRecord reference doc for the contents of userRecord.
      console.log('Successfully firebaseAdmin.auth().createUser new user:', userAuth);

      const data = {
        uid: userAuth.uid,
        nome,
        email,
        verificado: userAuth.uid,
      };
      let newUser = null;
      if (usuario) {
        newUser = await usuarioRepo.update(usuario._id, data);
      } else {
        newUser = await usuarioRepo.create(data);
      }
      res.status(200).json(new ResponseInfor(true, `Usuario (${newUser.nome}) cadastrado com sucesso!`));
    } catch (error) {
      console.log('Error creating new user:', error);
      res.status(500).json(new ResponseInfor(false, error));
    }
  } catch (error) {
    res.status(500).json(new ResponseInfor(false, error));
  }
};
/*
exports.check = async (req, res) => {
  // console.log('globalApp: ', global.App)
  // console.log('req.body: ', req.body)
  try {
    if (!req.body.login) {
      res.status(200).json(new ResponseInfor(false, 'login não informado.'));
    } else if (!req.body.senha) {
      res.status(200).json(new ResponseInfor(false, 'Senha não informada.'));
    } else {
      const usuario = await usuarioRepo.getOne({ login: req.body.login });
      if (!usuario) {
        res.status(200).json(new ResponseInfor(false, 'usuário não cadastradao'));
      } else if (usuario.senha !== MD5(req.body.senha)) {
        res.status(200).json(new ResponseInfor(false, 'Senha do usuário não confere.'));
      } else if (!usuario.verificado) {
        res.status(200).json(new ResponseInfor(false, 'Conta do Usuario não verificada. Verifique seu email!'));
      } else if (!usuario.ativo) {
        res.status(200).json(new ResponseInfor(false, 'Usuario encontra-se bloqueado. Contate o administrador do sistema'));
      } else {
        res.status(200).json(new ResponseInfor(true, usuario));
      }
    }
  } catch (error) {
    res.status(400).json(new ResponseInfor(false, error));
  }
};


exports.onAuth = async (req, res) => {
  try {
    const token = req.params.token || req.headers['x-access-token'];
    if (!token) {
      res.status(401).json(new ResponseInfor(false, 'token não informado'));
    } else {
      await jwt.verify(token, process.env.JWT_SECRETKEY, async (err, authUser) => {
        if (err) {
          res.status(401).json(new ResponseInfor(false, `invalid x-access-token. error: ${err}`));
        } else {
          const usuario = await usuarioRepo.get(authUser.usuario._id);
          const empresa = await empresaRepo.get(authUser.empresa._id);
          let usuarioEmpresa = null;
          if (usuario && empresa) {
            usuarioEmpresa = await usuarioEmpresaRepo.getOne({ usuarioId: usuario._id, empresaId: empresa._id });
          }
          if (!usuario) {
            res.status(401).json(new ResponseInfor(false, 'Usuário não cadastradao'));
          } else if (!usuario.ativo) {
            res.status(401).json(new ResponseInfor(false, 'Usuario encontra-se bloqueado. Contate o administrador do sistema'));
          } else if (!usuario.verificado) {
            res.status(200).json(new ResponseInfor(false, 'Conta do Usuario não verificada. Verifique seu email!'));
          } else if (!empresa) {
            res.status(401).json(new ResponseInfor(false, `Empresa (${authUser.empresa.nome}) não cadastrada.`));
          } else if (!usuarioEmpresa) {
            res.status(401).json(new ResponseInfor(false, `Usuário (${authUser.usuario.login}) não possui acesso a Empresa (${authUser.empresa.nome}).`));
          } else if (!empresa.ativo) {
            res.status(401).json(new ResponseInfor(false, `Empresa (${authUser.empresa.nome}) encontra-se Bloqueado. Contate o administrador do sistema`));
          } else if (!usuarioEmpresa.ativo) {
            res.status(401).json(new ResponseInfor(false, `O acesso do usuário (${authUser.usuario.login}) a Empresa (${authUser.empresa.nome}), encontra-se bloqueado. Contate o proprietario do Empresa.`));
          } else {
            const data = await processAuth(usuario, empresa, token);
            res.status(200).json(new ResponseInfor(true, data));
          }
        }
      });
    }
  } catch (error) {
    res.status(400).json(new ResponseInfor(false, `Error: ${error}`));
  }
};

exports.users = async (req, res) => {
  try {
    const filter = req.query || {};
    const result = [];
    const usuarios = await usuarioRepo.selectByFilter({
      ativo: 3, login: 2, _id: 1,
    }, filter);
    await global.util.asyncForEach(usuarios, async (el) => {
      let ests = await usuarioEmpresaRepo.empresasDoUsuario(el._id);
      ests = JSON.parse(JSON.stringify(ests));
      ests = ests.map((m) => ({
        _id: m.empresaId._id,
        nome: m.empresaId.nome,
        ativo: m.empresaId.ativo,
        acessoAtivo: m.ativo,
      }));
      result.push({
        login: el.login,
        ativo: el.ativo,
        acessos: ests,
      });
    });
    res.status(200).json(new ResponseInfor(true, result));
  } catch (error) {
    console.error(error);
    res.status(400).json(new ResponseInfor(false, `ERRO: ${error}`));
  }
};

exports.find = async (req, res) => {
  try {
    const usuarios = await usuarioRepo.selectByFilter({
      ativo: 3, login: 1, _id: -1,
    }, { login: req.params.login });
    let result = JSON.parse(JSON.stringify(usuarios));
    result = result.map((el) => ({
      login: el.login,
      ativo: el.ativo,
    }));
    res.status(200).json(new ResponseInfor(true, result));
  } catch (error) {
    console.error(error);
    res.status(400).json(new ResponseInfor(false, `ERRO: ${error}`));
  }
};

  */
