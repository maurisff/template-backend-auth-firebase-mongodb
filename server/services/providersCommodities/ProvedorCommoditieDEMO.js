/* eslint-disable no-restricted-globals */
/* eslint-disable no-use-before-define */
/* eslint-disable linebreak-style */
const { CronJob } = require('cron');
const mongoose = require('mongoose');
const axios = require('axios');
const moment = require('moment-timezone');
const globalEvents = require('../../helper/globalEvents');


const CommoditieModel = mongoose.model('Commoditie');
const ProvedorModel = mongoose.model('ProvedorCommoditie');
const AtivoCommoditieModel = mongoose.model('AtivoCommoditie');
const CotacaoAtivoCommoditieModel = mongoose.model('CotacaoAtivoCommoditie');

const tzLog = 'America/Sao_Paulo';
const providerName = 'DEMO-COMMODITIE';
const successHttpStatus = [200, 201, 202, 203, 204, 205, 206, 207, 208];

module.exports = {
  async start() {
    console.log(`inicializando provedor Market-data ${providerName}...`);
    const provider = await ProvedorModel.findOne({ codigo: providerName });
    if (provider && provider.commodities && provider.commodities.length > 0) {
      await global.util.asyncForEach(provider.commodities, async (doc) => {
        listeningProvider(provider, doc);
      });
    }
  },
};

async function eventEmitter(ativo) {
  globalEvents.emit('new-cotacao-commoditie', ativo);
}

async function listeningProvider(provider, commoditie) {
  // Test expression: https://cronjob.xyz/
  const cronTime = (provider.property && provider.property.timeScheduler ? provider.property.timeScheduler : '* */1 * * * *'); // default cada 1 minuto
  const defaultTimeZone = (provider.property && provider.property.defaultTimeZone ? provider.property.defaultTimeZone : null);
  // ================================================================================================================================
  const jobFuture = new CronJob(cronTime, (() => {
    try {
      checkQuoteFuture(provider, commoditie);
    } catch (error) {
      console.error(`${moment().tz(tzLog).format()} - Execution jobFuture (${commoditie.codigo}/${commoditie.ativo}) of Provider ${providerName}. Error: `, error);
    } finally {
      // console.info(`${moment().tz(tzLog).format()} - Executed jobFuture (${commoditie.codigo}/${commoditie.ativo}) of Provider ${providerName}.`);
    }
  }), null, true, defaultTimeZone);
  jobFuture.start();
  console.log(`Started jobFuture (${commoditie.codigo}/${commoditie.ativo}) of Provider ${providerName}!`);
}

async function checkQuoteFuture(provider, commoditie) {
  // commoditie => { codigo: String, ativo: String }
  // console.log(`${moment().tz(tzLog).format()} - Running checkQuoteFuture (${commoditie.codigo}/${commoditie.ativo}) of Provider ${providerName}...`);
  // axios.get(`https://www.cmegroup.com/CmeWS/mvc/Quotes/Future/${commoditie.ativo}/G/?quoteCodes=null&_=${new Date().getTime()}`, {
  axios.get(`https://www.cmegroup.com/CmeWS/mvc/Quotes/Future/${commoditie.ativo}/G`, {
    headers: {
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
    },
  }).then(async (response) => {
    if (successHttpStatus.indexOf(response.status) > -1) {
      if (response.data && response.data.tradeDate && response.data.quotes && response.data.quotes.length > 0) {
        let serverDateTime = (response.data.tradeDate ? response.data.tradeDate : undefined);
        serverDateTime = (serverDateTime ? new Date(serverDateTime) : undefined);
        await processListQuotesFuture(provider, commoditie, serverDateTime, response.data.quotes);
      }
    } else {
      console.error(`${moment().tz(tzLog).format()} - Execution failured checkQuoteFuture (${commoditie.codigo}/${commoditie.ativo}) of Provider ${providerName}. Falied Response: `, { status: response.status, response: response.data });
    }
  }).catch((e) => {
    console.error(`${moment().tz(tzLog).format()} - Execution failured checkQuoteFuture (${commoditie.codigo}/${commoditie.ativo}) of Provider ${providerName}. Error: `, e);
  });
}

async function processListQuotesFuture(provider, commoditie, serverDateTime, quotes) {
  await global.util.asyncForEach(quotes, async (quote) => {
    await processQuoteFuture(provider, commoditie, serverDateTime, quote);
  });
}

