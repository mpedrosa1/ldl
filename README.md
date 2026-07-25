# Lar, Doce Lar (LDL)

Sistema de gerenciamento residencial próprio, rodando ao lado do Home
Assistant que já existe no seu NAS (OpenMediaVault):

- **Home Assistant** — já roda no NAS (fora deste projeto), é o motor de
  integração com os dispositivos (Tuya/SmartLife, Zigbee, LG ThinQ, Magic
  Home, TP-Link, Intelbras, etc). Este projeto só consome a API dele.
- **myhome-app** (`app/`) — nossa camada própria (LDL): dashboard em Next.js
  que fala com o Home Assistant pela API REST/WebSocket, mais um editor de
  planta baixa e uma integração direta (sem depender do HA) para câmeras Tapo
  via RTSP nativo.

```
myhome/
├── app/       # dashboard Next.js (camada própria)
└── docker/    # docker-compose.yml para subir o myhome-app no NAS
```

## 1. Pré-requisitos

- Home Assistant já rodando em algum lugar acessível pelo NAS (local ou via
  Tailscale, se o NAS e o HA não estiverem na mesma rede).
- Docker no OMV: Sistema > Plugins > `openmediavault-compose` (UI para editar
  e subir `docker-compose.yml`), ou Docker CE manual via SSH:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  ```

## 2. Gerando o token de acesso do Home Assistant

No Home Assistant: clique no seu usuário (canto inferior esquerdo) >
**Segurança** > **Long-Lived Access Tokens** > **Criar Token**. Copie o valor
— ele só é mostrado uma vez.

## 3. Rodando a camada própria (`app/`)

**Desenvolvimento local** (na sua máquina, apontando para o HA):

```bash
cd app
cp .env.example .env.local
# edite .env.local: HA_URL=http://<ip-do-ha>:8123  e  HA_TOKEN=<token do passo 2>
npm install
npm run dev
```

Abra `http://localhost:3000`.

**Deploy no NAS**: copie a pasta `app/` (sem `node_modules`, `.next`,
`.env.local`, `data/`) e `docker/docker-compose.yml` para o NAS (rsync/scp via
SSH), configure `docker/.env` a partir de `docker/.env.example` e suba:

```bash
cd docker
docker compose up -d --build myhome-app
```

Acesse `http://<ip-do-nas>:3001`.

> **UID/GID do volume**: o `docker-compose.yml` fixa `user: "1000:100"` para
> o container conseguir gravar em `./myhome-app/data` (bind mount). Se o
> usuário dono dessa pasta no NAS for outro, rode `id <usuario>` lá e ajuste
> esse valor — caso contrário a API retorna erro 500 ao tentar salvar
> qualquer coisa (planta baixa, câmeras, seleção de entidades).

## 4. Integrações no próprio Home Assistant

No HA (`http://<ip-do-ha>:8123`), em **Configurações > Dispositivos e
Serviços > Adicionar Integração**:

| Fabricante     | Integração recomendada                                              |
| -------------- | --------------------------------------------------------------------- |
| Tuya/SmartLife | `Tuya` (local, via conta Tuya IoT) ou `LocalTuya` (HACS, 100% local) |
| LG             | `LG ThinQ`                                                           |
| Magic Home     | `Magic Home` / `Flux LED`                                            |
| TP-Link Kasa   | `TP-Link Smart Home` (Kasa)                                          |
| Intelbras      | Depende do produto: câmeras via `ONVIF`, alguns sensores via `Tuya`  |
| Zigbee         | Qualquer coordenador compatível com o HA (ZHA ou Zigbee2MQTT)        |

## 5. Câmeras Tapo (integração própria, sem depender do HA)

As integrações de terceiros para Tapo dependem da API cloud da TP-Link, que
muda com frequência e quebra integrações não-oficiais (HACS/cloud não
funcionaram). Por isso o myhome-app fala **direto com o RTSP local** da
câmera, sem passar pelo HA nem por um NVR:

1. No app Tapo: abra a câmera > ⚙️ **Configurações Avançadas** > **Conta da
   Câmera** > crie um usuário/senha dedicados (**não** é a sua conta
   TP-Link/cloud — são dois sistemas de autenticação separados). Reinicie a
   câmera depois de criar/alterar essa conta.
2. Anote o IP fixo da câmera (recomendado reservar IP fixo no roteador).
3. No dashboard, vá em **Configurações > Câmeras Tapo** e cadastre nome, IP,
   usuário e senha dessa Conta da Câmera. O backend faz o proxy do
   snapshot/stream ao vivo via `ffmpeg` (instalado na imagem Docker).

As câmeras Tapo aparecem junto com as câmeras do HA na página **Câmeras**.

## Páginas do dashboard

- **Início** — planta baixa desenhada por você (Configurações), renderizada
  em SVG com os dispositivos vinculados a entidades reais do HA mostrando
  estado ao vivo e clicáveis (toggle, ou abre a página de Câmeras). Também
  tem painel de energia e registro de atividades via
  [Logbook do HA](https://www.home-assistant.io/integrations/logbook/).
- **Dispositivos** — cards agrupados por Área do HA, com filtro por tipo.
  Mostra qualquer entidade não oculta no HA, restrita pela seleção feita em
  Configurações (ver abaixo); entidades `unavailable` aparecem com
  "Indisponível" em destaque.
- **Câmeras** — grid unificado (HA + Tapo) com miniatura (snapshot atualizado
  a cada 2s) e modal com stream MJPEG ao vivo.
- **Mapa** — mapa real (Leaflet + OpenStreetMap) com pins de GPS das pessoas
  (`person.*`) e círculos das zonas (`zone.*`), mais lista com status
  em-casa/fora e bateria (via o `device_tracker` de origem de cada pessoa).
- **Configurações** — editor de planta baixa "estilo CAD" (paredes, portas,
  janelas, móveis, áreas de piso, ícones/dispositivos com resize e rotação,
  zoom/pan por scroll e botão do meio do mouse); seção de câmeras Tapo; e
  seleção de quais entidades do HA aparecem no dashboard (por padrão todas
  aparecem — use essa lista só para esconder o que não interessa).

A planta baixa, a seleção de entidades e as câmeras Tapo são salvas em
arquivos JSON no servidor (`app/data/`), não no navegador — assim funciona
igual em qualquer tela que acesse o dashboard (ex: um tablet fixo na parede).
No NAS esse diretório fica no volume `docker/myhome-app/data`, sobrevivendo a
rebuilds do container.

Para os dispositivos aparecerem agrupados corretamente na página
Dispositivos, atribua cada um a uma **Área** no Home Assistant
(Configurações → Áreas e zonas, ou na página do próprio dispositivo).

## Roadmap

- Motor de automações próprio (regras condição → ação) consumindo os eventos
  do HA em vez de depender só do editor de automações do HA.
- Histórico de energia (gráfico semanal) via API de Statistics do HA.
- Autenticação própria no dashboard (hoje ele confia em quem acessa a rede/
  porta configurada).
- Múltiplos andares/plantas no editor de planta baixa.
