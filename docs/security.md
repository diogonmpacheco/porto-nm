# Segurança e privacidade

Este documento descreve o modelo actual de segurança do Porto NM. A app deve ser lida como uma comunidade privada com cifragem forte no conteúdo novo, não como uma promessa mágica de anonimato total.

## O que é cifrado

- Mensagens novas de texto e citações são guardadas como envelopes cifrados por dispositivo em `messages.encrypted_payloads`.
- Media íntima nova é cifrada localmente antes do upload; a chave AES da imagem viaja dentro do envelope cifrado por dispositivo.
- O transporte de salas de vídeo WebRTC é cifrado pelo browser em trânsito.

## O que não é cifrado

- Metadados necessários ao funcionamento: quem enviou, quando enviou, sala, membros destinatários, estado de entrega, referências a docs/decisões e existência de anexos.
- Perfis, eventos, grupos, decisões, pedidos de introdução e check-ins dependem de RLS e políticas de acesso, não de E2EE.
- Admins podem moderar e apagar mensagens, eventos e docs. Não devem conseguir ler o corpo cifrado de uma mensagem nova sem uma chave de dispositivo destinatário.

## Chaves de dispositivo

- Cada dispositivo tem uma chave ECDH P-256.
- Em browsers com IndexedDB disponível, a chave privada é guardada como `CryptoKey` não extraível. O JWK privado antigo em `localStorage` é migrado uma vez para IndexedDB e removido.
- Se IndexedDB estiver indisponível, a app pode cair no modo legado para não bloquear acesso, mas esse modo é menos forte.

## Verificação de chaves

- A primeira chave pública vista para cada dispositivo é fixada por trust-on-first-use.
- Se a chave pública de um dispositivo conhecido mudar, a app marca esse dispositivo como alterado e deixa de cifrar novas mensagens para ele até alguém confirmar a confiança novamente.
- As impressões digitais de dispositivos aparecem no perfil e em cartões de membros para comparação fora da app.

## Limites conhecidos

- A verificação actual é TOFU: protege contra mudanças silenciosas depois do primeiro contacto, mas não prova que a primeira chave vista era legítima.
- Não existe forward secrecy. Como a app usa ECDH estático entre dispositivos, comprometer uma chave de dispositivo pode expor mensagens cifradas para esse dispositivo.
- Mitigação planeada: rotação de chaves e, mais tarde, sessões com ratchet ou ECDH efémero por mensagem.

## Regra operacional

Para a comunidade real, usar um projecto Supabase separado do demo público, sem contas partilhadas como `admin`/`PortoNM`, e tratar estes dados como sensíveis ao abrigo do RGPD.
