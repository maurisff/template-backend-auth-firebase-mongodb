/* eslint-disable no-restricted-globals */
/* eslint-disable no-use-before-define */
/* eslint-disable linebreak-style */
const { CronJob } = require('cron');
const mongoose = require('mongoose');
const axios = require('axios');
const moment = require('moment-timezone');
const globalEvents = require('../../helper/globalEvents');

const MoedaModel = mongoose.model('Moeda');
const ProvedorModel = mongoose.model('ProvedorMoeda');
const AtivoMoedaModel = mongoose.model('AtivoMoeda');
const CotacaoAtivoMoedaModel = mongoose.model('CotacaoAtivoMoeda');

const tzLog = 'America/Sao_Paulo';

const providerName = 'DEMO-MOEDA';
const venctos = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];
const successHttpStatus = [200, 201, 202, 203, 204, 205, 206, 207, 208];

module.exports = {
  async start() {
    console.log(`inicializando provedor Market-data ${providerName}...`);
    const provider = await ProvedorModel.findOne({ codigo: 'DEMO-MOEDA' });
    if (provider && provider.moedasCotadas && provider.moedasCotadas.length > 0) {
      await global.util.asyncForEach(provider.moedasCotadas, async (doc) => {
        listeningProvider(provider, doc);
      });
    }
  },
};

async function eventEmitter(ativo) {
  globalEvents.emit('new-cotacao-moeda', ativo);
}

async function listeningProvider(provider, moeda) {
  // Test expression: https://cronjob.xyz/
  const cronTime = (provider.property && provider.property.timeScheduler ? provider.property.timeScheduler : '* */1 * * * *'); // default cada 1 minuto
  const defaultTimeZone = (provider.property && provider.property.defaultTimeZone ? provider.property.defaultTimeZone : null);
  // console.log(`cronTime: ${cronTime} - defaultTimeZone: ${defaultTimeZone}`);
  // ================================================================================================================================
  if (moeda && moeda.property && moeda.property.spotReuters) {
    const jobSpot = new CronJob(cronTime, (() => {
      try {
        checkQuoteSpot(provider, moeda);
      } catch (error) {
        console.error(`${moment().tz(tzLog).format()} - Execution jobSpot (${moeda.codigo}/${moeda.property.spotReuters}) of Provider ${providerName}. Error: `, error);
      } finally {
        // console.info(`${moment().tz(tzLog).format()} - Executed jobSpot (${moeda.codigo}/${moeda.property.spotReuters}) of Provider ${providerName}.`);
      }
    }), null, true, defaultTimeZone);
    jobSpot.start();
    console.log(`Started jobSpot (${moeda.codigo}/${moeda.property.spotReuters}) of Provider ${providerName}!`);
  }
  // ================================================================================================================================
  const jobFuture = new CronJob(cronTime, (() => {
    try {
      checkQuoteFuture(provider, moeda);
    } catch (error) {
      console.error(`${moment().tz(tzLog).format()} - Execution jobFuture (${moeda.codigo}/${moeda.ativo}) of Provider ${providerName}. Error: `, error);
    } finally {
      // console.info(`${moment().tz(tzLog).format()} - Executed jobFuture (${moeda.codigo}/${moeda.ativo}) of Provider ${providerName}.`);
    }
  }), null, true, defaultTimeZone);
  jobFuture.start();
  console.log(`Started jobFuture (${moeda.codigo}/${moeda.ativo}) of Provider ${providerName}!`);
}
// Desenvolver as rotinas de cotação;
async function checkQuoteSpot(provider, moeda) {
  // moeda => { codigo: String, ativo: String }
  // console.log(`${moment().tz(tzLog).format()} - Running checkQuoteSpot (${moeda.codigo}/${moeda.property.spotReuters}) of Provider ${providerName}...`);
  axios.get(`https://www.reuters.com/companies/api/getFetchQuotes/${moeda.property.spotReuters}`, {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6',
      dnt: 1,
      referer: 'https://www.reuters.com/markets/currencies',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
    },
  }).then(async (response) => {
    if (successHttpStatus.indexOf(response.status) > -1) {
      if (response.data && response.data.status && successHttpStatus.indexOf(response.data.status.code) > -1 && response.data.ts
        && response.data.market_data && response.data.market_data.currencypairs && response.data.market_data.currencypairs[0].last) {
        let serverDateTime = (response.data.market_data.currencypairs[0].time ? response.data.market_data.currencypairs[0].time : undefined);
        if (!serverDateTime) {
          serverDateTime = (response.data.ts ? response.data.ts : undefined);
        }
        serverDateTime = (serverDateTime ? new Date(serverDateTime) : undefined);
        await processQuoteSpot(provider, moeda, serverDateTime, response.data.market_data.currencypairs[0]);
      }
    } else {
      console.error(`${moment().tz(tzLog).format()} - Execution failured checkQuoteSpot (${moeda.codigo}/${moeda.property.spotReuters}) of Provider ${providerName}. Falied Response: `, { status: response.status, response: response.data });
    }
  }).catch((e) => {
    console.error(`${moment().tz(tzLog).format()} - Execution failured checkQuoteSpot (${moeda.codigo}/${moeda.property.spotReuters}) of Provider ${providerName}. Error: `, e);
  });
}

