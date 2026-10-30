/**
 * DAY USE – Controle de presença e valores
 * ----------------------------------------
 * Script para Google Sheets que monta a planilha-base usada pelo AppSheet.
 *
 * Como usar:
 *   1. Crie uma planilha nova no Google Sheets.
 *   2. Extensões > Apps Script > cole este arquivo inteiro > Salvar.
 *   3. Execute a função `configurarPlanilha` (autorize quando pedir).
 *   4. Volte para a planilha: vai aparecer o menu "Day Use".
 *
 * Abas criadas:
 *   Pessoas    -> cadastro único de alunos e visitantes
 *   Presencas  -> cada entrada no day use (uma linha por pessoa/dia/turno)
 *   Precos     -> tabela de preços (Turno x Tipo) – editável
 *   Resumo     -> painel do dia (quantidade e valores por turno)
 *   Importar   -> área para colar a lista de alunos que você já tem
 */

const ABAS = {
  PESSOAS: 'Pessoas',
  PRESENCAS: 'Presencas',
  PRECOS: 'Precos',
  RESUMO: 'Resumo',
  IMPORTAR: 'Importar',
};

const CABECALHOS = {
  Pessoas: ['ID', 'Nome', 'Tipo', 'CPF', 'Telefone', 'Email', 'Matricula', 'Ativo', 'DataCadastro', 'Observacao'],
  Presencas: ['ID', 'Data', 'Turno', 'Pessoa', 'Nome', 'Tipo', 'Valor', 'Pago', 'FormaPagamento',
              'HoraEntrada', 'Observacao'],
  Precos: ['Chave', 'Turno', 'Tipo', 'Valor'],
  Importar: ['Nome', 'CPF', 'Telefone', 'Matricula', 'Email'],
};

// Regras de preço do clube. Altere aqui ou direto na aba "Precos".
const PRECOS_PADRAO = [
  ['Manhã', 'Aluno', 0],      // aluno é isento de manhã
  ['Manhã', 'Visitante', 40],
  ['Tarde', 'Aluno', 30],
  ['Tarde', 'Visitante', 40],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Day Use')
    .addItem('1. Configurar planilha', 'configurarPlanilha')
    .addItem('2. Importar alunos da aba "Importar"', 'importarAlunos')
    .addSeparator()
    .addItem('Atualizar resumo para hoje', 'resumoHoje')
    .addItem('Gerar fechamento do dia (nova aba)', 'gerarFechamentoDoDia')
    .addToUi();
}

/** Cria/ajusta todas as abas. Pode rodar de novo sem perder dados. */
function configurarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  [ABAS.PESSOAS, ABAS.PRESENCAS, ABAS.PRECOS, ABAS.IMPORTAR].forEach(nome => {
    const aba = obterOuCriarAba_(ss, nome);
    const cab = CABECALHOS[nome];
    aba.getRange(1, 1, 1, cab.length).setValues([cab])
      .setFontWeight('bold').setBackground('#1f4e78').setFontColor('#ffffff');
    aba.setFrozenRows(1);
  });

  configurarPrecos_(ss);
  configurarFormatos_(ss);
  configurarResumo_(ss);

  const padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (padrao && padrao.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(padrao);

  ss.setActiveSheet(ss.getSheetByName(ABAS.RESUMO));
  SpreadsheetApp.getUi().alert(
    'Planilha pronta!\n\n' +
    '• Cole sua lista de alunos na aba "Importar" e use o menu Day Use > Importar alunos.\n' +
    '• Depois crie o app no AppSheet a partir desta planilha (veja o guia).');
}

function configurarPrecos_(ss) {
  const aba = ss.getSheetByName(ABAS.PRECOS);
  if (aba.getLastRow() > 1) return; // já tem preços, não sobrescreve
  const linhas = PRECOS_PADRAO.map(([turno, tipo, valor]) => [turno + '|' + tipo, turno, tipo, valor]);
  aba.getRange(2, 1, linhas.length, 4).setValues(linhas);
  aba.getRange('D2:D').setNumberFormat('R$ #,##0.00');
}

