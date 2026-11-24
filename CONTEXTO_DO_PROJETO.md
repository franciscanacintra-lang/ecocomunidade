# EcoComunidade — contexto do projeto

Este arquivo registra decisões e o estado técnico para retomar o trabalho em outra conversa. Não é uma transcrição literal do chat e não deve conter senhas ou chaves privadas.

## Objetivo

Aplicativo web responsivo para moradores e pequenos comércios acompanharem estimativas de consumo de água (ODS 6) e energia (ODS 7), registrarem leituras do hidrômetro e compartilharem dicas educativas.

## Decisões de produto e visual

- Interface em português, responsiva para desktop e celular.
- Identidade própria EcoComunidade com pictogramas oficiais de água e sol, seguidos pelo nome e pela descrição da contribuição aos ODS 6 e 7.
- Paleta inspirada nos ODS: azul para água e amarelo/âmbar para energia.
- Login por e-mail e senha, com dados privados por usuário.
- Mural de dicas visível a usuários autenticados; autoria associada à conta.

## Funcionalidades implementadas

- Cadastro, login, logout e redefinição de senha pelo Supabase Auth.
- Simulador mensal de energia por aparelho.
- Registro de atividades hídricas e leituras do hidrômetro.
- Dashboard de estimativas e históricos.
- Mural comunitário de boas práticas.
- Banco com Row Level Security para separar registros por usuário.

## Arquivos principais

- `index.html`: interface e formulários.
- `styles.css` e `ods-theme.css`: layout e identidade visual.
- `app.js`: autenticação, navegação e integração com Supabase.
- `config.js`: URL do projeto Supabase e chave Publishable usada pelo navegador. Não registrar os valores deste arquivo em documentação nem compartilhar chaves Secret/service_role.
- `supabase/schema.sql`: tabelas, índices, validações e políticas RLS.
- `assets/ods-6-water.png` e `assets/ods-7-sun.png`: pictogramas utilizados pela marca.

## Estado conhecido

- O schema SQL foi executado no Supabase e retornou `Success. No rows returned`.
- A integração local foi configurada. A URL correta do projeto usa o domínio `.supabase.co`; uma tentativa com `.supabase.com` causava `Failed to fetch`.
- O endpoint de autenticação respondeu HTTP 200 quando testado com a chave pública configurada.
- O cadastro enviou a mensagem de confirmação por e-mail. A confirmação pode redirecionar de volta a `http://localhost:4174`; depois, a pessoa deve entrar com a conta do EcoComunidade.
- O servidor local usado para a prévia é `http://localhost:4174`.
- Sintaxe do JavaScript e renderização responsiva foram verificadas durante o desenvolvimento.

## Próximos passos

1. Confirmar o e-mail de cadastro e testar login, criação de registros e isolamento dos dados.
2. Para publicar, conectar a pasta/repositório ao Cloudflare Pages ou outra hospedagem estática gratuita.
3. Após publicar, adicionar o domínio público em Supabase Authentication → URL Configuration (Site URL e Redirect URLs), substituindo/acomodando o endereço local.
4. Nunca colocar uma chave `secret` ou `service_role` em arquivos servidos pelo navegador.

## Retomar o chat no VS Code

O histórico do Copilot Chat costuma ficar disponível na lista de conversas/sessões do próprio VS Code. Este arquivo serve como resumo independente para continuar o projeto mesmo se o chat não estiver acessível.
