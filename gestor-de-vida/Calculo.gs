/**
 * Regras de negócio puras (sem acesso à planilha): semestres, pesos e notas.
 */

const NOMES_SEMESTRE = { 1: 'Jan–Jun', 2: 'Jul–Dez' };

/** "2027-S1" para jan–jun, "2027-S2" para jul–dez. */
function semestreDe(data) {
  return data.getFullYear() + '-S' + (data.getMonth() < 6 ? 1 : 2);
}

function lerSemestre_(id) {
  const partes = /^(\d{4})-S([12])$/.exec(String(id));
  if (!partes) throw new Error('Semestre inválido: ' + id);
  return { ano: Number(partes[1]), numero: Number(partes[2]) };
}

/** Semestre deslocado em `passo` semestres (−1 = anterior, +1 = próximo). */
function semestreVizinho(id, passo) {
  const s = lerSemestre_(id);
  const indice = s.ano * 2 + (s.numero - 1) + passo;
  return Math.floor(indice / 2) + '-S' + ((indice % 2) + 1);
}

function rotuloSemestre(id) {
  const s = lerSemestre_(id);
  return NOMES_SEMESTRE[s.numero] + ' ' + s.ano;
}

function numero_(valor) {
  const n = Number(String(valor).replace(',', '.'));
  return isFinite(n) ? n : 0;
}

function verdadeiro_(valor) {
  return valor === true || String(valor).toUpperCase() === 'TRUE';
}

function arredondar_(n) {
  return Math.round(n * 10) / 10;
}

/** Pontos que a meta já rendeu: peso × % feito. */
function pontosDaMeta(meta) {
  return arredondar_(numero_(meta.peso) * numero_(meta.feito) / 100);
}

/**
 * Resumo do semestre: pontos e soma dos pesos por área, e a nota geral
 * (média simples das áreas que têm metas no semestre).
 */
function calcularResumo(areas, metas, semestre) {
  const doSemestre = metas.filter(function (m) { return m.semestre === semestre; });
  const visiveis = areas
    .filter(function (a) {
      return verdadeiro_(a.ativa) || doSemestre.some(function (m) { return m.areaId === a.id; });
    })
    .sort(function (a, b) { return numero_(a.ordem) - numero_(b.ordem); });

  const porArea = visiveis.map(function (area) {
    const metasDaArea = doSemestre.filter(function (m) { return m.areaId === area.id; });
    const somaPesos = metasDaArea.reduce(function (s, m) { return s + numero_(m.peso); }, 0);
    const pontos = metasDaArea.reduce(function (s, m) {
      return s + numero_(m.peso) * numero_(m.feito) / 100;
    }, 0);
    return {
      areaId: area.id,
      qtdMetas: metasDaArea.length,
      somaPesos: arredondar_(somaPesos),
      faltaPeso: arredondar_(100 - somaPesos),
      pontos: arredondar_(pontos),
    };
  });

  const avaliadas = porArea.filter(function (r) { return r.qtdMetas > 0; });
  const notaGeral = avaliadas.length
    ? arredondar_(avaliadas.reduce(function (s, r) { return s + r.pontos; }, 0) / avaliadas.length)
    : 0;

  return { semestre: semestre, porArea: porArea, notaGeral: notaGeral, areasAvaliadas: avaliadas.length };
}
