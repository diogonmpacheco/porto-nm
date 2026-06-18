# Porto NM

Aplicação privada para uma comunidade não-monogâmica em Porto, pensada para substituir parte do caos de grupos de WhatsApp por espaços com memória, consentimento, eventos, apresentações cuidadas e gestão de subgrupos.

Estado actual: protótipo funcional com frontend em React/Vite, backend em Supabase, autenticação, dados em tempo real, regras de acesso e deploy em Vercel.

## Demonstração

URL de produção:

<https://porto-nm-beige.vercel.app>

Contas de teste para demonstração privada:

- `admin` / `PortoNM`
- `tester` / `PortoNM`

A conta `admin` mostra melhor o produto porque consegue ver e gerir mais conteúdo. A conta `tester` é útil para testar a experiência de uma pessoa normal da comunidade.

## O que já existe

### Entrada privada

- Login por Supabase Auth.
- Acesso simplificado por aliases de teste (`admin` e `tester`).
- Primeiro perfil da comunidade fica como `admin`.
- Entrada por convite.
- Cada convite fica ligado à pessoa que convidou.
- A área **Apadrinhamento** mostra quem convidou quem e quantas pessoas cada membro trouxe.

### Painel Hoje

- Resumo rápido de membros, eventos, decisões e novas entradas.
- Próximos eventos.
- Lista de apadrinhamento.
- Visão rápida dos subgrupos.

### Arquitectura de menus

- **Hoje**: resumo e atalhos.
- **Chat**: salas, media privada e citações.
- **Agenda**: eventos, salas temporárias, check-ins e aftercare.
- **Comunidade**: perfil, conexões, subgrupos, entradas e compersão.
- **Memória**: documentos, decisões, acordos, leituras e rituais.
- **Nocturno**: Eroteca, provocações, tensão mútua, fantasias e confessionário.
- **Cuidado**: ciúme, reparação, saúde sexual e mediação.
- **Admin**: moderação e gestão.

### Chat

- Conversas por sala/subgrupo.
- Admins podem criar novas salas directamente no Chat.
- Presença online/offline por membro.
- Relay cifrado por dispositivo para novas mensagens.
- Cada browser cria uma chave local; a chave privada fica apenas nesse browser.
- O Supabase guarda apenas envelopes cifrados por dispositivo e metadados de entrega.
- Pessoas que já tenham aberto a app pelo menos uma vez podem receber mensagens cifradas mesmo que estejam offline no momento.
- WebRTC tenta abrir ligações directas entre dispositivos online na mesma sala.
- Quando uma ligação directa está aberta, a mensagem também é entregue por data channel, mantendo o relay cifrado como cópia durável/offline.
- Mensagens antigas continuam em texto normal até serem migradas ou apagadas.
- Citação de documentos e decisões usando `@`.
- Sugestões de citações enquanto se escreve.
- Cópia rápida de códigos de documentos/decisões.
- Interface mobile simplificada, mais próxima de uma app de mensagens.

### Comunidade

- Separadores para perfil, conexões, grupos, entradas e compersão.
- Cada pessoa pode actualizar o próprio nome, pronomes e presença.
- Upload de fotografia de perfil.
- Fotografias de perfil ficam em storage privado.
- Cartão de consentimento e preferências editável pelo próprio perfil.
- Área de compersão para apreciações e momentos bons.

### Imagens privadas

- Upload de imagens no chat com encriptação local antes do envio.
- O ficheiro guardado no Supabase é ciphertext (`application/octet-stream`), não a imagem original.
- A chave AES da imagem viaja apenas dentro do envelope cifrado por dispositivo.
- Opção de imagem normal.
- Opção **ver uma vez**.
- Envelope privado com aviso de consentimento antes de abrir.
- Expiração configurável.
- Registo de quem abriu imagens protegidas.
- Storage privado em Supabase para imagens de mensagens.

### Memória e decisões

- Documentos/conclusões com título, texto, etiquetas e código citável.
- Decisões com ata curta, decisão final, estado e votos.
- Votos: `sim`, `não`, `abstenção`, `bloqueio`.
- Decisões e documentos podem ser citados no chat com `@`.
- Acordos vivos da comunidade.
- Leituras e perguntas de discussão.
- Rituais para dates, media íntima, festas e entradas novas.
- Admins ou autores podem apagar conteúdos criados.
- Feedback visual quando uma acção é guardada/copiada/apagada.

