# Settings Refactor (ajustes localizados) — Krigzis

Este plano refatora o módulo de Configurações para reduzir abas, corrigir regras de salvar/cancelar, padronizar i18n e tornar controles visuais funcionais, mantendo risco baixo de regressão.

## Status atual (feito vs pendente)

### Feito

- Save/Cancel reais via `draftSettings` + preview ao vivo no modal
- Aparência funcional:
  - `fontSizePx` (slider contínuo)
  - `cardOpacity` (aplicado como 0–1)
  - densidade via `data-density`
- Logs:
  - viewer direto na aba (sem modal)
  - filtros mantidos
  - UI pede no máximo 6 logs
  - retenção no main limitada a 6 entradas
- Updates (infra/behaviour):
  - checagens automáticas mais silenciosas
  - notificações do sistema apenas quando a checagem é manual/forçada
  - preload liberado para o renderer assinar eventos de update
 - Updates (UX):
   - indicador/badge na sidebar quando há update e estado de checagem
   - aba Atualizações reage a eventos e exibe estados (verificando / disponível / erro / baixado)
 - Quality gate:
   - `npm run build` OK (warnings apenas de bundle size)

### Pendente

- Remover Crash Reports completamente (UI + integrações/pontos mortos)
- i18n: substituir strings hardcoded remanescentes no Settings por `t()`
- Acessibilidade: revisar “migrações” entre abas e trazer para Acessibilidade o que fizer sentido (sem perder opções)
- Modularização/escala: reduzir código morto e quebrar o Settings em componentes por aba, mantendo compatibilidade

## Objetivos (o que vai mudar)

- Corrigir regra de negócio do modal de configurações:
  - **Não persistir** mudanças enquanto o usuário não clicar em **Salvar**.
  - **Cancelar/Fechar** deve descartar as alterações.
- Reduzir e reorganizar o menu de Configurações para ficar mais enxuto.
- Padronizar i18n: remover strings “hardcoded” em PT-BR nas áreas afetadas e usar `t()`.
- Tornar funcionais (de verdade):
  - tamanho da fonte (slider fluido)
  - densidade (compact/normal/confortável)
  - transparência/opacidade dos cards
- Revisar/ajustar “Produtividade” (remover aba e realocar o que realmente é usado)
- Reorganizar “Acessibilidade” (mover opções coerentes e remover “configurações migradas”)
- Simplificar Logs (sem modal, sem export/clear) e remover Crash Reports (UI + código residual)
- Reformular Atualizações (UX + fluxo) e deixar caminho técnico consistente para auto-update.
- Validar padronização/modularização do sistema (nomes, APIs, pastas) e remover código não utilizado sem regressões.

## Escopo (primeira entrega)

### 1) Settings: arquitetura interna (hook + UI)

**Problema atual:** `useSettings.updateSettings()` faz merge + `localStorage.setItem(...)` imediatamente, então qualquer interação no modal já “salva” de forma irreversível.

**Solução proposta (baixo risco):** implementar um “draft” de configurações no UI do Settings, mantendo o estado persistido separado.

- Introduzir um estado local `draftSettings` (no componente `Settings.tsx` ou num hook dedicado `useDraftSettings`).
- Ao abrir o modal:
  - capturar `persistedSettingsSnapshot`
  - inicializar `draftSettings = persistedSettingsSnapshot`
- Enquanto o usuário muda inputs:
  - atualizar apenas `draftSettings`.
  - aplicar preview ao vivo **sem persistir**, de duas formas:
    - atualizar as CSS vars/atributos no `document.documentElement` (ex.: `data-density`, `--card-opacity`, `font-size`) para refletir o draft.
    - renderizar uma mini-área de preview dentro do próprio modal (ex.: um `Card`/`status-card` de exemplo) para o usuário ver efeito mesmo com o overlay.
- Ao clicar **Salvar**:
  - aplicar `updateSettings(draftSettings)` (persistência)
- Ao clicar **Cancelar/Fechar**:
  - descartar `draftSettings` e reverter preview visual para o snapshot persistido

**Refactor adicional no hook:** reduzir responsabilidades do `useSettings.tsx`.
- Separar em blocos internos (mesmo arquivo inicialmente) ou em módulos:
  - `settingsStorage` (load/save/migrate)
  - `settingsActions` (reset/clear/export/import)
  - `settingsSelectors` (enabled cards/actions)
