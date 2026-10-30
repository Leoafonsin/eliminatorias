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

## Atalho – planilha já pronta

O arquivo [`DayUse.xlsx`](DayUse.xlsx) já vem com todas as abas, preços, listas e o Resumo com fórmulas.

1. Abra o [Google Drive](https://drive.google.com) > **Novo > Upload de arquivo** > escolha `DayUse.xlsx`.
2. Clique com o botão direito no arquivo > **Abrir com > Planilhas Google**.
3. **Arquivo > Salvar como Planilhas Google** (o AppSheet só lê planilhas Google, não `.xlsx`).
4. Cole seus alunos na aba **Pessoas** *ou*, melhor, gere a planilha já com os alunos
   (`python dayuse/gerar_planilha.py alunos.xlsx`) — cada aluno precisa de um `ID` único.
5. Pule para o **Passo 3**. (O script `Code.gs` continua opcional, para ter o menu de importação e o fechamento do dia.)

## Passo 1 – Criar a planilha com o script

1. Crie uma planilha nova no Google Sheets (ex.: "Day Use Clube").
2. Menu **Extensões > Apps Script**. Apague o que tiver e cole o conteúdo de [`Code.gs`](Code.gs). Salve.
3. Selecione a função `configurarPlanilha` e clique em **Executar** (autorize na primeira vez).
4. Volte para a planilha: as abas foram criadas e apareceu o menu **Day Use**.

## Passo 2 – Trazer a base de alunos

1. Na aba **Importar**, cole os alunos nas colunas `Nome | CPF | Telefone | Matricula`
   (só o Nome é obrigatório, mas com CPF e matrícula a busca e o controle de repetidos ficam muito melhores).
2. Menu **Day Use > Importar alunos**. O script cadastra todos como `Aluno` e ignora repetidos
   (mesmo CPF **ou** mesma matrícula — o nome só é comparado quando a linha não tem nenhum dos dois).
   - CPF pode vir com ou sem pontuação; o script guarda só os números.
   - Se o CPF perdeu o zero da frente (comum quando vem do Excel como número), o script completa.
   - No final aparece um aviso listando CPFs com quantidade errada de dígitos, para você conferir.

## Passo 3 – Criar o app no AppSheet

1. Na planilha: **Extensões > AppSheet > Criar um app**.
2. O AppSheet vai ler as abas. Em **Data**, confira se as tabelas `Pessoas`, `Presencas` e `Precos`
   foram adicionadas (adicione pelo botão **+** se faltar alguma). A aba `Resumo` e `Importar` não precisam entrar no app.

### 3.1 Tabela `Pessoas`

| Coluna | Tipo | Configuração |
|--------|------|--------------|
| ID | Text | **Key**. Initial value: `UNIQUEID()`. Desmarcar *Show*. |
| Nome | Name | Required. |
| Tipo | Enum | Valores: `Aluno`, `Visitante`. Initial value: `"Visitante"`. Required. |
| CPF | Text | Valid if: ver fórmula abaixo (11 dígitos e sem duplicar). |
| Telefone | Phone | |
| Matricula | Text | Show if: `[Tipo] = "Aluno"`. Required if: `[Tipo] = "Aluno"`. Valid if: `NOT(IN([_THIS], SELECT(Pessoas[Matricula], [ID] <> [_THISROW].[ID])))` |
| Ativo | Yes/No | Initial value: `TRUE` |
| DataCadastro | Date | Initial value: `TODAY()`. Editable: desmarcado. |
| Observacao | LongText | |
| **Busca** (virtual) | Text | Clique em **Add virtual column**. App formula: `CONCATENATE([Nome], " • Mat. ", [Matricula], " • CPF ", [CPF])`. Marque como **Label**. |

**Por que a coluna `Busca`?** O campo de seleção de pessoa no registro de presença pesquisa pelo *Label*.
Com essa coluna como Label, você acha o aluno digitando **nome, matrícula ou CPF** — e ainda
diferencia dois alunos com o mesmo nome.

**Valid if da coluna `CPF`:**

```
OR(
  ISBLANK([_THIS]),
  AND(
    LEN([_THIS]) = 11,
    NOT(IN([_THIS], SELECT(Pessoas[CPF], [ID] <> [_THISROW].[ID])))
  )
)
```

Invalid value error: `CPF deve ter 11 números e não pode estar cadastrado em outra pessoa.`
(Digite o CPF só com números. Para visitante o CPF é opcional — se quiser obrigar, troque `ISBLANK([_THIS])` por `FALSE`.)

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
| **Pessoas** | Pessoas | Deck | Busca por nome, matrícula ou CPF. Botão **+** cadastra visitante novo. |
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

## Uso por uma pessoa só

Como só você vai registrar, o app pode ficar no modo **protótipo** do AppSheet (sem publicar),
que já funciona normalmente no celular para o dono do app — não precisa configurar usuários nem permissões.
Instale o app **AppSheet** no celular, entre com a mesma conta Google da planilha e o app aparece lá.
Ele funciona até sem internet: os registros ficam guardados e sincronizam quando a conexão voltar.

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
