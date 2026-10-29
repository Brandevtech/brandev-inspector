# Chrome Web Store Listing — Brandev Inspector

> Última atualização: 2026-10-29

Este documento contém todas as informações, textos e justificativas necessárias para copiar e colar diretamente no **Chrome Developer Dashboard** ao publicar o **Brandev Inspector**.

---

## 📋 Informações da Ficha da Loja (Store Listing)

**Nome da Extensão** [OBRIGATÓRIO]
```text
Brandev Inspector
```

**Descrição Curta** [OBRIGATÓRIO] (Máximo 132 caracteres)
```text
Inspecione elementos no navegador e abra o arquivo e a linha correspondente diretamente no Antigravity IDE.
```

**Descrição Detalhada** [OBRIGATÓRIO]
```text
Brandev Inspector conecta suas aplicações web locais diretamente ao Antigravity IDE, permitindo inspecionar qualquer elemento visual na página e abrir o código-fonte na linha exata com um único clique.

PRINCIPAIS RECURSOS
• Inspeção com Alt + Clique: Destaque qualquer elemento HTML na página e abra sua view/componente instantaneamente no editor.
• Abertura via Seleção: Selecione qualquer texto na tela, clique com o botão direito e navegue até a linha correspondente.
• Gerenciamento Integrado: Painel popup para monitorar o status da conexão local em tempo real.
• Foco em Desenvolvimento Local: Projetado especificamente para ambientes locais de desenvolvimento (localhost, *.local, 127.0.0.1).

COMO USAR
1. Instale a extensão no Chrome e inicie o assistente local (Sidecar) da sua aplicação.
2. Acesse seu projeto web em execução local (ex: http://localhost:3000 ou http://app.local).
3. Segure a tecla Alt e passe o mouse sobre qualquer elemento que desejar inspecionar.
4. Clique com o botão esquerdo para abrir imediatamente o arquivo e linha no Antigravity IDE.

PRIVACIDADE
Esta extensão foi desenvolvida exclusivamente para produtividade de desenvolvimento local. Nenhum dado pessoal, histórico de navegação ou conteúdo da página é enviado para a nuvem ou para servidores externos. Toda a comunicação ocorre estritamente dentro da sua própria máquina (127.0.0.1).

SUPORTE
Em caso de dúvidas, sugestões ou problemas, visite o repositório do projeto ou entre em contato com o desenvolvedor.
```

**Categoria** [OBRIGATÓRIO]
```text
Developer Tools (Ferramentas do Desenvolvedor)
```

**Propósito Único (Single Purpose)** [OBRIGATÓRIO]
```text
Permitir a navegação direta de elementos de páginas web em desenvolvimento local para o arquivo e linha correspondentes no editor Antigravity IDE.
```

**Idioma Principal** [OBRIGATÓRIO]
```text
Português (Brasil) ou Inglês (conforme a preferência da sua conta de desenvolvedor)
```

---

## 🖼️ Recursos Gráficos Obrigatórios

| Item | Dimensões | Requisitos | Arquivo no Projeto |
| :--- | :--- | :--- | :--- |
| **Ícone da Loja** | 128 × 128 px | PNG 24-bit com fundo opaco/transparente | `icon128.png` |
| **Captura de Tela 1** | 1280 × 800 px ou 640 × 400 px | PNG ou JPEG sem transparência | *Necessário criar (ex: mostrando a página com Alt+Hover e o popup)* |
| **Pequeno bloco promocional (opcional)** | 440 × 280 px | PNG ou JPEG | Opcional |

> [!TIP]
> Você precisa de pelo menos **1 captura de tela** com dimensão exata de `1280x800` ou `640x400` pixels mostrando a extensão em uso.

---

## 🔒 Justificativa de Permissões (Permissions Justification)

No painel de desenvolvedor, o Google exige justificativas claras e funcionais para cada permissão declarada no `manifest.json`:

| Permissão | Tipo | Justificativa para a equipe de revisão |
| :--- | :--- | :--- |
| `contextMenus` | permissions | Utilizada para adicionar a opção "Abrir no Antigravity IDE" ao menu de contexto quando o usuário clica com o botão direito sobre um texto selecionado na página web. |
| `activeTab` | permissions | Necessária para interagir temporariamente com a aba ativa durante as ações de inspeção e clique solicitadas pelo usuário, sem requerer acesso permanente e global a abas. |
| `*://localhost/*`, `*://*.local/*`, `*://127.0.0.1/*` | host_permissions | Necessária para restringir o script de inspeção visual apenas a ambientes de desenvolvimento web local e para efetuar a comunicação HTTP local (127.0.0.1:39999) com o assistente do editor. |

---

## 🛡️ Práticas de Privacidade (Privacy & Data Use)

Preencha o formulário de privacidade do Google Developers com as seguintes respostas:

1. **A extensão coleta dados do usuário?**
   - **Não** (A extensão apenas lê metadados do elemento clicado localmente e os encaminha para a porta local `127.0.0.1`).
2. **Certificações de Uso de Dados** (Marque todas as caixas obrigatórias):
   - [x] Os dados não são vendidos a terceiros.
   - [x] Os dados não são utilizados para finalidades não relacionadas à função central da extensão.
   - [x] Os dados não são utilizados para fins de concessão de crédito ou empréstimo.
3. **URL da Política de Privacidade (Privacy Policy URL)**:
   - Deve ser uma URL pública ativa (ex: GitHub Pages, Notion público, ou um arquivo `privacy-policy.html` / `Gist` público).

---

## 📦 Arquivos do Pacote (.ZIP)

O arquivo `.zip` enviado à Chrome Web Store **NÃO** deve conter os arquivos `.bat`, `.vbs`, `sidecar.js` ou documentação do repositório.

Apenas estes arquivos devem ser incluídos:
- `manifest.json`
- `background.js`
- `content.js`
- `overlay.css`
- `popup.html`
- `popup.js`
- `icon16.png`
- `icon48.png`
- `icon128.png`
