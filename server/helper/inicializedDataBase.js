/* eslint-disable no-use-before-define */
// const mongoose = require('mongoose');
// const schedule = require('node-schedule');
// const MD5 = require('md5');
module.exports = {
  async start() {
    console.log('inicializando serviços de banco de dados padrão...');
    /*
    await createMoeda();
    await createProvedorMoeda();
    await createCommoditie();
    await createProvedorCommoditie();
    await createDefautlUserAdmin();
    */
  },
};
/*
// =================================================================================================
// Criar metodos a serem executados depois que o bando de dados ja estiver inicializado e conectado
// =================================================================================================
async function createDefautlUserAdmin() {
  const Usuario = mongoose.model('Usuario');
  const Empresa = mongoose.model('Empresa');
  const UsuarioEmpresa = mongoose.model('UsuarioEmpresa');
  const ProvedorMoeda = mongoose.model('ProvedorMoeda');
  const ProvedorCommoditie = mongoose.model('ProvedorCommoditie');

  const defaultUser = {
    login: 'administrador@mail.com.br',
    senha: MD5('adminxuk01'),
    nome: 'Administrador',
    verificado: true,
    ativo: true,
    admin: true,
  };
  const provedorMoeda = await ProvedorMoeda.findOne({ codigo: 'DEMO-MOEDA' });
  const provedorCommoditie = await ProvedorCommoditie.findOne({ codigo: 'DEMO-COMMODITIE' });
  const defaultEmpresa = {
    nome: 'Administrador WEB-APP',
    provedorMoedaId: provedorMoeda._id,
    provedorCommoditieId: provedorCommoditie._id,
    ativo: true,
  };
  try {
    const userAdmin = await Usuario.findOne({ login: defaultUser.login });
    // console.log('userAdmin: ', userAdmin)
    if (!userAdmin) {
      // console.log('Criando no userAdmin: ', defaultUser)
      const usuario = await new Usuario(defaultUser).save();
      const estabeleciomento = await new Empresa(defaultEmpresa).save();
      new UsuarioEmpresa({ usuarioId: usuario._id, empresaId: estabeleciomento._id, ativo: true }).save();
    }
  } catch (error) {
    console.error('inicializedDataBase.creatDefautlUserAdmin: ', error);
  }
}
*/
