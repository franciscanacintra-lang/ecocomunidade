# EcoComunidade

Protótipo web responsivo para estimar consumo de energia e água, registrar hidrômetro, consultar materiais educativos e compartilhar dicas. Login, persistência e isolamento dos dados são feitos pelo Supabase. Cada pessoa acessa somente seus aparelhos, atividades e leituras; dicas publicadas ficam visíveis às demais contas autenticadas.

## Configuração do Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com/).
2. No SQL Editor do projeto, execute todo o arquivo `supabase/schema.sql`.
3. Em Project Settings > API, copie a Project URL e a chave `anon`/publishable. Não use a chave `service_role` no navegador.
4. Preencha `supabaseUrl` e `supabaseAnonKey` em `config.js`. A chave pública é destinada ao cliente; a segurança dos dados depende das políticas RLS do schema.
5. Em Authentication > URL Configuration, adicione o endereço local e o domínio publicado como Site URL/Redirect URLs.
6. Para publicar, conecte este diretório a um repositório Git e importe-o no Cloudflare Pages ou GitHub Pages. Não é necessário comando de build; o diretório raiz é a saída estática.

## Testar localmente

Abra este diretório no VS Code e execute um servidor HTTP estático, por exemplo com a extensão Live Server. Os módulos JavaScript e as chamadas Supabase não funcionam corretamente ao abrir `index.html` diretamente como `file://`.

## Incluído

- Cadastro, login, encerramento de sessão e redefinição de senha por e-mail.
- Estimativa mensal por aparelho: potência × horas/dia × dias/mês ÷ 1.000.
- Estimativa de atividades hídricas e registro de leituras do hidrômetro.
- Histórico por conta, com exclusão de registros individuais.
- Mural para usuários autenticados, com dicas visíveis à comunidade.
- Schema SQL com validações, índices e Row Level Security.

Os valores de tarifa, vazão e frequência são informados pelo usuário. As estimativas são educativas e não substituem a fatura ou a medição do fornecedor.

## Marca e ODS

Na abertura, o EcoComunidade usa os pictogramas oficiais de água e energia publicados nas páginas da ONU para [ODS 6](https://sdgs.un.org/goals/goal6) e [ODS 7](https://sdgs.un.org/goals/goal7). Abaixo da marca, os objetivos são descritos em texto. O projeto é independente e não representa oficialmente a ONU; consulte os [Objetivos de Desenvolvimento Sustentável](https://sdgs.un.org/goals).