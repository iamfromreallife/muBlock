# muBlock

**muBlock** é uma adaptação visual independente de [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home), mantendo o motor de filtragem Manifest V3, as listas, o seletor de elementos, as permissões e a importação/exportação de dados da versão original. Não é uma versão oficial do uBlock Origin.

**Créditos:** o motor e as funcionalidades originais pertencem a Raymond Hill e aos colaboradores do uBlock Origin Lite. O logótipo clássico é baseado no [SVG oficial do uBlock Origin](https://github.com/gorhill/uBlock/blob/master/src/img/ublock.svg), recolorido para o vermelho `#FF0000` pedido para esta adaptação, nos termos da GPL. Autor do fork: **iamfromreallife**.

## Instalação

Obter o ZIP **muBlock-chrome-unpacked** na [última execução do workflow de empacotamento](../../actions/workflows/build-chrome.yml). Extrair o ZIP, abrir `chrome://extensions`, ativar **Modo de programador**, clicar em **Carregar expandida** e selecionar a pasta `chrome-unpacked`.

A distribuição completa também é publicada em `dist/chrome-unpacked/` na branch `main`.

## Aspeto e comportamento

- **Cor:** vermelho puro `#FF0000` para destaques, seleções, ícones ativos e sliders; os textos sobre vermelho têm cor branca. Superfícies neutras e cinzento muito subtil nos editores.
- **Identidade:** logótipo clássico do uBlock Origin (em vez do escudo muBlock com «m»). Ícones PNG gerados em 16, 32, 48, 64, 128, 256 e 512 px; versões desaturadas para a filtragem desligada. O `action.js` original continua a gerir a escolha dos ícones.
- **Popup:** compacto, com botão de ativação ao lado do domínio e modos traduzidos através do sistema de localização original do Lite.
- **Filtros personalizados:** editor de filtros gerados pelo seletor de elementos, com pesquisa em tempo real num **campo de texto multilinha totalmente editável**. Apenas as linhas correspondentes são mostradas na pesquisa, sem apagar as restantes. O realce visual usa texto branco sobre vermelho; o botão Guardar mantém o mecanismo de armazenamento do Lite.
- **Sandbox:** editor CodeMirror separado, mantendo a sintaxe e os comandos originais.
- **Programação:** editor de regras com CodeMirror, barra de ferramentas e apresentação uniformizados com os filtros personalizados.
- **Dropdowns:** menus cinzentos com cantos arredondados e sombra discreta, mantendo os controlos `select` nativos e respetivos eventos no funcionamento interno do Lite.
- **Sliders:** pista e indicador em estilo Material Expressive, sem qualquer movimento animado.
- **Seletor de elementos:** barra minimizada de largura adequada e nome «muBlock» numa única linha, em qualquer idioma.
- **Movimento:** animações e transições, incluindo efeitos de hover animados, desativadas.

## Compatibilidade com dados do Lite

O módulo `js/backup-restore.js` é o original do uBlock Origin Lite. Para transferir todas as definições, filtros e listas, usar a **cópia de segurança/restauro** nas Definições. O editor de filtros por domínio e o editor sandbox utilizam armazenamentos internos separados, como no Lite; editar um não modifica silenciosamente o outro.

## Compilação e publicação

Os ficheiros editáveis estão em `overlay/` e `scripts/`. `scripts/apply_overlay.py` aplica a interface à distribuição Chromium oficial do Lite. `scripts/generate_icons.py` produz PNGs localmente com **CairoSVG** e **Pillow** na máquina de compilação; nenhuma dessas bibliotecas é necessária na extensão instalada.

**O GitHub Actions apenas compila, gera o ZIP, publica o artefacto e atualiza a pasta de distribuição. Não executa testes nem recolhe capturas de ecrã.** O empacotamento só é iniciado com `workflow_dispatch` ou quando é modificado `.github/RELEASE_TRIGGER` na branch `main`, depois de todos os commits pretendidos estarem concluídos. Os commits de desenvolvimento não iniciam ações automaticamente.

## Licença

GPL-3.0-or-later. Consultar `LICENSE`, `THIRD_PARTY_NOTICES.md` e as licenças incluídas na distribuição original. Sem telemetria adicionada, código remoto ou fontes carregadas por serviços externos.

## Ajustes de interface — novembro de 2026

- Removido o módulo experimental de **Aparência** (fontes, tamanhos e escolha manual de tema), regressando à tipografia e ao tema que existiam antes desta funcionalidade. O Lite continua a acompanhar o esquema de cores do sistema.
- Eliminada a linha divisória do cabeçalho em todas as abas: Definições, Listas de filtros, Filtros personalizados, Programação e Acerca.
- Botão de **Definições** no popup ampliado para 48 × 44 px, com fundo vermelho #FF0000 e ícone branco, mantendo os eventos originais do Lite e sem efeitos de hover animados.
- Mantidos o destaque da versão na página Acerca, o alinhamento dos créditos e os cantos arredondados anteriormente solicitados.

Mantém-se a política de compilação final: apenas um GitHub Actions por pedido, depois da integração de todo o código, sem executar testes nem capturar screenshots. O repositório conserva apenas a branch `main` e a branch indicada em `.github/CURRENT_WORK_BRANCH`.

## Ajustes de popup e informação das listas

- O botão de Definições no popup foi reduzido de 48 × 44 para **44 × 40 px**, mantendo o mesmo comando e sem animações.
- O destaque de passagem do rato nos comandos do popup usa exatamente o mesmo fundo `--mu-primary-container` das listas de filtros nas Definições.
- Cada lista de filtros passa a apresentar, em texto pequeno e cinzento, uma descrição do tipo de proteção que oferece e a **versão da compilação Lite instalada** que a inclui. A informação é obtida dos metadados das listas fornecidos pelo próprio Lite; a descrição não altera a seleção ou a aplicação dos filtros.
- **Nota sobre versões:** os metadados do uBlock Origin Lite não fornecem números de versão específicos para cada lista. O número indicado corresponde à versão do pacote Lite em que a lista está incluída. Listas externas importadas são identificadas como não tendo versão própria disponível, em vez de apresentar uma versão inventada.

As traduções das descrições principais acompanham o idioma do popup (português/inglês, com algumas descrições genéricas em espanhol e francês). O funcionamento das listas, o armazenamento e os backups do Lite mantêm-se intactos.