function configurarFormatos_(ss) {
  const pessoas = ss.getSheetByName(ABAS.PESSOAS);
  pessoas.getRange('D2:D').setNumberFormat('@'); // CPF como texto (mantém zeros à esquerda)
  pessoas.getRange('E2:G2000').setNumberFormat('@'); // telefone, e-mail e matrícula como texto
  pessoas.getRange('I2:I').setNumberFormat('dd/MM/yyyy');

  const pres = ss.getSheetByName(ABAS.PRESENCAS);
  pres.getRange('B2:B').setNumberFormat('dd/MM/yyyy');
  pres.getRange('G2:G').setNumberFormat('R$ #,##0.00');
  pres.getRange('J2:J').setNumberFormat('HH:mm');

  ss.getSheetByName(ABAS.IMPORTAR).getRange('B2:B').setNumberFormat('@');
  ss.getSheetByName(ABAS.IMPORTAR).getRange('D2:D').setNumberFormat('@');
}

/** Painel com contagem e valores do dia escolhido em B2. */
function configurarResumo_(ss) {
  const aba = obterOuCriarAba_(ss, ABAS.RESUMO);
  aba.clear();

  aba.getRange('A1').setValue('RESUMO DO DAY USE').setFontWeight('bold').setFontSize(14);
  aba.getRange('A2').setValue('Data:').setFontWeight('bold');
  aba.getRange('B2').setFormula('=TODAY()').setNumberFormat('dd/MM/yyyy').setBackground('#fff2cc');
  aba.getRange('C2').setValue('← troque a data para ver outro dia').setFontColor('#888888');

  aba.getRange('A4:F4').setValues([['Turno', 'Tipo', 'Pessoas', 'Valor previsto', 'Valor recebido', 'Pendente']])
    .setFontWeight('bold').setBackground('#1f4e78').setFontColor('#ffffff');

  const P = ABAS.PRESENCAS;
  const linhas = [['Manhã', 'Aluno'], ['Manhã', 'Visitante'], ['Tarde', 'Aluno'], ['Tarde', 'Visitante']];
  linhas.forEach(([turno, tipo], i) => {
    const r = 5 + i;
    const filtro = `${P}!$B:$B,$B$2,${P}!$C:$C,$A${r},${P}!$F:$F,$B${r}`;
    aba.getRange(r, 1, 1, 6).setValues([[
      turno, tipo,
      `=COUNTIFS(${filtro})`,
      `=SUMIFS(${P}!$G:$G,${filtro})`,
      `=SUMIFS(${P}!$G:$G,${filtro},${P}!$H:$H,TRUE)`,
      `=D${r}-E${r}`,
    ]]);
  });
  aba.getRange('A9:F9').setValues([['TOTAL', '', '=SUM(C5:C8)', '=SUM(D5:D8)', '=SUM(E5:E8)', '=SUM(F5:F8)']])
    .setFontWeight('bold').setBackground('#d9e1f2');
  aba.getRange('D5:F9').setNumberFormat('R$ #,##0.00');

  aba.getRange('A11').setValue('Por forma de pagamento').setFontWeight('bold');
  aba.getRange('A12:C12').setValues([['Forma', 'Qtd', 'Valor']])
    .setFontWeight('bold').setBackground('#1f4e78').setFontColor('#ffffff');
  ['Pix', 'Dinheiro', 'Cartão', 'Isento'].forEach((forma, i) => {
    const r = 13 + i;
    const filtro = `${P}!$B:$B,$B$2,${P}!$I:$I,$A${r}`;
    aba.getRange(r, 1, 1, 3).setValues([[forma, `=COUNTIFS(${filtro})`, `=SUMIFS(${P}!$G:$G,${filtro})`]]);
  });
  aba.getRange('C13:C16').setNumberFormat('R$ #,##0.00');
  aba.autoResizeColumns(1, 6);
}

/**
 * Lê a aba "Importar" (Nome, CPF, Telefone, Matricula, Email) e cadastra como Aluno
 * na aba Pessoas, ignorando quem já existe (mesmo CPF ou mesma matrícula).
 * O nome só é usado para comparar quando a linha não tem CPF nem matrícula.
 */
