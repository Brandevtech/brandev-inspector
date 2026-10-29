// Brandev Inspector - Dedicated Local Sidecar Server
// Port: 39999 (default) | Base: S:\DEVELOPER

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = parseInt(process.env.PORT, 10) || 39999;
const PROJECTS_BASE = process.env.PROJECTS_DIR || (fs.existsSync("S:\\DEVELOPER") ? "S:\\DEVELOPER" : path.resolve(".."));

// File extensions to search
const SEARCH_EXTENSIONS = new Set([
  // Web & Frameworks
  ".html", ".htm", ".vue", ".svelte", ".astro",
  // JavaScript & TypeScript (React, Next, etc.)
  ".js", ".jsx", ".ts", ".tsx",
  // PHP & Templates
  ".php", ".phtml", ".blade.php", ".twig", ".tpl",
  // Java & JVM Templates
  ".jsp", ".jspx", ".ftl", ".vm", ".java",
  // .NET & C#
  ".cshtml", ".razor",
  // Python / Ruby Templates
  ".jinja", ".jinja2", ".erb"
]);

// Directories to ignore during scanning
const IGNORE_DIRS = new Set([
  "node_modules", "vendor", ".git", ".svn", ".idea", ".vscode",
  "storage", "cache", "dist", "build", "tmp", "temp", "logs"
]);

// In-memory log of recent inspections
const inspectionHistory = [];
const MAX_HISTORY = 25;

function logInspection(entry) {
  inspectionHistory.unshift({
    timestamp: new Date().toLocaleTimeString(),
    ...entry
  });
  if (inspectionHistory.length > MAX_HISTORY) {
    inspectionHistory.pop();
  }
}

/**
 * List all project folders in the base directory
 */
function getProjects() {
  try {
    if (!fs.existsSync(PROJECTS_BASE)) return [];
    return fs.readdirSync(PROJECTS_BASE, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith("."))
      .map(dirent => dirent.name);
  } catch (err) {
    console.error("[Sidecar] Erro ao listar projetos:", err.message);
    return [];
  }
}

/**
 * Determine which project directory corresponds to the request
 */
function resolveProject(urlStr, pathname, projects) {
  const normProjects = projects.map(p => ({
    original: p,
    lower: p.toLowerCase(),
    clean: p.toLowerCase().replace(/[^a-z0-9]/g, "")
  }));

  if (urlStr) {
    try {
      const parsedUrl = new URL(urlStr);
      const host = parsedUrl.hostname.toLowerCase();
      // e.g. chuachua.local -> chuachua
      const hostPrefix = host.split(".")[0];
      const hostClean = hostPrefix.replace(/[^a-z0-9]/g, "");

      const matchedByHost = normProjects.find(p => p.lower === hostPrefix || p.clean === hostClean);
      if (matchedByHost) {
        return matchedByHost.original;
      }
    } catch (_) {}
  }

  if (pathname) {
    const cleanPath = pathname.replace(/^\/+|\/+$/g, "");
    const firstSegment = cleanPath.split("/")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (firstSegment) {
      const matchedByPath = normProjects.find(p => p.lower === firstSegment || p.clean === firstSegment);
      if (matchedByPath) {
        return matchedByPath.original;
      }
    }
  }

  return null;
}

/**
 * Recursively find candidate files in a directory
 */
function collectFiles(dirPath, maxFiles = 800) {
  const results = [];

  function traverse(currentDir, depth = 0) {
    if (results.length >= maxFiles || depth > 8) return;

    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (_) {
      return;
    }

    // Prefer view/template directories first
    entries.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aScore = (aName.includes("view") || aName.includes("template")) ? 1 : 0;
      const bScore = (bName.includes("view") || bName.includes("template")) ? 1 : 0;
      return bScore - aScore;
    });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name.toLowerCase())) {
          traverse(fullPath, depth + 1);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SEARCH_EXTENSIONS.has(ext)) {
          results.push(fullPath);
          if (results.length >= maxFiles) return;
        }
      }
    }
  }

  traverse(dirPath);
  return results;
}

/**
 * Search for element ID, query text, or file hint inside project files
 */
