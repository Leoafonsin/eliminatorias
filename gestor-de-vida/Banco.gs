/**
 * Acesso à planilha: cada aba é uma tabela, a primeira linha é o cabeçalho
 * e a primeira coluna é sempre o id.
 */

const TABELAS = {
  Areas: ['id', 'nome', 'icone', 'cor', 'visao', 'ativa', 'ordem'],
  Metas: ['id', 'semestre', 'areaId', 'titulo', 'criterio', 'peso', 'feito', 'criadoEm', 'atualizadoEm'],
  Avaliacoes: ['id', 'data', 'metaId', 'feito', 'comentario'],
};

function planilha_() {
  const id = PropertiesService.getScriptProperties().getProperty('PLANILHA_ID');
  if (!id) throw new Error('Rode a função "configurar" no editor do Apps Script antes de usar o app.');
  return SpreadsheetApp.openById(id);
}

function aba_(nome) {
  const aba = planilha_().getSheetByName(nome);
  if (!aba) throw new Error('Aba "' + nome + '" não encontrada. Rode "configurar" de novo.');
  return aba;
}

function garantirAba(planilha, nome) {
  const aba = planilha.getSheetByName(nome) || planilha.insertSheet(nome);
  const cabecalho = TABELAS[nome];
  aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
  aba.setFrozenRows(1);
  return aba;
}

function lerTabela(nome) {
  const valores = aba_(nome).getDataRange().getValues();
  const cabecalho = valores.shift() || [];
  return valores
    .filter(function (linha) { return linha[0] !== ''; })
    .map(function (linha) {
      const obj = {};
      cabecalho.forEach(function (coluna, i) {
        const valor = linha[i];
        // Datas não passam pelo google.script.run: viram texto ISO.
        obj[coluna] = valor instanceof Date ? valor.toISOString() : valor;
      });
      return obj;
    });
}

function inserir(nome, obj) {
  const linha = TABELAS[nome].map(function (c) { return obj[c] === undefined ? '' : obj[c]; });
  aba_(nome).appendRow(linha);
  return obj;
}

function atualizar(nome, id, campos) {
  const aba = aba_(nome);
  const cabecalho = TABELAS[nome];
  const numLinha = linhaDoId_(aba, id);
  const intervalo = aba.getRange(numLinha, 1, 1, cabecalho.length);
  const atual = intervalo.getValues()[0];
  const nova = cabecalho.map(function (c, i) {
    return c !== 'id' && campos[c] !== undefined ? campos[c] : atual[i];
  });
  intervalo.setValues([nova]);
}

function excluir(nome, id) {
  const aba = aba_(nome);
  aba.deleteRow(linhaDoId_(aba, id));
}

function linhaDoId_(aba, id) {
  const total = aba.getLastRow() - 1;
  const ids = total > 0 ? aba.getRange(2, 1, total, 1).getValues() : [];
  const indice = ids.findIndex(function (l) { return String(l[0]) === String(id); });
  if (indice < 0) throw new Error('Registro não encontrado: ' + id);
  return indice + 2;
}

function novoId() {
  return Utilities.getUuid().slice(0, 8);
}

/** Evita que duas gravações simultâneas se atropelem. */
function comTrava(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
}