async function processQuoteFuture(provider, commoditie, serverDateTime, quote) {
  /*
   quoteCode => Codigo
   last || priorSettle => Cotacao
   expirationMonth => Mes ANO
   expirationDate => vencimento (yyyymmdd)
   productName => desc
  */
  const vCommoditie = await CommoditieModel.findOne({ codigo: commoditie.codigo });
  let vCotacaoAtual = quote.last;
  vCotacaoAtual = vCotacaoAtual.replace("'", '.');
  if (!isNaN(vCotacaoAtual)) {
    vCotacaoAtual = parseFloat(vCotacaoAtual);
    vCotacaoAtual = parseFloat(vCotacaoAtual.toFixed(2)); // Todas as cotaçãoes arrendonda para 2 casas decimais.
  }

  if (!vCotacaoAtual || isNaN(vCotacaoAtual) || vCotacaoAtual === 0) {
    vCotacaoAtual = quote.priorSettle;
    vCotacaoAtual = vCotacaoAtual.replace("'", '.');
    if (!isNaN(vCotacaoAtual)) {
      vCotacaoAtual = parseFloat(vCotacaoAtual);
      vCotacaoAtual = parseFloat(vCotacaoAtual.toFixed(2)); // Todas as cotaçãoes arrendonda para 2 casas decimais.
    }
  }

  if (quote.quoteCode && quote.expirationMonth && quote.expirationDate && quote.productName
    && quote.productId.toString() === commoditie.ativo.toString() && vCotacaoAtual && !isNaN(vCotacaoAtual) && vCotacaoAtual !== 0) {
    let vDataVentoFuturo = quote.expirationDate;

    try {
      vDataVentoFuturo = moment(vDataVentoFuturo, 'YYYYMMDD').date(1).toDate();
    } catch (error) {
      vDataVentoFuturo = undefined;
    }

    if (!isNaN(vCotacaoAtual) && vDataVentoFuturo) {
      let ativoCommoditie = await AtivoCommoditieModel.findOne({ provedorId: provider._id, codigo: quote.quoteCode });
      if (!ativoCommoditie) {
        // se não existe o ativo, cria o novo ativo e cotação
        const ativo = {
          provedorId: provider._id,
          codigo: quote.quoteCode,
          commoditieId: vCommoditie._id,
          ativo: commoditie.ativo,
          desc: quote.productName || quote.quoteCode,
          mesVencto: (vDataVentoFuturo ? moment(vDataVentoFuturo).format('MM/YYYY') : (quote.expirationMonth || quote.quoteCode)),
          vencimento: vDataVentoFuturo,
          spot: false,
        };
        ativoCommoditie = await new AtivoCommoditieModel(ativo).save();
      }
      if (ativoCommoditie) {
        // se ja existe o ativo, atualizar a cotação
        const ultimaCotacao = await CotacaoAtivoCommoditieModel.findOne({ ativoCommoditieId: ativoCommoditie._id }).sort({ createAt: -1 }).limit(1);
        // console.log(`${moment().tz(tzLog).format()} - Futuro (${commoditie.ativo}) -> COTAÇÃO: Ultima (${(ultimaCotacao && ultimaCotacao.vlCotacao ? ultimaCotacao.vlCotacao : null)}) - Atual (${vCotacaoAtual})`);
        if (!ultimaCotacao || ultimaCotacao.vlCotacao.toFixed(2) !== vCotacaoAtual.toFixed(2)) {
          if (process.env.LOG_PROVEDORES === 'true') {
            console.log(`${moment().tz(tzLog).format()} - Nova Cotação -> Futuro (${commoditie.ativo}/${ativoCommoditie.codigo}) -> COTAÇÃO: Ultima (${(ultimaCotacao && ultimaCotacao.vlCotacao ? ultimaCotacao.vlCotacao : 0)}) - Atual (${vCotacaoAtual})`);
          }

          const cotacao = {
            ativoCommoditieId: ativoCommoditie._id,
            vlCotacao: vCotacaoAtual,
            vlAnterior: 0,
            vlOscilacao: 0,
            pcOscilacao: 0,
            vlMinimo: 0,
            vlMaximo: 0,
            vlFechamento: 0,
            vlVariacao: 0,
            pcVariacao: 0,
            dataProvedor: serverDateTime,
            content: (process.env.NODE_ENV === 'development' && 1 === 2 ? quote : null),
          };

          if (!ultimaCotacao) {
            cotacao.vlAnterior = vCotacaoAtual;
            cotacao.vlMinimo = vCotacaoAtual;
            cotacao.vlMaximo = vCotacaoAtual;
            cotacao.vlFechamento = vCotacaoAtual;
          } else {
            cotacao.vlAnterior = ultimaCotacao.vlCotacao;
            cotacao.vlMinimo = ultimaCotacao.vlMinimo;
            cotacao.vlMaximo = ultimaCotacao.vlMaximo;
            cotacao.vlFechamento = ultimaCotacao.vlFechamento;
          }
          // calcula Ocilacao
          cotacao.vlOscilacao = cotacao.vlCotacao - cotacao.vlAnterior;
          cotacao.pcOscilacao = (cotacao.vlOscilacao * 100) / (cotacao.vlAnterior && cotacao.vlAnterior !== 0 ? cotacao.vlAnterior : 1);
          // calcula variacao
          cotacao.vlVariacao = cotacao.vlCotacao - cotacao.vlFechamento;
          cotacao.pcVariacao = (cotacao.vlVariacao * 100) / (cotacao.vlFechamento && cotacao.vlFechamento !== 0 ? cotacao.vlFechamento : 1);
          // Calcula o maximo e minimo
          cotacao.vlMinimo = (cotacao.vlCotacao < cotacao.vlMinimo ? cotacao.vlCotacao : cotacao.vlMinimo);
          cotacao.vlMaximo = (cotacao.vlCotacao > cotacao.vlMaximo ? cotacao.vlCotacao : cotacao.vlMaximo);
          await new CotacaoAtivoCommoditieModel(cotacao).save();
          eventEmitter(ativoCommoditie);
        } else if ((ultimaCotacao && ultimaCotacao.createAt && moment(ultimaCotacao.createAt).isValid() && moment().isAfter(ultimaCotacao.createAt, 'day'))) {
          const cotacao = ultimaCotacao;
          cotacao.vlFechamento = ultimaCotacao.vlCotacao;
          cotacao.createAt = new Date();
          if (process.env.LOG_PROVEDORES === 'true') {
            console.log(`${moment().tz(tzLog).format()} - Futuro (${commoditie.ativo}/${ativoCommoditie.codigo}) -> Novo dia de cotação - Anterior (${moment(ultimaCotacao.createAt).format('DD/MM/YYYY')}) - Novo (${moment().format('DD/MM/YYYY')}) - fechamento (${cotacao.vlFechamento}) - Cotação (${cotacao.vlCotacao})`);
          }
          await new CotacaoAtivoCommoditieModel(cotacao).save();
          eventEmitter(ativoCommoditie);
        }
      }
    }
  }
}
