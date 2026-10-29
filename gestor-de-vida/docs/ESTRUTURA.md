# Estrutura do Gestor de Vida

Documento-base do projeto. Tudo o que vier depois (hábitos, agenda, jogo)
se apoia nesta estrutura.

## Conceito

```
🧭 ÁREAS DA VIDA
 │   Pessoal · Profissional · Física · Emocional · Financeira (+ as que eu criar)
 │   "Objetivo de vida" = me desenvolver em cada área (cada área tem uma frase de visão)
 │
 └── 📅 SEMESTRE (fixo: S1 = jan–jun, S2 = jul–dez)
       │
       └── ⚖️ METAS DA ÁREA ("pesagem")
             • cada meta tem um PESO conforme a complexidade
             • os pesos das metas de uma área somam 100%
             • ao longo do semestre registro o quanto fiz de cada meta (0–100%)
             • pontos da meta = peso × % feito
             • desenvolvimento da área = soma dos pontos das suas metas
```

### Exemplo — área Emocional, 2027-S1

| Meta                                      | Peso | Feito | Pontos   |
|-------------------------------------------|-----:|------:|---------:|
| Fazer terapia quinzenal                   |  30% |  100% | **30**   |
| Meditar 10 min por dia                    |  20% |   75% | **15**   |
| Ler 2 livros sobre inteligência emocional |  15% |   50% | **7,5**  |
| Diário semanal                            |  20% |   80% | **16**   |
| Um fim de semana offline por mês          |  15% |   60% | **9**    |
| **Total da área**                         | 100% |       | **77,5%**|

## Regras

1. **Nível único:** Área → Metas com peso. (Um nível intermediário de
   "objetivos" pode ser adicionado no futuro.)
2. **Pesos:** devem somar 100% por área em cada semestre. O app avisa
   quando sobra ou falta peso, mas não bloqueia — a pesagem pode ser feita aos poucos.
3. **Progresso:** medido em percentual (0–100%), atualizado a qualquer
   momento. Cada atualização fica registrada no histórico (aba `Avaliacoes`).
4. **Nota geral do semestre:** média simples das áreas que têm metas no
   semestre — todas as áreas pesam igual.
5. **Semestres fixos:** `AAAA-S1` (jan–jun) e `AAAA-S2` (jul–dez), calculados pela data.
6. **Áreas personalizáveis:** posso criar, editar e desativar áreas. Área
   desativada some do semestre atual, mas continua aparecendo nos semestres em
   que teve metas.

## Planilha (banco de dados)

| Aba          | Colunas                                                                 |
|--------------|-------------------------------------------------------------------------|
| `Areas`      | id, nome, icone, cor, visao, ativa, ordem                               |
| `Metas`      | id, semestre, areaId, titulo, criterio, peso, feito, criadoEm, atualizadoEm |
| `Avaliacoes` | id, data, metaId, feito, comentario                                     |

## Relatório do semestre

Resumo por área (nota + metas com peso, % feito e pontos) e nota geral, para
compartilhar com o amigo que faz a pesagem junto. Pode ser copiado como texto
(WhatsApp) ou impresso/salvo em PDF.

## Roteiro

- **Fase 1 (atual):** áreas, semestres, metas com pesos, avaliações, relatório.
- **Fase 2:** hábitos diários (feito/não feito, ligados a áreas) e integração
  com o Google Agenda (compromissos do dia, lembretes no Android).
- **Fase 3:** jogo inspirado no Habitica (XP, níveis por área, recompensas).
- **Em aberto (futuro):** acesso/comentários do amigo no app, feedback mútuo,
  peso diferente por área, nível intermediário de objetivos.