- Manter API pública estável para não quebrar o app.

### 2) Redução e reorganização de abas (UX)

**Situação atual:** `TabType` tem muitas abas e várias opções não estão funcionais.

**Proposta de menu mais enxuto (primeira versão):**
- Geral
  - nome do usuário
  - idioma
- Aparência
  - tamanho da fonte (slider)
  - densidade
  - transparência/opacidade de cards
  - reduzir animações
- Notificações
- Dados & Backup
  - backup/export/import (somente o que funcionar e fizer sentido)
- Acessibilidade
  - alto contraste, etc.
  - realocar opções coerentes que hoje estão espalhadas
- Logs
  - visualização direta (sem modal)
- Atualizações
  - fluxo novo (ver seção 6)
- Sobre

**Remover aba “Produtividade”** e mover itens úteis:
- `dailyGoal` → Geral
- `aiResponseMode` / `aiProactiveMode` → (decisão) Geral (avançado) ou Atualizações/Outro

### 3) i18n (idiomas inconsistentes)

**Problema atual:** há strings de UI hardcoded em componentes (principalmente Settings e seções relacionadas), que não mudam quando troca idioma.

**Solução:**
- Identificar todas as strings exibidas no Settings e subcomponentes usados dentro dele.
- Substituir por `t('...')` e adicionar chaves em `useI18n.ts` (pt-BR, en-US, es-ES).
- Critério: “tudo que aparece no Settings” deve ser traduzível.

### 4) Tamanho da fonte (slider fluido)

**Problema atual:** `useAppearance` aplica fonte com boolean `largeFontMode` (14/16). Um slider precisa de granularidade.

**Solução:**
- Trocar `largeFontMode: boolean` por `fontScale` ou `fontSizePx` (ex.: 12–18 em passos de 1, ou scale 0.9–1.2).
- `useAppearance` aplica `html.style.fontSize` com valor derivado.
- Atualizar UI do slider para ser contínuo (sem “pontos mortos”).

### 5) Densidade e transparência não aplicam

**Situação atual:** `useAppearance` seta:
- `data-density` no `html`
- `--card-opacity` no `html`

**Problema provável:** CSS não está consumindo `data-density` e `--card-opacity` nos componentes reais.

**Solução:**
- Ajustar CSS base (cards, paddings, gaps) para usar:
  - `[data-density='compact'|'normal'|'comfortable']`
  - `opacity`/`background` baseado em `--card-opacity`
- Validar pelo menos:
  - `.card`, `.status-card`, `.action-card` e containers principais

### 6) Logs sem modal + remoção de Crash Reports

- Remover completamente:
  - UI de Crash Reports no Settings
  - acesso e botões relacionados
  - componentes/estado residual
- Logs:
  - Tornar o “Logs” uma seção/página dentro do Settings (sem modal)
  - Manter filtros (nível/categoria/busca)
  - Remover export/clear
  - Persistência/retenção: limitar buffer de logs em memória/IPC para **no máximo 6 entradas**
    - ao inserir novo log, descartar automaticamente os mais antigos
    - `getLogs` deve retornar no máximo 6 (respeitando filtros), evitando crescimento indefinido

### 7) Atualizações (reformulação)

**Situação atual:**
- UI de updates em Settings e componente `UpdateNotification` tem comportamento “simulado” e APIs que não existem (`system.restart`).

**Solução em 2 fases:**

- **Fase A (UX + consistência sem mudar infra):**
  - Unificar a fonte de verdade do estado de update (IPC `version.*` e `update.*`).
  - Remover simulações e opções que não funcionam.
  - Deixar um fluxo simples e honesto:
    - Verificar agora
    - Mostrar resultado
    - Baixar (se aplicável)
    - Abrir pasta/link (se aplicável)
  - Comportamento padrão: checagem silenciosa + aviso mínimo (não obrigatório)
    - notificação do sistema apenas se habilitada e somente quando houver update
    - a aba “Atualizações” deve sempre exibir um indicador quando houver versão disponível e recomendar atualização

- **Fase B (auto-update real):**
  - Migrar para um mecanismo real de auto-update no Electron (ex.: `electron-updater`).
  - Isso exige mudanças de dependências e arquitetura do update; será tratado como etapa dedicada.

### 8) Acessibilidade (revisão de migrações e integridade)

