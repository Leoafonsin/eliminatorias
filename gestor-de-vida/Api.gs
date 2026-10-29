/**
 * Funções chamadas pela interface (google.script.run).
 * Toda função que grava devolve o painel atualizado do semestre.
 */

function obterPainel(semestre) {
  const atual = semestreDe(new Date());
  semestre = semestre || atual;
  lerSemestre_(semestre);

  const areas = lerTabela('Areas').map(normalizarArea_);
  const metas = lerTabela('Metas').map(normalizarMeta_);
  const ultimosComentarios = ultimosComentariosPorMeta_();
  const doSemestre = metas
    .filter(function (m) { return m.semestre === semestre; })
    .map(function (m) {
      return Object.assign({}, m, { pontos: pontosDaMeta(m), ultimoComentario: ultimosComentarios[m.id] || '' });
    });
  const anterior = semestreVizinho(semestre, -1);

  return {
    semestre: semestre,
    rotulo: rotuloSemestre(semestre),
    semestreAtual: atual,
    anterior: anterior,
    proximo: semestreVizinho(semestre, 1),
    metasNoAnterior: metas.filter(function (m) { return m.semestre === anterior; }).length,
    areas: areas,
    metas: doSemestre,
    resumo: calcularResumo(areas, metas, semestre),
  };
}

function salvarArea(area, semestre) {
  const nome = String(area.nome || '').trim();
  if (!nome) throw new Error('Dê um nome para a área.');
  const dados = {
    nome: nome,
    icone: String(area.icone || '').trim() || '⭐',
    cor: area.cor || '#7c5cff',
    visao: String(area.visao || '').trim(),
    ativa: area.ativa !== false,
  };
  comTrava(function () {
    if (area.id) {
      atualizar('Areas', area.id, dados);
    } else {
      const ordens = lerTabela('Areas').map(function (a) { return numero_(a.ordem); });
      inserir('Areas', Object.assign({ id: novoId(), ordem: Math.max.apply(null, ordens.concat(0)) + 1 }, dados));
    }
  });
  return obterPainel(semestre);
}

/** Cria ou atualiza uma meta; se o % feito mudou (ou há comentário), registra a avaliação. */
function salvarMeta(meta, comentario) {
  const titulo = String(meta.titulo || '').trim();
  if (!titulo) throw new Error('Dê um título para a meta.');
  if (!meta.areaId) throw new Error('Escolha a área da meta.');
  lerSemestre_(meta.semestre);
  const peso = numero_(meta.peso);
  const feito = numero_(meta.feito);
  if (peso <= 0 || peso > 100) throw new Error('O peso deve ficar entre 1 e 100.');
  if (feito < 0 || feito > 100) throw new Error('O % feito deve ficar entre 0 e 100.');
  comentario = String(comentario || '').trim();

  comTrava(function () {
    const agora = new Date().toISOString();
    const dados = {
      semestre: meta.semestre,
      areaId: meta.areaId,
      titulo: titulo,
      criterio: String(meta.criterio || '').trim(),
      peso: peso,
      feito: feito,
      atualizadoEm: agora,
    };
    let id = meta.id;
    let feitoAntes = 0;
    if (id) {
      const existente = lerTabela('Metas').find(function (m) { return String(m.id) === String(id); });
      if (!existente) throw new Error('Meta não encontrada.');
      feitoAntes = numero_(existente.feito);
      atualizar('Metas', id, dados);
    } else {
      id = novoId();
      inserir('Metas', Object.assign({ id: id, criadoEm: agora }, dados));
    }
    if (feito !== feitoAntes || comentario) {
      inserir('Avaliacoes', { id: novoId(), data: agora, metaId: id, feito: feito, comentario: comentario });
    }
  });
  return obterPainel(meta.semestre);
}

/** Exclui a meta (o histórico de avaliações é mantido na planilha). */
function excluirMeta(id, semestre) {
  comTrava(function () { excluir('Metas', id); });
  return obterPainel(semestre);
}

/** Copia as metas de um semestre para outro, com o % feito zerado — base para a nova pesagem. */
function copiarMetas(origem, destino) {
  lerSemestre_(origem);
  lerSemestre_(destino);
  comTrava(function () {
    const agora = new Date().toISOString();
    lerTabela('Metas')
      .filter(function (m) { return m.semestre === origem; })
      .forEach(function (m) {
        inserir('Metas', {
          id: novoId(), semestre: destino, areaId: m.areaId, titulo: m.titulo, criterio: m.criterio,
          peso: numero_(m.peso), feito: 0, criadoEm: agora, atualizadoEm: agora,
        });
      });
  });
  return obterPainel(destino);
}

/** Histórico de avaliações de uma meta, da mais recente para a mais antiga. */
function obterHistorico(metaId) {
  return lerTabela('Avaliacoes')
    .filter(function (a) { return String(a.metaId) === String(metaId); })
    .map(function (a) { return { data: String(a.data), feito: numero_(a.feito), comentario: String(a.comentario || '') }; })
    .sort(function (a, b) { return a.data < b.data ? 1 : -1; });
}

function ultimosComentariosPorMeta_() {
  const porMeta = {};
  lerTabela('Avaliacoes')
    .filter(function (a) { return String(a.comentario || '').trim(); })
    .sort(function (a, b) { return String(a.data) < String(b.data) ? -1 : 1; })
    .forEach(function (a) { porMeta[a.metaId] = String(a.comentario); });
  return porMeta;
}

function normalizarArea_(a) {
  return {
    id: String(a.id), nome: String(a.nome), icone: String(a.icone || '⭐'), cor: String(a.cor || '#7c5cff'),
    visao: String(a.visao || ''), ativa: verdadeiro_(a.ativa), ordem: numero_(a.ordem),
  };
}

function normalizarMeta_(m) {
  return {
    id: String(m.id), semestre: String(m.semestre), areaId: String(m.areaId), titulo: String(m.titulo),
    criterio: String(m.criterio || ''), peso: numero_(m.peso), feito: numero_(m.feito),
  };
}
