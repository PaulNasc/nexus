# Guia de Implementação: Usuário Admin e Build Portátil

Este guia resume os passos para configurar uma conta de teste local/admin (`padrao@hybex.com` / `admin@`) vinculada à organização "Hybex" e gerar um executável portátil do Nexus para rodar em qualquer máquina sem instalador.

---

## Mapeamento Técnico e Desafios

### 1. Validação de E-mail no Supabase
O Supabase em produção exige confirmação de e-mail e credenciais válidas.
- **Solução no Frontend:** No `AuthContext.tsx`, quando a credencial informada for `padrao@hybex.com` / `admin@`, o sistema trata como conta de teste homologada vinculada à organização "Hybex".
- **Bypass em Desenvolvimento:** Mantemos o fluxo de login fluido para testes locais sem depender da verificação de e-mail do provedor.

### 2. Geração do Executável Portátil
- **Via electron-builder:** `npm run package:win:portable` gera um arquivo único executável (`Nexus-Portable-1.3.4.exe`) na pasta `release/`.
- **Via script manual:** `node scripts/build-portable.js` gera a pasta descompactada (`win-unpacked`), ótima para testes rápidos em pendrive ou máquinas sem permissão de administrador.

---

## Alterações de Código Necessárias

### Camada de Autenticação (`src/renderer/contexts/AuthContext.tsx`)
Interceptar as credenciais `padrao@hybex.com` / `admin@` no método `signIn` para retornar uma sessão associada à organização "Hybex".

### Script de Setup do Banco (`scripts/create-admin.js`)
Cadastrar e vincular o perfil admin à organização "Hybex" na tabela `org_members`.

---

## Como Validar Localmente

1. Suba o projeto em modo dev (`npm run dev`).
2. Faça login informando `padrao@hybex.com` / `admin@`.
3. Confirme se a organização ativa carregada é a **Hybex**.
4. Rode `npm run package:win:portable` para gerar o arquivo na pasta `release/`.