### Agenda

- Lista de eventos visível por defeito.
- Criação de evento escondida atrás do botão **Novo evento**.
- Criação de eventos com data, local, capacidade e subgrupo.
- Confirmação de presença.
- Política de fotos por evento.
- Notas de limites/acordos do espaço.
- Campo de aftercare.
- Check-in pós-evento com humor, nota e visibilidade.
- Admins ou criadores podem apagar eventos.
- Salas temporárias associadas a eventos, com data de expiração.

### Conexões e confiança

- Área **Conexões e confiança**.
- Interface por separadores para reduzir ruído visual.
- Quadro de intenções: amizades, dates, flirt, eventos, indisponível ou só com apresentação.
- Notas pessoais de disponibilidade.
- Pedidos de **apresentação quente**, com pessoa alvo, pessoa ponte, nota e estado.
- Interesse mútuo por pessoa e tipo de interesse.
- Indicação de match quando o interesse é recíproco.
- Constelação de relações/ligações, com visibilidade privada, por conexões ou comunidade.
- Fundação P2P: opções de mensagens só no dispositivo, cofre local de media, remoção de metadados e prontidão para P2P.

### Comunidade e subgrupos

- Subgrupos com foco, privacidade e pessoa responsável.
- Privacidade: aberto, convite ou secreto.
- Admins podem criar subgrupos.
- Admins podem gerir membros de subgrupos.
- Cada grupo tem cor e sala própria.

### Nocturno

- Zona de energia erótica e curadoria adulta.
- **Eroteca** para links adultos com tags, aviso de conteúdo e nota de curadoria.
- **Provocações** para prompts eróticos e conversas com tensão.
- **Tensão mútua** ligada ao interesse recíproco de flirt.
- **Fantasias** com mood, limites, modo e aftercare.
- **Confessionário** com partilha anónima ou assinada.
- **Vídeo privado** para salas peer-to-peer entre pessoas convidadas e com aceitação explícita.
- Nas salas de vídeo, a câmara/microfone só abrem depois de acção directa da pessoa.
- Media de vídeo/áudio não é guardada, não é analisada e não passa pelos servidores da aplicação em modo directo.
- Relay de media existe apenas se TURN estiver configurado e se a pessoa activar a opção explicitamente.

### Cuidado

- **Ciúme Lab** para separar acontecimento, história interna e necessidade.
- **Reparação** para preparar conversas de impacto, pedido e mediação.
- **Saúde sexual** com cartões para testes, barreiras, disclosure e follow-up.
- **Mediação** como estrutura de pedidos de ajuda e acompanhamento.

### Admin e moderação

- Separador **Admin** visível apenas para admins.
- Visão geral de membros, novas entradas, pedidos de apresentação e itens que precisam de atenção.
- Fila de moderação com novas entradas, pedidos pendentes, check-ins sensíveis, decisões abertas, salas expiradas e cartões de consentimento incompletos.
- Painel de saúde da plataforma: salas temporárias activas, media sensível, eventos no limite e convites esgotados.
- Gestão de papéis por membro: `nova pessoa`, `membro` e `admin`.
- Gestão rápida de presença online/offline.
- Revisão de mensagens recentes com remoção por admin.
- Revisão rápida de eventos, decisões e documentos com acções de eliminação.
- Lista de próximas ideias de moderação/produto para orientar a evolução.

### Backend e segurança

- Supabase Auth.
- Tabelas normalizadas.
- Row Level Security activa.
- Políticas para leitura/escrita por membros, autores, participantes e admins.
- Políticas admin para leitura global e eliminação de mensagens.
- Realtime activado nas tabelas principais.
- Storage privado para imagens de chat e fotografias de perfil.
- Chaves públicas por dispositivo em `device_keys`.
- Novas mensagens de texto/citação guardadas como envelopes cifrados em `messages.encrypted_payloads`.
- Media nova guardada cifrada, com chave/IV só dentro do envelope cifrado por dispositivo.
- Sinalização WebRTC curta em `p2p_signals`; o conteúdo da conversa não passa por esta tabela.
- Salas de vídeo usam WebRTC com media cifrada em trânsito pelo browser.
- Para vídeo, o servidor só transporta convites/offer/answer/ICE temporários; áudio e imagem não são persistidos.
- Admins conseguem moderar e apagar mensagens cifradas, mas não ler o conteúdo se não tiverem a chave do dispositivo destinatário.
- Migrations versionadas em `supabase/migrations/`.

