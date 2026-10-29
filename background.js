// Brandev Inspector - Background Service Worker

const SIDECAR_URL = "http://127.0.0.1:39999/locate";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "antigravity-inspect-selection",
    title: "Abrir no Antigravity IDE",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "antigravity-inspect-selection" && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: "locateSelection",
      selectionText: info.selectionText || ""
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "locateSource") {
    // 1. Prioridade: Servidor Sidecar Dedicado na porta 39999
    fetch(SIDECAR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message.payload)
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        sendResponse(data);
      })
      .catch(sidecarErr => {
        console.warn("[Sidecar] Servidor offline na porta 39999. Tentando rota local da aplicação...", sidecarErr.message);

        // 2. Fallback: rota /dev/locateSource no próprio host da aplicação (se existir)
        const tabUrl = (sender.tab && sender.tab.url) || message.payload.url;
        if (tabUrl) {
          try {
            const origin = new URL(tabUrl).origin;
            fetch(`${origin}/dev/locateSource`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(message.payload)
            })
              .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
              })
              .then(data => sendResponse(data))
              .catch(err2 => {
                sendResponse({
                  success: false,
                  error: "Sidecar offline (inicie start-sidecar.bat) e /dev/locateSource inacessível"
                });
              });
            return;
          } catch (_) {}
        }

        sendResponse({
          success: false,
          error: "Sidecar offline (inicie start-sidecar.bat na porta 39999)"
        });
      });

    return true; // Mantém a conexão aberta para resposta assíncrona
  }

  if (message.action === "openIdeProtocol" && message.url) {
    if (sender.tab && sender.tab.id) {
      chrome.tabs.update(sender.tab.id, { url: message.url });
    }
    sendResponse({ success: true });
    return true;
  }
});
