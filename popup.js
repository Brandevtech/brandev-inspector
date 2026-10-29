// Brandev Inspector - Extension Popup Script

const SIDECAR_STATUS_URL = "http://127.0.0.1:39999/status";
const SIDECAR_SHUTDOWN_URL = "http://127.0.0.1:39999/shutdown";
const PROTOCOL_START_URL = "brandev-sidecar://start";

const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const infoList = document.getElementById("infoList");
const projectsCount = document.getElementById("projectsCount");
const actionsOnline = document.getElementById("actionsOnline");
const actionsOffline = document.getElementById("actionsOffline");
const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnDashboard = document.getElementById("btnDashboard");

async function checkStatus() {
  try {
    const res = await fetch(SIDECAR_STATUS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    setOnline(data);
  } catch (_) {
    setOffline();
  }
}

function setOnline(data) {
  statusBadge.className = "status-badge status-online";
  statusText.textContent = "ONLINE";

  infoList.style.display = "flex";
  projectsCount.textContent = (data && data.projectsCount) ? data.projectsCount : "-";

  actionsOnline.style.display = "block";
  actionsOffline.style.display = "none";
  btnStart.disabled = false;
  btnStart.textContent = "▶ Iniciar Sidecar";
}

function setOffline() {
  statusBadge.className = "status-badge status-offline";
  statusText.textContent = "OFFLINE";

  infoList.style.display = "none";
  actionsOnline.style.display = "none";
  actionsOffline.style.display = "block";
}

function startSidecar() {
  btnStart.disabled = true;
  btnStart.textContent = "⏳ Iniciando...";

  // Dispara o protocolo registrado no Windows sem abrir aba
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = PROTOCOL_START_URL;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 1000);

  // Faz polling para atualizar a interface quando o servidor responder
  let attempts = 0;
  const timer = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(SIDECAR_STATUS_URL, { cache: "no-store" });
      if (res.ok) {
        clearInterval(timer);
        const data = await res.json();
        setOnline(data);
      }
    } catch (_) {}

    if (attempts >= 10) {
      clearInterval(timer);
      btnStart.disabled = false;
      btnStart.textContent = "▶ Iniciar Sidecar";
      checkStatus();
    }
  }, 500);
}

async function stopSidecar() {
  btnStop.disabled = true;
  btnStop.textContent = "Parando...";
  try {
    await fetch(SIDECAR_SHUTDOWN_URL, { method: "POST" });
  } catch (_) {}

  setTimeout(() => {
    btnStop.disabled = false;
    btnStop.textContent = "⏹ Parar Sidecar";
    setOffline();
  }, 500);
}

btnStart.addEventListener("click", startSidecar);
btnStop.addEventListener("click", stopSidecar);
btnDashboard.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://127.0.0.1:39999" });
});

// Verifica status inicial
checkStatus();