## Dados de demonstração

A aplicação inclui dados fictícios para apresentação:

- Inês Faria
- João Matos
- Carolina Vale
- Rita Lopes
- Nuno Seabra

Também existem exemplos de:

- convites e apadrinhamento;
- eventos com participantes;
- salas temporárias;
- check-ins pós-evento;
- documentos e decisões citáveis;
- pedidos de apresentação quente;
- interesses mútuos;
- constelações de relação;
- mensagens de chat com citações.

Estes dados são marcados com IDs/códigos `demo_`, `DEMO-`, `DOC-DEMO-` ou `DEC-DEMO-`.

Para remover a demonstração mais tarde, usar o script:

```bash
supabase/demo_cleanup.sql
```

Esse script deve ser executado manualmente no SQL Editor do Supabase ou via `psql`.

## Como correr localmente

```bash
npm install
npm run dev
```

Sem Supabase configurado, a app usa dados locais no browser. Com Supabase configurado, usa autenticação e dados partilhados.

Variáveis necessárias em `.env.local` e na Vercel:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Variáveis opcionais para relay de vídeo, apenas quando se quiser permitir TURN:

```bash
VITE_TURN_URLS=turn:turn.example.com:3478
VITE_TURN_USERNAME=username
VITE_TURN_CREDENTIAL=password
```

## Deploy e base de dados

Ligar Supabase ao projecto:

```bash
npm run supabase:link -- --project-ref YOUR_PROJECT_REF
```

Aplicar migrations:

```bash
npm run supabase:push
```

Deploy em produção:

```bash
npx vercel --prod --yes
```

## Tabelas principais

- `profiles`
- `invite_codes`
- `groups`
- `group_members`
- `events`
- `event_attendees`
- `event_rooms`
- `event_checkins`
- `docs`
- `decisions`
- `messages`
- `device_keys`
- `p2p_signals`
- `member_intentions`
- `warm_introductions`
- `mutual_interests`
- `relationship_links`
- `privacy_settings`

## O que ainda falta para parecer produto acabado

### Prioridade alta

- Encriptação ponta-a-ponta para outros tipos de media além de imagem.
- WebRTC directo também para transferência de ficheiros grandes, não só sinalização/mensagem directa.
- Recuperação/rotação de chaves por dispositivo sem perder acesso a mensagens antigas.
- Denúncias/pedidos de ajuda com estado, severidade, responsável e notas internas.
- Suspensão temporária de membros e revogação de sessões.
- Audit log para acções de admin: alterações de papel, apagamentos, convites e acessos.
- Notificações por email/push para convites, apresentações, eventos e decisões abertas.
- Estados claros de erro/loading em todas as acções.
- Melhor empty state quando ainda não há dados numa secção.

### Prioridade média

- Calendário exportável (`.ics`) e integração com Google/Apple Calendar.
- Fluxo de onboarding com perguntas de consentimento, expectativas e leitura obrigatória de acordos.
- Pedidos de ajuda/mediação com privacidade forte.
- Pesquisa global por pessoas, docs, decisões, eventos e mensagens.
- Filtros na área Conexões por intenção, disponibilidade, grupo e proximidade social.
- Arquivo de eventos passados com decisões/check-ins associados.

### Extra sauce

- Roteiro de acolhimento para novas pessoas: convite, padrinho/madrinha, docs essenciais, primeiro evento e check-in.
- “Modo apresentação” para mostrar a comunidade sem dados sensíveis.
- Templates de eventos com acordos pré-preenchidos.
- Cartões de consentimento mais visuais e fáceis de comparar.
- Regras de contexto para media íntima: quem pode abrir, até quando, em que sala e com que acordo.
- Decisões que podem nascer directamente de uma conversa do chat.
- Relatórios mensais de saúde da comunidade: crescimento, conflitos, pedidos pendentes, eventos e decisões paradas.
- Revisão periódica automática de subgrupos secretos e convites antigos.

## Nota de produto

O maior valor diferencial não é “mais um chat”. É a combinação de memória, consentimento e confiança social:

- conversas ao vivo;
- decisões que não se perdem;
- entradas com apadrinhamento;
- eventos com aftercare;
- apresentações com contexto;
- media privada com consentimento;
- mapa social sem obrigar toda a gente a expor tudo.
