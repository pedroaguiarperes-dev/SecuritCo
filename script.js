document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // ELEMENTOS
  // =========================
  const feed = document.getElementById("feed");

  // SEARCH (NOTÍCIAS)
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  // QR BOX (SIDEBAR)
  const qrInput = document.getElementById("qrInput");
  const btnQR = document.getElementById("btnQR");
  const qrModal = document.getElementById("qrModal");
  const qrModalContent = document.getElementById("qrModalContent");
  const closeQR = document.getElementById("closeQR");
  const qrDefault = document.querySelector("#qrcode img"); 

  // CAMERA & RESULTADOS
  const openCamera = document.getElementById("openCamera");
  const camera = document.getElementById("camera");
  const result = document.getElementById("result");

  const historyEl = document.getElementById("history");
  const clearHistoryBtn = document.getElementById("clearHistory"); // Adicionado para fazer o 'Clear all' funcionar

  const aboutBtn = document.getElementById("aboutBtn");
  const moonBtn = document.getElementById("moonBtn");

  // =========================
  // RSS NEWS
  // =========================
  const RSS = [
    "https://g1.globo.com/rss/g1/tecnologia/",
    "https://g1.globo.com/rss/g1/mundo/",
    "https://g1.globo.com/rss/g1/politica/"
  ];

  // CORRIGIDO: A tag HTML solta que estava travando o código foi removida daqui!

  async function loadNews() {
    let items = [];

    for (let url of RSS) {
      try {
        const res = await fetch(
          "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url)
        );

        const data = await res.json();
        if (data.items) items.push(...data.items);

      } catch (e) {
        console.log("RSS error:", e);
      }
    }

    if (!feed) return; // Evita erro se feed não existir
    feed.innerHTML = "";

    items.slice(0, 3).forEach(item => {
      const card = document.createElement("div");
      card.className = "noticia";

      card.onclick = () => {
        window.open(item.link, "_blank");
      };

      const img = document.createElement("img");
      img.src =
        item.enclosure?.link ||
        item.thumbnail ||
        "https://via.placeholder.com/180x120";

      const box = document.createElement("div");

      const title = document.createElement("h2");
      title.textContent = item.title;

      const desc = document.createElement("p");
      desc.textContent = item.description?.replace(/<[^>]*>/g, "").slice(0, 120);

      box.appendChild(title);
      box.appendChild(desc);

      card.appendChild(img);
      card.appendChild(box);

      feed.appendChild(card);
    });
  }

  loadNews();

  // =========================
  // QR CODE GERAR (MODAL)
  // =========================
  btnQR?.addEventListener("click", async () => {
    if (!qrInput) return;

    const url = qrInput.value.trim();
    if (!url) return;

    // ESCONDE QR PADRÃO
    if (qrDefault) qrDefault.style.display = "none";

    if (qrModal) {
      qrModal.style.display = "flex";
      qrModalContent.innerHTML = "";

      // QR CODE
      const img = document.createElement("img");
      img.src =
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

      img.style.background = "white";
      img.style.padding = "10px";
      img.style.borderRadius = "10px";

      qrModalContent.appendChild(img);

      // ANALISAR URL AUTOMATICAMENTE
      const resultado = await analisar(url);

      // cria texto abaixo do QR
      const resultadoEl = document.createElement("div");
      resultadoEl.style.marginTop = "15px";
      resultadoEl.style.color = "white";
      resultadoEl.style.textAlign = "center";
      resultadoEl.innerHTML = resultado;

      qrModalContent.appendChild(resultadoEl);
    }

    // salva histórico
    addHistory(url);
  });

  // =====================
  // FECHAR MODAL
  // =====================
  closeQR?.addEventListener("click", () => {
    if (qrModal) qrModal.style.display = "none";

    // VOLTA QR PADRÃO COM SEGURANÇA
    if (qrDefault) qrDefault.style.display = "block";
  });

  // =========================
  // CÂMERA + SCANNER
  // =========================
  openCamera?.addEventListener("click", async () => {
    if (!camera) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      camera.style.display = "block";
      camera.srcObject = stream;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      function scan() {
        if (camera.readyState === camera.HAVE_ENOUGH_DATA) {
          canvas.width = camera.videoWidth;
          canvas.height = camera.videoHeight;

          ctx.drawImage(camera, 0, 0);

          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Certifique-se de que a biblioteca jsQR está carregada no seu HTML
          if (typeof jsQR !== "undefined") {
            const code = jsQR(data.data, canvas.width, canvas.height);

            if (code) {
              stream.getTracks().forEach(t => t.stop());

              if (qrInput) qrInput.value = code.data;

              if (result) {
                analisar(code.data).then(resultado => {
                  result.innerHTML = resultado;
                });
              }

              addHistory(code.data);
              return; // Para o loop de scan
            }
          } else {
            console.warn("Biblioteca jsQR não encontrada.");
          }
        }
        requestAnimationFrame(scan);
      }
      scan();

    } catch (err) {
      console.log("Camera error:", err);
      if (result) result.innerHTML = "Erro ao acessar a câmera.";
    }
  });

  // =========================
  // ANALISAR LINK
  // =========================
  async function analisar(url) {
    if (!result) return;
    
    let score = 50;
    let analises = [];

    const confiaveis = [
      "g1.globo.com", "oglobo.globo.com", "uol.com.br", "folha.uol.com.br",
      "estadao.com.br", "cnnbrasil.com.br", "bbc.com", "bbc.co.uk",
      "cnn.com", "reuters.com", "apnews.com", "nytimes.com",
      "theguardian.com", "forbes.com", "bloomberg.com", "theverge.com",
      "wired.com", "techcrunch.com", "canaltech.com.br", "tecmundo.com.br",
      "olhardigital.com.br"
    ];

    const suspeitos = [".xyz", ".top", ".click", ".tk", "bit.ly", "tinyurl"];

    const palavrasSensacionalistas = [
      "urgente", "chocante", "bomba", "segredo", "absurdo",
      "escandalo", "não vai acreditar", "exposto", "fim do mundo", "inacreditavel"
    ];

    result.innerHTML = "🔎 Iniciando análise...";
    await esperar(1000);

    result.innerHTML = "🔎 Verificando reputação do site...";
    await esperar(1000);
    if (confiaveis.some(site => url.includes(site))) {
      score += 35;
      analises.push("Fonte reconhecida");
    }

    result.innerHTML = "🔎 Verificando segurança do link...";
    await esperar(700);
    if (url.startsWith("https://")) {
      score += 10;
      analises.push("Link seguro HTTPS");
    } else {
      score -= 15;
      analises.push("Falta de HTTPS (inseguro)");
    }

    result.innerHTML = "🔎 Procurando sinais suspeitos...";
    await esperar(1000);
    if (suspeitos.some(site => url.includes(site))) {
      score -= 50;
      analises.push("Domínio suspeito ou encurtado");
    }

    result.innerHTML = "🔎 Analisando manchete...";
    await esperar(1000);
    const lower = decodeURIComponent(url).toLowerCase();
    palavrasSensacionalistas.forEach(palavra => {
      if (lower.includes(palavra)) {
        score -= 20;
        analises.push(`Termo sensacionalista ("${palavra}")`);
      }
    });

    result.innerHTML = "🔎 Verificando estrutura jornalística...";
    await esperar(800);
    if (
      url.includes("/noticia") || url.includes("/news") ||
      url.includes("/politica") || url.includes("/tecnologia")
    ) {
      score += 8;
    }

    result.innerHTML = "🔎 Procurando autoria...";
    await esperar(700);
    if (
      url.includes("/autor") || url.includes("/colunista") || url.includes("/reporter")
    ) {
      score += 7;
      analises.push("Autoria detectada");
    }

    score = Math.max(0, Math.min(score, 100));
    await esperar(800);

    // Formata as análises encontradas para mostrar no resultado
    const detalhes = analises.length > 0 ? `<br><small style="color: #aaa; font-size: 0.85em;">Detectado: ${analises.join(", ")}</small>` : "";

    if (score >= 75) {
      return `🟢 <b>PROVAVELMENTE VERDADEIRA</b><br>Score: ${score}/100${detalhes}`;
    }
    if (score >= 45) {
      return `🟡 <b>SUSPEITA</b><br>Score: ${score}/100${detalhes}`;
    }
    return `🔴 <b>POSSIVELMENTE FALSA</b><br>Score: ${score}/100${detalhes}`;
  }

  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =========================
  // HISTÓRICO
  // =========================
  function addHistory(url) {
    let data = JSON.parse(localStorage.getItem("sc_history") || "[]");

    if (data[0] !== url) {
      data.unshift(url);
      if (data.length > 10) data.pop(); 
      localStorage.setItem("sc_history", JSON.stringify(data));
      renderHistory();
    }
  }

  function renderHistory() {
    if (!historyEl) return;
    historyEl.innerHTML = "";

    let data = JSON.parse(localStorage.getItem("sc_history") || "[]");

    data.forEach(url => {
      const li = document.createElement("li");
      li.textContent = "🔗 " + url;
      li.style.cursor = "pointer";

      li.onclick = () => {
        if (qrInput) {
          qrInput.value = url;
          btnQR?.click();
        }
      };

      historyEl.appendChild(li);
    });
  }

  // Ação para o botão "Clear all" limpar o histórico do LocalStorage
  clearHistoryBtn?.addEventListener("click", () => {
    localStorage.removeItem("sc_history");
    renderHistory();
  });

  renderHistory();

  // =========================
  // ABOUT
  // =========================
  const modal = document.createElement("div");
  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.7);
    display:none;
    justify-content:center;
    align-items:center;
    z-index:99999;
  `;

  modal.innerHTML = `
    <div style="background:#111;padding:20px;border-radius:10px;color:white;text-align:center;">
      <h2>SecuritCo</h2>
      <p>Site criado por Pedro Aguiar Peres Kozlowski Breves, Catharina de Souza Guimarães e Miguel Rezende Navarro</p>
    </div>
  `;

  document.body.appendChild(modal);

  aboutBtn?.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  modal.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  // =========================
  // DARK MODE
  // =========================
  let dark = true;

  moonBtn?.addEventListener("click", () => {
    dark = !dark;
    document.body.style.background = dark
      ? "radial-gradient(circle at center, #3d5133, #121410)"
      : "radial-gradient(circle at center, #b8e986, #eaf7d4)";
    document.body.style.color = dark ? "#fff" : "#000";
  });

  // =========================
  // PESQUISA GOOGLE
  // =========================
  searchBtn?.addEventListener("click", () => {
    if (!searchInput) return;
    const query = searchInput.value.trim();
    if (!query) return;

    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, "_blank");
  });

});