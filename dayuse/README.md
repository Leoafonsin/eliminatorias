# Day Use – Controle de presença (Google Sheets + AppSheet)

App para registrar quem entra no day use (manhã e tarde), cadastrar visitantes na hora
e saber quanto foi arrecadado em cada dia.

## Regras de preço

| Turno | Aluno | Visitante |
|-------|-------|-----------|
| Manhã | **Isento (R$ 0)** | R$ 40 |
| Tarde | R$ 30 | R$ 40 |

Os valores ficam na aba **Precos** da planilha. Se o preço mudar, basta editar lá — o app passa a usar o novo valor.

## Como a planilha é organizada

| Aba | Para que serve |
|-----|----------------|
| **Pessoas** | Cadastro único: alunos **e** visitantes (coluna `Tipo`). Assim a busca é uma só e o visitante que volta não precisa ser recadastrado. |
| **Presencas** | Uma linha por entrada: data, turno, pessoa, valor, se pagou e a forma de pagamento. |
| **Precos** | Tabela de preços (Turno × Tipo). |
| **Resumo** | Painel do dia: quantas pessoas, valor previsto, recebido e pendente, por turno e forma de pagamento. |
| **Importar** | Lugar para colar a lista de alunos que você já tem. |

---

## Passo 1 – Criar a planilha com o script

1. Crie uma planilha nova no Google Sheets (ex.: "Day Use Clube").
2. Menu **Extensões > Apps Script**. Apague o que tiver e cole o conteúdo de [`Code.gs`](Code.gs). Salve.
3. Selecione a função `configurarPlanilha` e clique em **Executar** (autorize na primeira vez).
4. Volte para a planilha: as abas foram criadas e apareceu o menu **Day Use**.

## Passo 2 – Trazer a base de alunos

1. Na aba **Importar**, cole os alunos nas colunas `Nome | CPF | Telefone | Matricula`
   (só o Nome é obrigatório).
2. Menu **Day Use > Importar alunos**. O script cadastra todos como `Aluno` e ignora repetidos
   (mesmo CPF ou mesmo nome).

## Passo 3 – Criar o app no AppSheet

1. Na planilha: **Extensões > AppSheet > Criar um app**.
2. O AppSheet vai ler as abas. Em **Data**, confira se as tabelas `Pessoas`, `Presencas` e `Precos`
   foram adicionadas (adicione pelo botão **+** se faltar alguma). A aba `Resumo` e `Importar` não precisam entrar no app.

### 3.1 Tabela `Pessoas`

| Coluna | Tipo | Configuração |
|--------|------|--------------|
| ID | Text | **Key**. Initial value: `UNIQUEID()`. Desmarcar *Show*. |
| Nome | Name | **Label**. Required. |
| Tipo | Enum | Valores: `Aluno`, `Visitante`. Initial value: `"Visitante"`. Required. |
| CPF | Text | Valid if: `ISBLANK([_THIS]) OR NOT(IN([_THIS], SELECT(Pessoas[CPF], [ID] <> [_THISROW].[ID])))` → evita CPF duplicado. |
| Telefone | Phone | |
| Matricula | Text | Show if: `[Tipo] = "Aluno"` |
| Ativo | Yes/No | Initial value: `TRUE` |
| DataCadastro | Date | Initial value: `TODAY()`. Editable: desmarcado. |
| Observacao | LongText | |

### 3.2 Tabela `Presencas`

| Coluna | Tipo | Configuração |
|--------|------|--------------|
| ID | Text | **Key**. Initial value: `UNIQUEID()`. Desmarcar *Show*. |
| Data | Date | Initial value: `TODAY()` |
| Turno | Enum | Valores: `Manhã`, `Tarde`. Initial value: `IF(HOUR(TIMENOW()) < 13, "Manhã", "Tarde")` (o app já sugere o turno pela hora). |
| Pessoa | **Ref** → `Pessoas` | Required. Valid if (bloqueia entrada duplicada no mesmo dia/turno): ver fórmula abaixo. |
| Nome | Text | App formula: `[Pessoa].[Nome]` |
| Tipo | Text | App formula: `[Pessoa].[Tipo]` |
| Valor | Price | App formula: `LOOKUP(CONCATENATE([Turno], "\|", [Pessoa].[Tipo]), "Precos", "Chave", "Valor")` |
| Pago | Yes/No | Initial value: `[Valor] = 0` |
| FormaPagamento | Enum | Valores: `Pix`, `Dinheiro`, `Cartão`, `Isento`. Initial value: `IF([Valor] = 0, "Isento", "")`. Show if: `[Valor] > 0` (ou deixe sempre visível). Required if: `[Pago]` |
| HoraEntrada | Time | Initial value: `TIMENOW()` |
| RegistradoPor | Email | Initial value: `USEREMAIL()`. Editable: desmarcado. |
| Observacao | LongText | |