async function checkQuoteFuture(provider, moeda) {
  // moeda => { codigo: String, ativo: String }
  // console.log(`${moment().tz(tzLog).format()} - Running checkQuoteFuture (${moeda.codigo}/${moeda.ativo}) of Provider ${providerName}...`);
  axios.get(`http://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/${moeda.ativo}`, {
    headers: {
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
    },
  }).then(async (response) => {
    if (successHttpStatus.indexOf(response.status) > -1) {
      if (response.data && response.data.BizSts && response.data.BizSts.cd === 'OK' && response.data.Scty && response.data.Scty.length > 0) {
        let serverDateTime = (response.data.Msg && response.data.Msg.dtTm ? response.data.Msg.dtTm : undefined);
        serverDateTime = (serverDateTime ? new Date(serverDateTime) : undefined);
        await processListQuotesFuture(provider, moeda, serverDateTime, response.data.Scty);
      }
    } else {
      console.error(`${moment().tz(tzLog).format()} - Execution failured checkQuoteFuture (${moeda.codigo}/${moeda.ativo}) of Provider ${providerName}. Falied Response: `, { status: response.status, response: response.data });
    }
  }).catch((e) => {
    console.error(`${moment().tz(tzLog).format()} - Execution failured checkQuoteFuture (${moeda.codigo}/${moeda.ativo}) of Provider ${providerName}. Error: `, e);
  });
}

async function processListQuotesFuture(provider, moeda, serverDateTime, quotes) {
  await global.util.asyncForEach(quotes, async (quote) => {
    await processQuoteFuture(provider, moeda, serverDateTime, quote);
  });
}