function importarAlunos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const imp = ss.getSheetByName(ABAS.IMPORTAR);
  const pessoas = ss.getSheetByName(ABAS.PESSOAS);
  if (!imp || !pessoas) throw new Error('Rode "Configurar planilha" primeiro.');

  const existentes = pessoas.getLastRow() > 1
    ? pessoas.getRange(2, 1, pessoas.getLastRow() - 1, 7).getValues()
    : [];
  const cpfs = new Set(existentes.map(r => limparCpf_(r[3])).filter(String));
  const matriculas = new Set(existentes.map(r => limparMatricula_(r[6])).filter(String));
  const nomes = new Set(existentes.map(r => normalizar_(r[1])));

  const dados = imp.getLastRow() > 1 ? imp.getRange(2, 1, imp.getLastRow() - 1, 5).getValues() : [];
  const hoje = new Date();
  const novos = [];
  const avisos = [];
  let ignorados = 0;

  dados.forEach(([nome, cpf, tel, matricula, email]) => {
    nome = String(nome).trim();
    if (!nome) return;
    const cpfLimpo = limparCpf_(cpf);
    const mat = limparMatricula_(matricula);
    const chaveNome = normalizar_(nome);
    const repetido = (cpfLimpo && cpfs.has(cpfLimpo)) || (mat && matriculas.has(mat)) ||
                     (!cpfLimpo && !mat && nomes.has(chaveNome));
    if (repetido) { ignorados++; return; }
    if (cpfLimpo && cpfLimpo.length !== 11) avisos.push(`${nome}: CPF com ${cpfLimpo.length} dígitos`);
    if (cpfLimpo) cpfs.add(cpfLimpo);
    if (mat) matriculas.add(mat);
    nomes.add(chaveNome);
    novos.push([gerarId_(), nome, 'Aluno', cpfLimpo, String(tel).trim(), String(email || '').trim().toLowerCase(), mat,
                true, hoje, '']);
  });

  if (novos.length) {
    pessoas.getRange(pessoas.getLastRow() + 1, 1, novos.length, novos[0].length).setValues(novos);
    imp.getRange(2, 1, imp.getLastRow() - 1, 5).clearContent();
  }
  let msg = `${novos.length} aluno(s) importado(s). ${ignorados} já existiam e foram ignorados.`;
  if (avisos.length) msg += '\n\nConfira estes CPFs:\n' + avisos.slice(0, 20).join('\n');
  SpreadsheetApp.getUi().alert(msg);
}

function resumoHoje() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS.RESUMO);
  aba.getRange('B2').setFormula('=TODAY()');
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(aba);
}

/** Copia as presenças do dia (data do Resumo!B2) para uma aba "Fechamento dd-MM". */
function gerarFechamentoDoDia() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = ss.getSheetByName(ABAS.RESUMO).getRange('B2').getValue();
  const tz = ss.getSpreadsheetTimeZone();
  const alvo = Utilities.formatDate(new Date(data), tz, 'yyyy-MM-dd');

  const pres = ss.getSheetByName(ABAS.PRESENCAS);
  const valores = pres.getDataRange().getValues();
  const cab = valores.shift();
  const doDia = valores
    .filter(r => r[1] instanceof Date && Utilities.formatDate(r[1], tz, 'yyyy-MM-dd') === alvo)
    .sort((a, b) => String(a[2]).localeCompare(b[2]) || String(a[4]).localeCompare(b[4]));

  const nome = 'Fechamento ' + Utilities.formatDate(new Date(data), tz, 'dd-MM-yyyy');
  const antiga = ss.getSheetByName(nome);
  if (antiga) ss.deleteSheet(antiga);
  const aba = ss.insertSheet(nome);
  aba.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
  if (doDia.length) aba.getRange(2, 1, doDia.length, cab.length).setValues(doDia);
  const total = doDia.reduce((s, r) => s + (Number(r[6]) || 0), 0);
  aba.getRange(doDia.length + 3, 6, 1, 2).setValues([['TOTAL', total]]).setFontWeight('bold');
  aba.getRange('G:G').setNumberFormat('R$ #,##0.00');
  aba.autoResizeColumns(1, cab.length);
}

// ---------- utilitários ----------

function obterOuCriarAba_(ss, nome) {
  return ss.getSheetByName(nome) || ss.insertSheet(nome);
}

function gerarId_() {
  return Utilities.getUuid().slice(0, 8);
}

function limparCpf_(cpf) {
  const digitos = String(cpf || '').replace(/\D/g, '');
  // CPF colado como número perde os zeros à esquerda (ex.: 01234567890 -> 1234567890)
  return digitos.length >= 9 && digitos.length < 11 ? digitos.padStart(11, '0') : digitos;
}

function limparMatricula_(mat) {
  return String(mat || '').trim().toUpperCase();
}

function normalizar_(texto) {
  return String(texto || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}