- **Objetivo:** A aba **Acessibilidade** não pode virar “placeholder”. Ela deve conter as opções de acessibilidade reais e não esconder configurações importantes.
- **Estado atual observado:** existe um card “Configurações Migradas” dizendo que opções foram movidas para **Aparência**, mas hoje há opções relevantes espalhadas (ex.: alto contraste, reduzir animações, fonte grande/tamanho da fonte).
- **Solução (proposta):**
  - Definir um critério claro:
    - **Acessibilidade**: alto contraste, reduzir movimento/animações, preferências de leitura/visibilidade.
    - **Aparência**: densidade/estética (opacidade, densidade, tema) e ajustes visuais gerais.
  - Remover o card “Configurações Migradas” se as opções voltarem a existir de forma completa em Acessibilidade.
  - Garantir que nenhuma opção “some” por causa de reorganização.

**Decisão confirmada:**
- `reduceAnimations` e `fontSizePx` ficam em **Acessibilidade**.
- O card “Configurações Migradas” será removido.

### 9) Padronização, modularização e remoção de código não usado (escala)

- **Objetivo:** melhorar manutenção e consistência do sistema sem mudar comportamento.
- **Ações propostas (baixo risco, incremental):**
  - Quebrar `Settings.tsx` em componentes por aba (ex.: `Settings/AppearanceTab.tsx`, `Settings/AccessibilityTab.tsx`, etc.) mantendo a API pública.
  - Reduzir `any` e tipar melhor os contracts usados pelo renderer (ex.: modelos de update/logs).
  - Remover caminhos mortos/funcionalidades desativadas (ex.: Crash Reports) e referências não usadas.
  - Padronizar nomes:
    - canais de evento IPC
    - métodos expostos no `electronAPI`
    - nomes de arquivos/pastas em `renderer/components` e `renderer/hooks`
  - Manter compatibilidade: mudanças estruturais sem quebrar chamadas existentes.

## Validação / critérios de aceite

- Alterar qualquer setting no modal **não** persiste até clicar em **Salvar**.
- Clicar **Cancelar** mantém tudo como estava (incluindo idioma, densidade, opacidade).
- Idioma muda textos do Settings (inclui labels/descrições).
- Slider de fonte funciona de forma contínua/fluida e tem efeito perceptível.
- Slider/controle de fonte está disponível em **Acessibilidade**.
- Densidade e opacidade têm efeito visível em cards.
- Aba “Produtividade” removida e itens reaproveitados aparecem no lugar correto.
- Crash Reports removido do UI e do código (sem referências mortas).
- Logs aparecem diretamente no menu Logs (sem modal) e sem export/clear.
- Atualizações: UI simplificada e consistente com o que o backend realmente faz.

## Próximos passos recomendados (sequência)

1) **Acessibilidade (recompor e alinhar com Aparência)**
   - Remover o card “Configurações Migradas” (se ficar redundante)
   - Trazer para Acessibilidade as opções que forem de fato de acessibilidade (alto contraste, reduzir animações, etc.)
   - Garantir que Aparência permaneça focada em estética/densidade/tema

2) **Remover Crash Reports**
   - Remover UI, componentes e IPC expostos que não são mais usados
   - Garantir que não existam referências mortas em Settings

3) **i18n do Settings**
   - Varredura do `Settings.tsx` e substituição por `t('...')`
   - Adicionar chaves faltantes em `useI18n.ts`

4) **Modularização/limpeza (escala)**
   - Extrair componentes por aba do Settings mantendo comportamento
   - Remover código morto e padronizar nomes de API/eventos

5) **Quality gate**
   - `npm run lint` (confirmar limpo)
   - `npm run build` (confirmar que segue tudo ok)

## Riscos e mitigação

- Quebra de dependências do app em `settings.*`: manter API pública do `useSettings` por enquanto; mudar internamente primeiro.
- Preview visual vs persistência: se houver preview, garantir rollback completo ao cancelar.
- i18n: garantir que o fallback continue funcionando (mostrar key ou pt-BR).

## Decisões (fechadas)

1) Preview ao vivo (sem persistência) com preview interno no modal + aplicação temporária no `document.documentElement`.
2) Logs: manter filtros e limitar retenção para 6 entradas, descartando automaticamente as mais antigas.
3) Atualizações: checagem silenciosa + aviso mínimo (não obrigatório), com indicação/recomendação na aba “Atualizações”.
