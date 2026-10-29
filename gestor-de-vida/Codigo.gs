/**
 * Gestor de Vida — ponto de entrada do web app e configuração inicial.
 */

const APP_TITULO = 'Gestor de Vida';

const AREAS_PADRAO = [
  { nome: 'Pessoal', icone: '🌱', cor: '#7c5cff', visao: 'Me desenvolver como pessoa' },
  { nome: 'Profissional', icone: '💼', cor: '#2f80ed', visao: 'Crescer na minha carreira' },
  { nome: 'Física', icone: '💪', cor: '#27ae60', visao: 'Ter saúde, energia e um corpo ativo' },
  { nome: 'Emocional', icone: '🧠', cor: '#f2994a', visao: 'Cuidar da minha saúde mental e emocional' },
  { nome: 'Financeira', icone: '💰', cor: '#c9a227', visao: 'Ter tranquilidade e liberdade financeira' },
];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_TITULO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Inclui o conteúdo de outro arquivo HTML dentro do template. */
function incluir(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/**
 * Rode UMA VEZ pelo editor (Extensões > Apps Script, a partir da planilha):
 * cria as abas, guarda o ID da planilha e cadastra as áreas padrão.
 * Pode ser rodada de novo sem perder dados.
 */
function configurar() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) {
    throw new Error('Abra o editor a partir da planilha (Extensões > Apps Script) e rode de novo.');
  }
  PropertiesService.getScriptProperties().setProperty('PLANILHA_ID', planilha.getId());
  Object.keys(TABELAS).forEach(function (nome) { garantirAba(planilha, nome); });

  const padrao = planilha.getSheetByName('Página1') || planilha.getSheetByName('Sheet1');
  if (padrao && padrao.getLastRow() === 0 && planilha.getSheets().length > 1) {
    planilha.deleteSheet(padrao);
  }

  if (lerTabela('Areas').length === 0) {
    AREAS_PADRAO.forEach(function (area, i) {
      inserir('Areas', Object.assign({ id: novoId(), ativa: true, ordem: i + 1 }, area));
    });
  }
  Logger.log('Pronto! Agora implante o web app (Implantar > Nova implantação).');
}