function searchInFiles(files, options) {
  const { query, id, tag, classes, fileHint } = options;

  let bestMatch = null;
  let highestScore = 0;

  const cleanQuery = (query || "").trim();
  const cleanId = (id || "").trim();
  const hintBaseName = fileHint ? path.basename(fileHint).toLowerCase() : "";

  for (const filePath of files) {
    const fileName = path.basename(filePath).toLowerCase();
    const isHintedFile = hintBaseName && (fileName === hintBaseName || fileName.startsWith(hintBaseName));

    let content;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (_) {
      continue;
    }

    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let score = 0;

      // 1. Match by Element ID (High confidence)
      if (cleanId) {
        const idRegex = new RegExp(`id\\s*=\\s*["']${cleanId}["']`, "i");
        if (idRegex.test(line)) {
          score += 80;
        }
      }

      // 2. Match by exact Query text
      if (cleanQuery.length >= 2) {
        if (line.includes(cleanQuery)) {
          score += 50;
        } else if (line.toLowerCase().includes(cleanQuery.toLowerCase())) {
          score += 35;
        }
      }

      // 3. Match tag with class
      if (tag && line.toLowerCase().includes(`<${tag.toLowerCase()}`)) {
        score += 10;
        if (classes) {
          const classList = classes.split(/\s+/).filter(c => c.length > 2);
          for (const c of classList) {
            if (line.includes(c)) score += 10;
          }
        }
      }

      // Bonus if it's the hinted file
      if (isHintedFile && score > 0) {
        score += 30;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          file: filePath,
          line: i + 1,
          lineContent: line.trim().slice(0, 100),
          score: score
        };

        // If we found a very high confidence match, stop early
        if (score >= 90) {
          return bestMatch;
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Open file in Antigravity IDE using official CLI with -r (reuse window) and -g (goto line)
 */
function openInAntigravity(filePath, line = 1) {
  const normPath = path.resolve(filePath);

  // Candidate executables for Antigravity IDE
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Antigravity IDE", "bin", "antigravity-ide.cmd"),
    "C:\\Users\\brand\\AppData\\Local\\Programs\\Antigravity IDE\\bin\\antigravity-ide.cmd",
    path.join(process.env.LOCALAPPDATA || "", "Programs", "antigravity", "Antigravity.exe"),
    "C:\\Users\\brand\\AppData\\Local\\Programs\\antigravity\\Antigravity.exe"
  ];

  const foundCli = candidates.find(c => fs.existsSync(c));

  if (foundCli) {
    const cmd = `"${foundCli}" -r -g "${normPath}:${line}"`;
    exec(cmd, (err) => {
      if (err) {
        console.warn(`[Sidecar] Erro ao abrir via CLI: ${err.message}`);
      } else {
        console.log(`[Sidecar] 🚀 Aberto no Antigravity IDE: ${normPath}:${line}`);
      }
    });
    return `antigravity://${normPath}:${line}`;
  }

  // Fallback protocolo do Windows
  const ideUrl = `antigravity://file/${normPath.replace(/\\/g, "/")}:${line}:1`;
  exec(`start "" "${ideUrl}"`, (err) => {
    if (err) {
      console.warn(`[Sidecar] Protocol start error: ${err.message}`);
    }
  });

  return ideUrl;
}

// HTTP Server
const server = http.createServer((req, res) => {
  // CORS & Private Network Access Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

  // Route: GET /status or /health
  if (req.method === "GET" && (parsedUrl.pathname === "/status" || parsedUrl.pathname === "/health")) {
    const projects = getProjects();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      status: "online",
      port: PORT,
      baseDir: PROJECTS_BASE,
      projectsCount: projects.length,
      projects: projects,
      historyCount: inspectionHistory.length
    }, null, 2));
    return;
  }

  // Route: POST /shutdown
  if (req.method === "POST" && parsedUrl.pathname === "/shutdown") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, message: "Sidecar encerrado com sucesso." }));
    console.log("[Sidecar] Encerrando por solicitacao da extensao...");
    setTimeout(() => {
      process.exit(0);
    }, 400);
    return;
  }

  // Route: POST /locate
  if (req.method === "POST" && parsedUrl.pathname === "/locate") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { query, id, tag, classes, pathname, url, file: fileHint } = payload;

        const projects = getProjects();
        let targetProject = resolveProject(url, pathname, projects);

        // Fallback: If not detected from host/pathname, check if a file hint leads to a project
        if (!targetProject && projects.length > 0) {
          // If only 1 project or default to CHUACHUA if present
          if (projects.includes("CHUACHUA")) {
            targetProject = "CHUACHUA";
          } else {
            targetProject = projects[0];
          }
        }

        if (!targetProject) {
          const errMsg = `Nenhum projeto encontrado em ${PROJECTS_BASE}`;
          logInspection({ success: false, error: errMsg, query, id });
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, error: errMsg }));
          return;
        }

        const projectDir = path.join(PROJECTS_BASE, targetProject);
        const candidateFiles = collectFiles(projectDir);

        const match = searchInFiles(candidateFiles, {
          query,
          id,
          tag,
          classes,
          fileHint
        });

        if (match) {
          const ideUrl = openInAntigravity(match.file, match.line);

          logInspection({
            success: true,
            project: targetProject,
            file: match.file,
            line: match.line,
            query: query || id || tag,
            snippet: match.lineContent
          });

          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            success: true,
            project: targetProject,
            file: match.file.replace(/\\/g, "/"),
            line: match.line,
            snippet: match.lineContent,
            ideUrl: ideUrl
          }));
        } else {
          const errMsg = `Elemento não localizado no projeto ${targetProject}`;
          logInspection({
            success: false,
            project: targetProject,
            query: query || id || tag,
            error: errMsg
          });

          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            success: false,
            project: targetProject,
            error: errMsg
          }));
        }
      } catch (err) {
        console.error("[Sidecar] Erro no processamento de /locate:", err);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Route: GET / (Dashboard Web UI)
  if (req.method === "GET" && parsedUrl.pathname === "/") {
    const projects = getProjects();
    const historyRows = inspectionHistory.map(h => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #334155; font-size: 12px; color: #94a3b8;">${h.timestamp}</td>
        <td style="padding: 8px; border-bottom: 1px solid #334155;"><span style="background: ${h.success ? '#065f46' : '#7f1d1d'}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${h.success ? 'LOCALIZADO' : 'NÃO ENCONTRADO'}</span></td>
        <td style="padding: 8px; border-bottom: 1px solid #334155; font-weight: bold; color: #38bdf8;">${h.project || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #334155; color: #f8fafc; font-family: monospace; font-size: 12px;">${h.query || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #334155; color: #cbd5e1; font-family: monospace; font-size: 12px;">${h.file ? h.file.split(/[/\\]/).pop() + ':' + h.line : (h.error || '-')}</td>
      </tr>
    `).join("");

    const projectBadges = projects.map(p => `
      <span style="display: inline-block; background: #1e293b; color: #e2e8f0; border: 1px solid #3b82f6; border-radius: 6px; padding: 4px 10px; margin: 3px; font-size: 13px;">📁 ${p}</span>
    `).join("");

    const html = `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Brandev Inspector - Sidecar Server</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 30px; }
        .container { max-width: 900px; margin: 0 auto; }
        .card { background: #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }
        h1 { margin: 0 0 10px 0; color: #38bdf8; font-size: 24px; display: flex; align-items: center; gap: 10px; }
        .badge-status { background: #059669; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
        th { padding: 8px; border-bottom: 2px solid #475569; color: #94a3b8; font-size: 12px; text-transform: uppercase; }
        code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h1>⚡ Brandev Inspector Sidecar</h1>
          <span class="badge-status">● ONLINE (Porta ${PORT})</span>
        </div>

        <div class="card">
          <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #cbd5e1;">⚙️ Configuração</h2>
          <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;"><strong>Diretório Base de Projetos:</strong> <code>${PROJECTS_BASE}</code></p>
          <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;"><strong>Endpoint de Localização:</strong> <code>POST http://127.0.0.1:${PORT}/locate</code></p>
          <div style="margin-top: 14px;">
            <strong style="font-size: 13px; color: #94a3b8;">Projetos Detectados (${projects.length}):</strong>
            <div style="margin-top: 8px;">${projectBadges || '<span style="color:#ef4444;">Nenhum projeto encontrado</span>'}</div>
          </div>
        </div>

        <div class="card">
          <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #cbd5e1;">📋 Últimas Inspeções</h2>
          ${inspectionHistory.length === 0 
            ? '<p style="color: #64748b; font-size: 14px; margin: 0;">Nenhuma inspeção realizada ainda. Pressione Alt + Clique em uma página para testar.</p>' 
            : `<table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Status</th>
                    <th>Projeto</th>
                    <th>Consulta / Tag</th>
                    <th>Arquivo / Linha</th>
                  </tr>
                </thead>
                <tbody>${historyRows}</tbody>
               </table>`
          }
        </div>
      </div>
    </body>
    </html>`;

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\n=======================================================");
  console.log(`⚡ Brandev Inspector - Sidecar Server ONLINE`);
  console.log(`🌐 Dashboard:    http://127.0.0.1:${PORT}`);
  console.log(`📁 Projetos em:  ${PROJECTS_BASE}`);
  console.log(`📡 Endpoint:     POST http://127.0.0.1:${PORT}/locate`);
  console.log("=======================================================\n");
});
