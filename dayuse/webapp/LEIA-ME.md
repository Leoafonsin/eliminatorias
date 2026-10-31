# Day Use do Clube – app no Google Apps Script

Mesmo app do claude.ai (abas **Day Use** e **Cadastro**), rodando na sua conta Google e gravando na
planilha **Day Use - Controle de Presença**. Faça isto uma vez, de preferência no computador.

## 1. Colar o código

1. Abra a planilha **Day Use - Controle de Presença** > menu **Extensões > Apps Script**.
2. No arquivo `Código.gs` (ou `Code.gs`), apague tudo e cole o conteúdo de [`Code.gs`](Code.gs).
3. Em **Arquivos**, clique no **+** > **HTML**, dê o nome `Index` (sem `.html`) e confirme.
   Apague o que vier dentro e cole o conteúdo de [`Index.html`](Index.html).
4. Clique no disquete (**Salvar projeto**).

## 2. Autorizar

1. Na barra de cima, escolha a função `testarAcesso` e clique em **Executar**.
2. Vai aparecer **Autorização necessária** > **Revisar permissões** > escolha sua conta.
3. O Google mostra "O Google não verificou este app" (normal, o app é seu): clique em **Avançado** >
   **Acessar Day Use (não seguro)** > **Permitir**.
4. No registro de execução deve aparecer `Pessoas cadastradas: ...`.

## 3. Publicar

1. **Implantar > Nova implantação**.
2. Na engrenagem ao lado de "Selecionar tipo", escolha **App da Web**.
3. Descrição: `Day Use`. **Executar como: Eu**.
   **Quem pode acessar**:
   - **Somente eu**: só você usa.
   - **Qualquer pessoa com Conta do Google**: outras pessoas do clube usam com o link.
     Quem tiver o link consegue registrar e apagar, então só passe para quem trabalha no day use.
4. **Implantar** e copie o **URL do app da Web** (termina em `/exec`).

## 4. Ícone no celular

Abra o URL no celular, logado na sua conta Google:

- **iPhone (Safari):** Compartilhar > **Adicionar à Tela de Início**.
- **Android (Chrome):** menu ⋮ > **Adicionar à tela inicial**.

## Quando eu mudar o código

Cole o código novo nos mesmos arquivos e vá em **Implantar > Gerenciar implantações** > lápis >
Versão: **Nova versão** > **Implantar**. O link e o ícone continuam os mesmos.
