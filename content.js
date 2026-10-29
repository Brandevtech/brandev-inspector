// Brandev Inspector - Content Script
(function () {
  let isAltDown = false;
  let hoveredElement = null;
  let overlayEl = null;
  let badgeEl = null;
  let toastEl = null;
  let toastTimeout = null;

  function initUI() {
    if (document.getElementById("ag-inspector-overlay")) return;

    overlayEl = document.createElement("div");
    overlayEl.id = "ag-inspector-overlay";

    badgeEl = document.createElement("div");
    badgeEl.id = "ag-inspector-badge";

    toastEl = document.createElement("div");
    toastEl.id = "ag-inspector-toast";

    document.body.appendChild(overlayEl);
    document.body.appendChild(badgeEl);
    document.body.appendChild(toastEl);
  }

  function getActiveView() {
    // 1. Meta tag inserida pelo ViewController (se houver)
    const meta = document.querySelector('meta[name="antigravity-active-view"]');
    if (meta && meta.content) return meta.content;

    // 2. data-source-file no elemento template (se houver)
    const templateEl = document.getElementById("template");
    if (templateEl && templateEl.getAttribute("data-source-file")) {
      return templateEl.getAttribute("data-source-file");
    }

    // 3. Fallback baseado na rota da URL
    const seg = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
    return seg ? `${seg}.php` : "";
  }

  function getElementView(el) {
    if (!el) return getActiveView();
    const sourceEl = el.closest("[data-source-file]");
    if (sourceEl) {
      return sourceEl.getAttribute("data-source-file");
    }
    return getActiveView();
  }

  function showOverlay(el) {
    if (!overlayEl || !badgeEl) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    overlayEl.style.display = "block";
    overlayEl.style.top = `${rect.top}px`;
    overlayEl.style.left = `${rect.left}px`;
    overlayEl.style.width = `${rect.width}px`;
    overlayEl.style.height = `${rect.height}px`;

    const viewFile = getElementView(el);
    const fileName = viewFile ? (viewFile.split("/").pop() || viewFile) : "";
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";

    badgeEl.style.display = "block";
    badgeEl.textContent = fileName ? `📄 ${fileName} <${tag}${id}>` : `<${tag}${id}>`;

    let badgeTop = rect.top - 6;
    if (badgeTop < 25) {
      badgeTop = rect.bottom + 25;
      badgeEl.style.transform = "none";
    } else {
      badgeEl.style.transform = "translateY(-100%)";
    }

    badgeEl.style.top = `${Math.max(4, badgeTop)}px`;
    badgeEl.style.left = `${Math.max(8, rect.left)}px`;
  }

  function hideOverlay() {
    if (overlayEl) overlayEl.style.display = "none";
    if (badgeEl) badgeEl.style.display = "none";
    hoveredElement = null;
  }

  function showToast(message, isError = false) {
    if (!toastEl) return;
    clearTimeout(toastTimeout);
    toastEl.innerHTML = `<span class="icon">${isError ? "⚠️" : "⚡"}</span><span>${message}</span>`;
    toastEl.style.borderColor = isError ? "#f87171" : "#38bdf8";
    toastEl.classList.add("show");

    toastTimeout = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 3200);
  }

  function locateAndOpen(targetFile, query, extra = {}) {
    showToast("Localizando código via Sidecar...");

    try {
      chrome.runtime.sendMessage({
        action: "locateSource",
        payload: {
          file: targetFile || "",
          query: query || "",
          id: extra.id || "",
          tag: extra.tag || "",
          classes: extra.classes || "",
          pathname: window.location.pathname,
          url: window.location.href
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("[Antigravity Inspector]", chrome.runtime.lastError);
          showToast("Erro na extensão: " + chrome.runtime.lastError.message, true);
          return;
        }

        if (response && response.success && response.file) {
          const line = response.line || 1;
          const shortName = response.file.split(/[/\\]/).pop();
          showToast(`⚡ Aberto no Antigravity: ${shortName}:${line}`);
        } else {
          showToast((response && response.error) || "Código não localizado", true);
        }
      });
    } catch (err) {
      console.error("[Antigravity Inspector]", err);
      showToast("Falha ao comunicar com a extensão", true);
    }
  }

  // Monitoramento de teclado
  window.addEventListener("keydown", (e) => {
    if (e.key === "Alt") {
      isAltDown = true;
      initUI();
      if (hoveredElement) {
        showOverlay(hoveredElement);
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "Alt") {
      isAltDown = false;
      hideOverlay();
    }
  });

  window.addEventListener("blur", () => {
    isAltDown = false;
    hideOverlay();
  });

  // Movimento do mouse
  document.addEventListener("mousemove", (e) => {
    if (!isAltDown) return;
    const target = e.target;
    if (!target || target === overlayEl || target === badgeEl || target === toastEl) return;

    hoveredElement = target;
    showOverlay(target);
  }, { passive: true });

  // Clique de inspeção com Alt
  document.addEventListener("click", (e) => {
    if (!isAltDown) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    hideOverlay();
    isAltDown = false;

    if (!target) return;

    const file = getElementView(target);
    const query = (target.innerText || target.textContent || "").trim().slice(0, 80);

    locateAndOpen(file, query, {
      id: target.id || "",
      tag: target.tagName.toLowerCase(),
      classes: typeof target.className === "string" ? target.className : ""
    });
  }, true);

  // Mensagens do Menu de Contexto (botão direito)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "locateSelection") {
      initUI();
      const selection = (message.selectionText || window.getSelection()?.toString() || "").trim();
      const file = getActiveView();
      locateAndOpen(file, selection);
    }
  });

  // Inicializa UI após carregamento do DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }
})();