async function processQuoteFuture(provider, moeda, serverDateTime, quote) {
  /**
   *
  {
    "SctyQtn":{
      "bottomLmtPric": 3902,
      "prvsDayAdjstmntPric": 4150.968,
      "topLmtPric": 4400,
      "opngPric": 4131,
      "minPric": 4090,
      "maxPric": 4138,
      "avrgPric": 4115.368,
      "curPrc": 4096.5
    },
    "asset":{
      "AsstSummry":{
        "grssAmt": 56754088375,
        "mtrtyCode": "2019-11-01",
        "opnCtrcts": 671370
      },
    },
    "mkt":{
      "cd": "FUT"
    },
    "symb": "DOLX19",
    "desc": "DOLAR COMERCIAL"
  },
  */

  if (quote.symb && quote.symb.toString().length === 6
    && quote.mkt && quote.mkt.cd === 'FUT'
    && quote.asset && quote.asset.code === moeda.ativo
    && quote.asset.AsstSummry && quote.asset.AsstSummry.mtrtyCode
    && quote.SctyQtn && (quote.SctyQtn.curPrc || quote.SctyQtn.prvsDayAdjstmntPric)) {
    const vCodeAtivo = quote.symb.toString();
    const vAtivo = vCodeAtivo.substring(0, 3);
    const vVencto = vCodeAtivo.substring(3, 4);
    const vAno = vCodeAtivo.substring(4, 6);

    let vCotacaoAtual = quote.SctyQtn.curPrc || quote.SctyQtn.prvsDayAdjstmntPric;
    if (!isNaN(vCotacaoAtual)) {
      vCotacaoAtual = parseFloat(vCotacaoAtual.toFixed(2)); // Todas as cotaçãoes arrendonda para 2 casas decimais.
    }
    let vDataVentoFuturo = quote.asset.AsstSummry.mtrtyCode;

    try {
      vDataVentoFuturo = new Date(vDataVentoFuturo);
      vDataVentoFuturo = new Date(vDataVentoFuturo.setDate(1));
    } catch (error) {
      vDataVentoFuturo = undefined;
    }

    if (vAtivo === moeda.ativo && venctos.indexOf(vVencto) !== -1 && !isNaN(vAno) && !isNaN(vCotacaoAtual) && vDataVentoFuturo && vCotacaoAtual) {
      let ativoMoeda = await AtivoMoedaModel.findOne({ provedorId: provider._id, codigo: vCodeAtivo });
      if (!ativoMoeda) {
        const vMoeda = await MoedaModel.findOne({ codigo: moeda.codigo });
        // se não existe o ativo, cria o novo ativo e cotação
        const ativo = {
          provedorId: provider._id,
          moedaId: vMoeda._id,
          codigo: vCodeAtivo,
          ativo: moeda.ativo,
          desc: quote.desc || vCodeAtivo,
          mesVencto: (vDataVentoFuturo ? `${(vDataVentoFuturo.getMonth() + 1).toString().padStart(2, '0')}/${vDataVentoFuturo.getFullYear()}` : vCodeAtivo),
          vencimento: vDataVentoFuturo,
          spot: false,
        };
        ativoMoeda = await new AtivoMoedaModel(ativo).save();
      }
      if (ativoMoeda) {
        // se ja existe o ativo, atualizar a cotação
        const ultimaCotacao = await CotacaoAtivoMoedaModel.findOne({ ativoMoedaId: ativoMoeda._id }).sort({ createAt: -1 }).limit(1);
        // console.log(`${moment().tz(tzLog).format()} - Spot (${moeda.ativo}/${ativoMoeda.codigo}) -> COTAÇÃO: Ultima (${(ultimaCotacao && ultimaCotacao.vlCotacao ? ultimaCotacao.vlCotacao : null)}) - Atual (${vCotacaoAtual})`);
        if (!ultimaCotacao || ultimaCotacao.vlCotacao.toFixed(2) !== vCotacaoAtual.toFixed(2)) {
          if (process.env.LOG_PROVEDORES === 'true') {
            console.log(`${moment().tz(tzLog).format()} - Nova Cotação -> Futuro (${moeda.ativo}/${ativoMoeda.codigo}) -> COTAÇÃO: Ultima (${(ultimaCotacao && ultimaCotacao.vlCotacao ? ultimaCotacao.vlCotacao : 0)}) - Atual (${vCotacaoAtual})`);
          }
          const cotacao = {
            ativoMoedaId: ativoMoeda._id,
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
          await new CotacaoAtivoMoedaModel(cotacao).save();
          eventEmitter(ativoMoeda);
        } else if (ultimaCotacao && ultimaCotacao.createAt && moment(ultimaCotacao.createAt).isValid() && moment().isAfter(ultimaCotacao.createAt, 'day')) {
          const cotacao = ultimaCotacao;
          cotacao.vlFechamento = ultimaCotacao.vlCotacao;
          cotacao.createAt = new Date();
          if (process.env.LOG_PROVEDORES === 'true') {
            console.log(`${moment().tz(tzLog).format()} - Futuro (${moeda.ativo}/${ativoMoeda.codigo}) -> Novo dia de cotação - Anterior (${moment(ultimaCotacao.createAt).format('DD/MM/YYYY')}) - Novo (${moment().format('DD/MM/YYYY')}) - fechamento (${cotacao.vlFechamento}) - Cotação (${cotacao.vlCotacao})`);
          }
          await new CotacaoAtivoMoedaModel(cotacao).save();
          eventEmitter(ativoMoeda);
        }
      }
    }
  }
}


async function processQuoteSpot(provider, moeda, serverDateTime, quote) {
  /**
   *
  {
    {
      "last": "4.0844",
      "ric": "BRL=X",
      "symbol": "USDBRL",
      "net_change": "0.0012",
      "percent_change": "0.0293887",
      "day_high": "4.0844",
      "day_low": "4.0845",
      "fiftytwo_wk_high": "4.1942",
      "fiftytwo_wk_low": "3.5811",
      "time": "2019-10-03 22:30:00",
      "bid": "4.0844",
      "ask": "4.0846",
      "open": "4.084",
      "prevClose": "4.0832",
      "modified": "2019-10-04 00:09:54"
    }
  },
  */

  const vMoeda = await MoedaModel.findOne({ codigo: moeda.codigo });
  if (quote.last && !isNaN(quote.last) && vMoeda) {
    const vCodeAtivo = `${moeda.ativo}SPOT`;

    let vCotacaoAtual = parseFloat(quote.last);

    const vencimento = new Date();

    if (vCotacaoAtual) {
      vCotacaoAtual *= 1000;
      if (!isNaN(vCotacaoAtual)) {
        vCotacaoAtual = parseFloat(vCotacaoAtual.toFixed(2)); // Todas as cotaçãoes arrendonda para 2 casas decimais.
      }
      let ativoMoeda = await AtivoMoedaModel.findOne({ provedorId: provider._id, codigo: vCodeAtivo });
      const ativo = {
        provedorId: (ativoMoeda && ativoMoeda.provedorId ? ativoMoeda.provedorId : provider._id),
        moedaId: vMoeda._id,
        codigo: (ativoMoeda && ativoMoeda.codigo ? ativoMoeda.codigo : vCodeAtivo),
        ativo: (ativoMoeda && ativoMoeda.ativo ? ativoMoeda.ativo : moeda.ativo),
        desc: (ativoMoeda && ativoMoeda.desc ? ativoMoeda.desc : `${(vMoeda.shortNome || vMoeda.nome)} SPOT`),
        mesVencto: (vencimento ? `${(vencimento.getMonth() + 1).toString().padStart(2, '0')}/${vencimento.getFullYear()}` : vCodeAtivo),
        vencimento,
        spot: true,
      };
      if (!ativoMoeda) {
        ativoMoeda = await new AtivoMoedaModel(ativo).save();
      }
      if (ativoMoeda) {
        const ultimaCotacao = await CotacaoAtivoMoedaModel.findOne({ ativoMoedaId: ativoMoeda._id }).sort({ createAt: -1 }).limit(1);
        if (!ultimaCotacao || (ultimaCotacao.vlCotacao.toFixed(2) !== vCotacaoAtual.toFixed(2))) {
          if (process.env.LOG_PROVEDORES === 'true') {
            console.log(`${moment().tz(tzLog).format()} - Nova Cotação -> Spot (${moeda.ativo}/${ativoMoeda.codigo}) -> COTAÇÃO: Ultima (${(ultimaCotacao && ultimaCotacao.vlCotacao ? ultimaCotacao.vlCotacao : 0)}) - Atual (${vCotacaoAtual})`);
          }
          if (ativoMoeda.vencimento !== ativo.vencimento) {
            await AtivoMoedaModel.findOneAndUpdate({ _id: ativoMoeda._id }, ativo, { new: true });
          }
          const cotacao = {
            ativoMoedaId: ativoMoeda._id,
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
          await new CotacaoAtivoMoedaModel(cotacao).save();
          eventEmitter(ativoMoeda);
        } else if (ultimaCotacao && ultimaCotacao.createAt && moment(ultimaCotacao.createAt).isValid() && moment().isAfter(ultimaCotacao.createAt, 'day')) {
          const cotacao = ultimaCotacao;
          cotacao.vlFechamento = ultimaCotacao.vlCotacao;
          cotacao.createAt = new Date();
          if (ativoMoeda.vencimento !== ativo.vencimento) {
            await AtivoMoedaModel.findOneAndUpdate({ _id: ativoMoeda._id }, ativo, { new: true });
          }
          if (process.env.LOG_PROVEDORES === 'true') {
            console.log(`${moment().tz(tzLog).format()} - SPOT (${moeda.ativo}/${ativoMoeda.codigo}) -> Novo dia de cotação - Anterior (${moment(ultimaCotacao.createAt).format('DD/MM/YYYY')}) - Novo (${moment().format('DD/MM/YYYY')}) - fechamento (${cotacao.vlFechamento}) - Cotação (${cotacao.vlCotacao})`);
          }
          await new CotacaoAtivoMoedaModel(cotacao).save();
          eventEmitter(ativoMoeda);
        }
      }
    }
  }
}
