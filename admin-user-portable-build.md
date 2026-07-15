# Plano de Implementação: Usuário Padrão Admin e Build Portátil

Este plano descreve as etapas necessárias para criar um usuário padrão (`admin@admin` / `admin@admin`) vinculado à organização "Hybex" e gerar um executável portátil do Nexus para testes em outras máquinas.

---

## 🔍 Contexto Técnico e Desafios

1. **Validação de E-mail do Supabase:**
   O banco de dados de produção do Supabase está com a **Confirmação de E-mail ativa** e rejeita o cadastro de e-mails em formatos não padronizados (como `admin@admin` sem TLD).
   *   **Solução Proposta:** Criar um atalho/override de desenvolvimento no frontend (`AuthContext.tsx`). Ao digitar `admin@admin` com a senha `admin@admin`:
       *   Se o banco estiver em modo Cloud, o frontend intercepta e mapeia para uma conta mock confirmada ou realiza um login automático bypass.
       *   Para permitir testes reais no banco de dados na nuvem da organização "Hybex", o script cadastrará o e-mail real `admin@admin.com` no Supabase. O frontend mapeará automaticamente as credenciais `admin@admin` para `admin@admin.com` em tempo de execução, bypassando a validação visual.
       *   Como a confirmação de e-mail é obrigatória no Supabase, precisaremos de um **bypass de e-mail** (por exemplo, interceptando o fluxo de login ou utilizando uma conta mock preexistente se o usuário não puder confirmar o e-mail `admin@admin.com` no painel).

2. **Empacotamento Portátil:**
   *   O comando `npm run package:win:portable` executa o `electron-builder` para criar um único executável portátil (`.exe`).
   *   Também temos disponível o script `scripts/build-portable.js` que gera uma distribuição descompactada funcional (`win-unpacked`), excelente para computadores com Node.js ou testes rápidos sem privilégios de administrador.

---

## ❓ Perguntas Abertas (Portão Socrático)

> [!IMPORTANT]
> Por favor, responda a estas perguntas para podermos prosseguir de forma exata:

1. **Como prefere tratar a confirmação de e-mail do Supabase?**
   *   **Opção A (Recomendada - Mock de Desenvolvimento):** Modificar o `AuthContext.tsx` do frontend para que, se as credenciais digitadas forem `admin@admin` / `admin@admin`, o sistema faça um login fake/mockado diretamente com um perfil admin local ou simule uma sessão e associe os dados localmente à organização "Hybex".
   *   **Opção B (E-mail Real com Mapeamento):** Mapear `admin@admin` para `admin@admin.com` no frontend, mas você precisará ir no Dashboard do Supabase e marcar o e-mail `admin@admin.com` como **confirmado** manualmente após o cadastro inicial do script.
   *   **Opção C:** Você tem a chave de acesso do provedor de e-mail ou prefere que a gente desabilite o fluxo de nuvem e use apenas o modo offline/local para este login?

2. **Qual tipo de executável você precisa para testar na outra máquina?**
   *   **Opção A (Recomendada):** Um único arquivo executável portátil (`Nexus-Portable-1.3.3.exe`) gerado via `electron-builder`.
   *   **Opção B:** Uma pasta compactada com todos os arquivos (`win-unpacked`), iniciada por um clique duplo, sem necessidade de instalação.

---

## 🛠️ Alterações Propostas

### Camada de Autenticação

#### [MODIFY] [AuthContext.tsx](file:///c:/Users/paulo.ricardo/Documents/nexus/src/renderer/contexts/AuthContext.tsx)
- Se a opção A for selecionada: Adicionar lógica no método `signIn` para detectar `admin@admin` e retornar uma sessão simulada para a organização "Hybex".
- Se a opção B for selecionada: Normalizar e mapear `admin@admin` para `admin@admin.com` no login e cadastro.

### Scripts de Banco de Dados

#### [NEW] [create-admin.js](file:///c:/Users/paulo.ricardo/Documents/nexus/scripts/create-admin.js)
- Cadastrar e associar o usuário à organização "Hybex" no banco de dados.

### Geração de Build

- Executar os scripts de build portátil locais no Windows.

---

## 🧪 Plano de Verificação

### Testes Manuais
1. Iniciar o Nexus localmente.
2. Digitar `admin@admin` / `admin@admin` na tela de login.
3. Verificar se o login é bem-sucedido e se a organização ativa inicial é a "Hybex".
4. Executar o comando de build portátil e verificar a criação do executável em `release/`.
