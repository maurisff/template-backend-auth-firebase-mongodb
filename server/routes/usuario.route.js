
module.exports = (app) => {
  const usuarioController = require('../controllers/usuario.controller');
  app.route('/usuario')
    .get(usuarioController.list)
    .post(usuarioController.create);

  app.route('/usuario/:id')
    .get(usuarioController.get)
    .put(usuarioController.update)
    .delete(usuarioController.delete);

  app.route('/usuariologado/usuario')
    .get(usuarioController.usuarioLogado);
};