> Na fórmula do `Valor`, use `"|"` (sem a barra invertida — ela só aparece aqui por causa da tabela em Markdown).

**Valid if da coluna `Pessoa`** (não deixa registrar a mesma pessoa duas vezes no mesmo turno):

```
COUNT(
  FILTER("Presencas",
    AND(
      [Pessoa] = [_THISROW].[Pessoa],
      [Data]   = [_THISROW].[Data],
      [Turno]  = [_THISROW].[Turno],
      [ID]    <> [_THISROW].[ID]
    )
  )
) = 0
```

Em **Invalid value error** coloque: `Essa pessoa já foi registrada neste turno hoje.`

### 3.3 Tabela `Precos`

`Chave` como **Key**. Deixe a tabela como *read-only* para usuários comuns
(Data > Precos > *Are updates allowed?* → só `Read-Only`), e altere os preços direto na planilha.

### 3.4 Views (telas)

| View | Tabela / Slice | Tipo | Observação |
|------|----------------|------|------------|
| **Registrar entrada** | Presencas | Form | Coloque como primeira tela (posição *primary*). Ordem dos campos: Pessoa, Turno, Pago, FormaPagamento. |
| **Hoje** | slice `PresencasHoje` | Table / Deck | Agrupar por `Turno`. Mostra quem já entrou hoje. |
| **Pessoas** | Pessoas | Deck | Busca por nome/CPF. Botão **+** cadastra visitante novo. |
| **Pendentes** | slice `PendentesPagamento` | Table | Quem ainda não pagou. |
| **Histórico** | Presencas | Table | Agrupar por `Data`, ordenar desc. |

**Slices** (Data > Slices):

- `PresencasHoje` → Row filter: `[Data] = TODAY()`
- `PendentesPagamento` → Row filter: `AND([Valor] > 0, NOT([Pago]))`
- `PessoasAtivas` → Row filter: `[Ativo]`

Na coluna `Pessoa` da tabela Presencas, em **Suggested values**, use
`SELECT(Pessoas[ID], [Ativo])` para só aparecer quem está ativo.

### 3.5 Cadastrar visitante sem sair do registro

Ao escolher a pessoa no campo `Pessoa` (Ref), o AppSheet mostra o botão **Novo** dentro da lista.
Isso abre o formulário de `Pessoas`, você cadastra o visitante (Tipo já vem como `Visitante`)
e ele volta selecionado no registro de presença — tudo em uma tela.

### 3.6 Ação "Marcar como pago" (opcional, ajuda muito à tarde)

Behavior > Actions > nova ação na tabela `Presencas`:

- Do this: **Data: set the values of some columns in this row**
- Set: `Pago` = `TRUE`
- Only if: `AND([Valor] > 0, NOT([Pago]))`
- Prominence: *Display inline*

Assim, na tela **Pendentes**, é só tocar no botão para dar baixa.

---

## Fluxo no dia a dia

1. Pessoa chega → abre **Registrar entrada**.
2. Digita parte do nome no campo **Pessoa**:
   - achou → seleciona;
   - não achou → **Novo** → cadastra como Visitante (ou Aluno).
3. O app calcula o valor sozinho pelo turno e pelo tipo (aluno de manhã = isento).
4. Marca **Pago** e a forma de pagamento → Salvar.
5. No fim do turno/dia: na planilha, aba **Resumo** mostra totais;
   **Day Use > Gerar fechamento do dia** cria uma aba com a lista do dia para conferência.

## Ideias para próximas versões

- QR Code / carteirinha do aluno (coluna de código de barras no AppSheet → leitura pela câmera).
- Foto do visitante no cadastro (coluna tipo `Image`).
- Relatório mensal automático por e-mail (Automation do AppSheet ou gatilho de tempo no Apps Script).
- Controle de limite de capacidade por turno.
