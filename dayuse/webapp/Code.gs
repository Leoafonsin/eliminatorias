/**
 * DAY USE DO CLUBE – app web (Google Apps Script)
 * Lê e grava na planilha "Day Use - Controle de Presença".
 * Publicar: Implantar > Nova implantação > App da Web.
 */

const PLANILHA_ID = '1iWGl2f78rU7Qcl6zU9DmEepTGMEShq8sKp1-Twm-gtU';
const ABAS_LEITURA = ['Pessoas', 'Presencas', 'Precos'];
const ABAS_ESCRITA = ['Pessoas', 'Presencas'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Day Use do Clube')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function planilha_() {
  return SpreadsheetApp.openById(PLANILHA_ID);
}

function aba_(nome, permitidas) {
  if (permitidas.indexOf(nome) === -1) throw new Error('Aba não permitida: ' + nome);
  const aba = planilha_().getSheetByName(nome);
  if (!aba) throw new Error('Aba não encontrada: ' + nome);
  return aba;
}

function separar_(a1) {
  const i = a1.indexOf('!');
  if (i < 0) throw new Error('Intervalo sem aba: ' + a1);
  return { aba: a1.slice(0, i).replace(/^'|'$/g, ''), intervalo: a1.slice(i + 1) };
}

/** Valores como aparecem na planilha (datas dd/mm/aaaa, R$ 30,00...), só até a última linha preenchida. */
function lerIntervalo(a1) {
  const p = separar_(a1);
  const aba = aba_(p.aba, ABAS_LEITURA);
  const r = aba.getRange(p.intervalo);
  const linhas = Math.min(r.getNumRows(), aba.getLastRow() - r.getRow() + 1);
  if (linhas <= 0) return [];
  const valores = aba.getRange(r.getRow(), r.getColumn(), linhas, r.getNumColumns()).getDisplayValues();
  while (valores.length && valores[valores.length - 1].every(function (v) { return v === ''; })) valores.pop();
  return valores;
}

/** Grava valores num intervalo exato (ex.: Presencas!H5:I5). */
function gravar(a1, valores) {
  const p = separar_(a1);
  const aba = aba_(p.aba, ABAS_ESCRITA);
  return comTrava_(function () {
    aba.getRange(p.intervalo).setValues(valores);
    return { ok: true };
  });
}

/** Grava uma linha nova logo abaixo da última preenchida. */
function adicionarLinha(nomeAba, linha) {
  const aba = aba_(nomeAba, ABAS_ESCRITA);
  return comTrava_(function () {
    const row = Math.max(aba.getLastRow() + 1, 2);
    aba.getRange(row, 1, 1, linha.length).setValues([linha]);
    return row;
  });
}

/** Apaga uma linha inteira (range no formato da API: sheetId, startIndex 0-based). */
function excluirLinha(range) {
  const aba = planilha_().getSheets().filter(function (s) { return s.getSheetId() === range.sheetId; })[0];
  if (!aba || ABAS_ESCRITA.indexOf(aba.getName()) === -1) throw new Error('Aba não permitida.');
  const row = range.startIndex + 1;
  if (row < 2) throw new Error('Não é permitido apagar o cabeçalho.');
  return comTrava_(function () {
    aba.deleteRow(row);
    return { ok: true };
  });
}

function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(15000);
  try {
    const r = fn();
    SpreadsheetApp.flush();
    return r;
  } finally {
    trava.releaseLock();
  }
}

/** Rode esta função uma vez no editor para autorizar o acesso à planilha. */
function testarAcesso() {
  Logger.log('Pessoas cadastradas: ' + lerIntervalo('Pessoas!A2:J').length);
}
