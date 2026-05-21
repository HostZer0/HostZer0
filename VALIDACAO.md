# Validacao do fluxo de empresas

## Checklist no Netlify

- [ ] Fazer deploy do branch/PR no Netlify.
- [ ] Abrir a URL de preview do Netlify.
- [ ] Abrir o Console do navegador.
- [ ] Confirmar que a URL da API termina com `/exec`.
- [ ] Confirmar que o Apps Script esta publicado como Web App.
- [ ] Confirmar que o Web App esta acessivel por "Qualquer pessoa".
- [ ] Verificar se existem erros de CORS no Console.

## Cadastro

- [ ] Entrar no sistema com um usuario autorizado.
- [ ] Acessar Empresas.
- [ ] Clicar em Nova Empresa.
- [ ] Cadastrar uma empresa teste.
- [ ] Confirmar no Console o log `cadastrarEmpresa`.
- [ ] Confirmar que a tela so mostrou sucesso depois da resposta `ok: true`.
- [ ] Verificar se a empresa apareceu na aba `empresas` do Google Sheets.

## Edicao

- [ ] Abrir a empresa teste.
- [ ] Editar um campo simples, como responsavel, classe ou situacao.
- [ ] Confirmar no Console o log `editarEmpresa`.
- [ ] Verificar se a alteracao apareceu no Google Sheets.
- [ ] Recarregar a pagina e confirmar que o valor continua vindo da planilha.

## Exclusao

- [ ] Abrir a empresa teste.
- [ ] Clicar em Excluir empresa.
- [ ] Confirmar no Console o log `excluirEmpresa`.
- [ ] Verificar se a linha foi removida ou inativada no Google Sheets, conforme a regra do Apps Script.
- [ ] Recarregar a pagina e confirmar que a empresa nao volta na listagem.

## Diagnostico

- [ ] Verificar no Console os logs controlados por `DEBUG`.
- [ ] Conferir URL chamada.
- [ ] Conferir action enviada.
- [ ] Conferir status da resposta.
- [ ] Conferir JSON recebido.
- [ ] Conferir erro capturado, se houver.
