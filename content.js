// ---------------------------------------------------------
// PRICEFORGE — ONLY RUN ON STEAM GAME PAGES
// ---------------------------------------------------------

const gamePageMatch = window.location.pathname.match(
  /^\/app\/(\d+)/
);

if (!gamePageMatch) {
  console.log("PriceForge: Not a Steam game page.");
} else {

  const appId = gamePageMatch[1];

  // ---------------------------------------------------------
  // EXISTING PRICEFORGE CODE
  // ---------------------------------------------------------

if (!document.getElementById("priceforge-root")) {

  const purchaseArea = document.querySelector("#game_area_purchase");
  const readText = (selector, fallback = null) => {
    const element = purchaseArea?.querySelector(selector);
    return element ? element.textContent.trim() : fallback;
  };

  const currentPrice = readText(".discount_final_price, .game_purchase_price", "Price unavailable");
  const discount = readText(".discount_pct");

  const priceforge = document.createElement("aside");
  priceforge.id = "priceforge-root";
  priceforge.setAttribute("aria-label", "PriceForge price summary");
  const shadowRoot = priceforge.attachShadow({ mode: "open" });

  shadowRoot.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: min(320px, calc(100vw - 32px));
        box-sizing: border-box;
        overflow: hidden;
        color: #d6d7d8;
        background: #15191f;
        border: 1px solid #303944;
        border-radius: 12px;
        box-shadow: 0 20px 54px rgba(0, 0, 0, .48), 0 0 28px rgba(102, 192, 244, .1);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        letter-spacing: 0;
        z-index: 999999;
        animation: rise .4s cubic-bezier(.2, .8, .2, 1) both;
      }
      .topbar { display: flex; align-items: center; justify-content: flex-end; padding: 10px 12px; border-bottom: 1px solid #303944; }
      .brand { display: none; }
      .mark { display: none; }
      .header-actions { display: flex; align-items: center; gap: 3px; }
      .header-button { display: grid; place-items: center; width: 25px; height: 25px; border: 1px solid transparent; border-radius: 6px; color: #7c9a9e; background: transparent; cursor: pointer; font-size: 15px; line-height: 1; }
      .header-button:hover { color: #d6d7d8; background: rgba(102, 192, 244, .1); border-color: #3c5263; }
      .close { font-size: 18px; }
      .collapsed-verdict-icon { display: none; place-items: center; width: 23px; height: 23px; margin-left: auto; margin-right: 7px; color: #102020; background: #66c0f4; border-radius: 7px; box-shadow: 0 0 13px rgba(102, 192, 244, .25); font-size: 12px; font-weight: 700; }
      .content { padding: 19px 20px 20px; }
      .decision { display: grid; grid-template-columns: 9px 1fr; gap: 13px; align-items: center; margin-bottom: 20px; }
      .decision-marker { width: 9px; height: 48px; border-radius: 3px; background: #66c0f4; box-shadow: 0 0 16px rgba(102, 192, 244, .3); }
      .decision-label { margin-bottom: 3px; color: #8f98a0; font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
      .decision-name { color: #f5f5f5; font-size: 27px; font-weight: 800; letter-spacing: .02em; line-height: 1; }
      .confidence { margin-top: 6px; color: #9bb4c5; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .analysis { padding-top: 17px; border-top: 1px solid #303944; }
      .section-label { margin-bottom: 15px; color: #8f98a0; font-size: 10px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
      .price-chart { display: grid; gap: 13px; }
      .chart-row { display: grid; grid-template-columns: 74px minmax(0, 1fr) 68px; gap: 8px; align-items: center; min-height: 18px; color: #d6d7d8; font-size: 11px; }
      .chart-price { font-variant-numeric: tabular-nums; }
      .chart-track { position: relative; width: 100%; height: 5px; overflow: visible; background: #303944; border-radius: 3px; }
      .chart-fill { display: block; height: 100%; min-width: 5px; background: #506575; border-radius: 3px; }
      .chart-row.current .chart-fill { background: #66c0f4; }
      .chart-marker { position: absolute; top: 50%; left: var(--marker-position, 100%); width: 12px; height: 12px; border: 2px solid #15191f; border-radius: 50%; background: #66c0f4; box-shadow: 0 0 0 1px #66c0f4, 0 0 12px rgba(102, 192, 244, .42); transform: translate(-50%, -50%); }
      .chart-note { color: #8f98a0; font-size: 10px; white-space: nowrap; }
      .verdict { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 10px; align-items: start; margin-top: 20px; padding-top: 17px; border-top: 1px solid #303944; }
      .verdict-speaker { display: block; width: 56px; height: 56px; overflow: hidden; }
      .verdict-speaker img { display: block; width: 100%; height: 100%; object-fit: contain; }
      .speech { position: relative; padding: 10px 11px; color: #d6d7d8; background: #1c252e; border: 1px solid #3a4a58; border-radius: 4px 10px 10px 10px; font-size: 11px; line-height: 1.55; }
      .speech::before { position: absolute; top: 20px; left: -6px; width: 10px; height: 10px; content: ""; background: #1c252e; border-bottom: 1px solid #3a4a58; border-left: 1px solid #3a4a58; transform: rotate(45deg); }
      .verdict-icon, .verdict-label { display: none; }
      .panel[data-type="historical-low"] .decision-marker { background: #8ee6ad; }
      .panel[data-type="historical-low"] .chart-row.current .chart-fill, .panel[data-type="historical-low"] .chart-marker { background: #8ee6ad; }
      .panel[data-type="good"] .decision-marker { background: #f4c95d; }
      .panel[data-type="good"] .chart-row.current .chart-fill, .panel[data-type="good"] .chart-marker { background: #f4c95d; }
      .panel[data-type="wait"] .decision-marker { background: #e5a45a; }
      .panel[data-type="wait"] .chart-row.current .chart-fill, .panel[data-type="wait"] .chart-marker { background: #e5a45a; }
      .panel.is-collapsed { width: max-content; min-width: 164px; }
      .panel.is-collapsed .topbar { border-bottom-color: transparent; }
      .panel.is-collapsed .content,
      .panel.is-collapsed .verdict { display: none; }
      .panel.is-collapsed .brand { padding-right: 4px; }
      .panel.is-collapsed .collapsed-verdict-icon { display: grid; }
      .panel[data-type="historical-low"].is-collapsed .collapsed-verdict-icon { background: #8ee6ad; }
      .panel[data-type="good"].is-collapsed .collapsed-verdict-icon { color: #30280d; background: #f4c95d; }
      .panel[data-type="wait"].is-collapsed .collapsed-verdict-icon { color: #30200f; background: #e5a45a; }
      @keyframes rise { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @media (max-width: 480px) { .panel { right: 16px; bottom: 16px; } }
      @media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
    </style>
    <section class="panel">
      <header class="topbar">
        <div class="brand"><span class="mark">⚒</span> PriceForge</div>
        <span class="collapsed-verdict-icon" aria-label="Current PriceForge verdict" title="Current PriceForge verdict">◆</span>
        <div class="header-actions">
          <button class="header-button collapse" type="button" aria-label="Collapse PriceForge" aria-expanded="true" title="Collapse PriceForge">−</button>
          <button class="header-button close" type="button" aria-label="Close PriceForge" title="Close PriceForge">&times;</button>
        </div>
      </header>
      <div class="content">
        <div class="decision">
          <span class="decision-marker" aria-hidden="true"></span>
          <div><div class="decision-label">PriceForge verdict</div><div class="decision-name">Analysing...</div><div class="confidence">Checking confidence</div></div>
        </div>
        <div class="analysis">
          <div class="section-label">Price position</div>
          <div class="price-chart">
            <div class="chart-row" data-chart="average"><span class="chart-price">--</span><span class="chart-track"><span class="chart-fill"></span></span><span class="chart-note">Usual price</span></div>
            <div class="chart-row current" data-chart="current"><span class="chart-price">--</span><span class="chart-track"><span class="chart-fill"></span><span class="chart-marker" aria-hidden="true"></span></span><span class="chart-note">Current</span></div>
            <div class="chart-row" data-chart="typical"><span class="chart-price">--</span><span class="chart-track"><span class="chart-fill"></span></span><span class="chart-note">Typical sale</span></div>
            <div class="chart-row" data-chart="recent"><span class="chart-price">--</span><span class="chart-track"><span class="chart-fill"></span></span><span class="chart-note">Recent low</span></div>
          </div>
        </div>
        <div class="verdict">
          <div class="verdict-speaker" aria-hidden="true"><img src="${chrome.runtime.getURL("test.png")}" alt=""></div>
          <div class="speech verdict-text">I am reviewing the recent price history.</div>
        </div>
      </div>
    </section>`;

  shadowRoot.querySelector(".close").addEventListener("click", () => priceforge.remove());

  const panel = shadowRoot.querySelector(".panel");
  const collapseButton = shadowRoot.querySelector(".collapse");
  collapseButton.addEventListener("click", () => {
    const isCollapsed = panel.classList.toggle("is-collapsed");
    collapseButton.setAttribute("aria-expanded", String(!isCollapsed));
    collapseButton.setAttribute(
      "aria-label",
      isCollapsed ? "Expand PriceForge" : "Collapse PriceForge"
    );
    collapseButton.setAttribute(
      "title",
      isCollapsed ? "Expand PriceForge" : "Collapse PriceForge"
    );
    collapseButton.textContent = isCollapsed ? "+" : "−";
  });

  document.body.appendChild(priceforge);
    chrome.runtime.sendMessage(
  {
    type: "getGameData",
    appId: appId
  },
  response => {
    if (!response?.success) {
      console.error(
        "PriceForge API error:",
        response?.error || "Unknown error"
      );

      const historicalLowElement =
        shadowRoot.querySelector(".historical-low");

      if (historicalLowElement) {
        historicalLowElement.textContent = "Unavailable";
      }

      return;
    }

    const data = response.data;
    const apiVerdict = data.priceVerdict;
    const signals = data.priceSignals;

    const historicalLow = data.historicalLow?.price;
    const historicalLowElement =
      shadowRoot.querySelector(".historical-low");

    const currentPriceValue = parseFloat(
      currentPrice.replace(/[^0-9.]/g, "")
    );

    const formatPrice = value =>
      typeof value === "number" ? `£${value.toFixed(2)}` : "Unavailable";

    const chartValues = {
      average: signals?.averagePrice,
      current: signals?.currentPrice ?? currentPriceValue,
      typical: signals?.typicalSalePrice,
      recent: signals?.recentLow
    };

    const availableChartValues = Object.values(chartValues)
      .filter(value => typeof value === "number" && Number.isFinite(value));
    const chartMaximum = Math.max(...availableChartValues, 1);

    Object.entries(chartValues).forEach(([key, value]) => {
      const row = shadowRoot.querySelector(`[data-chart="${key}"]`);
      if (!row) {
        return;
      }

      row.querySelector(".chart-price").textContent = formatPrice(value);
      row.querySelector(".chart-fill").style.width =
        typeof value === "number"
          ? `${Math.max(5, (value / chartMaximum) * 100)}%`
          : "5%";
    });

    const currentRow = shadowRoot.querySelector('[data-chart="current"]');
    if (currentRow && typeof chartValues.current === "number") {
      currentRow.style.setProperty(
        "--marker-position",
        `${Math.max(0, Math.min(100, (chartValues.current / chartMaximum) * 100))}%`
      );
    }

    // Calculate how far above the historical low we are
    const percentAboveLow =
      historicalLow && currentPriceValue !== null
        ? ((currentPriceValue - historicalLow) / historicalLow) * 100
        : null;

    const roundedPercentAboveLow =
      percentAboveLow !== null
        ? Math.round(percentAboveLow)
        : null;

    // PriceForge verdict
    let verdict = "";
    let verdictType = "";

    if (roundedPercentAboveLow === 0) {
      verdict = "This is the lowest price we've seen, buy now!";
      verdictType = "historical-low";
    } else if (roundedPercentAboveLow <= 10) {
      verdict =
        "You're very close to the historical low. This is an excellent price.";
      verdictType = "excellent";
    } else if (roundedPercentAboveLow <= 25) {
      verdict =
        "This is a good price, although you may find it cheaper during a sale.";
      verdictType = "good";
    } else if (roundedPercentAboveLow <= 40) {
      verdict =
        "The price is noticeably above its historical low. It may be worth waiting.";
      verdictType = "wait";
    } else {
      verdict =
        "The price is well above its historical low. I'd wait for a sale.";
      verdictType = "wait";
    }

    const visualVerdictType =
      apiVerdict?.type ||
      (apiVerdict?.verdict === "BUY NOW"
        ? "historical-low"
        : apiVerdict?.verdict === "WAIT"
          ? "wait"
          : apiVerdict?.verdict === "GOOD TIME"
            ? "excellent"
            : verdictType);

    // Update historical low
    if (historicalLow !== undefined && historicalLowElement) {
      historicalLowElement.textContent =
        `£${historicalLow.toFixed(2)}`;
    }

    // Update verdict
    const verdictElement =
      shadowRoot.querySelector(".verdict-text");

    const verdictPanel =
      shadowRoot.querySelector(".verdict");

    const verdictIcon =
      shadowRoot.querySelector(".verdict-icon");

    const collapsedVerdictIcon =
      shadowRoot.querySelector(".collapsed-verdict-icon");

    const verdictIcons = {
      "historical-low": "★",
      excellent: "⚡",
      good: "↗",
      wait: "◷"
    };

    if (verdictElement) {
      verdictElement.textContent = verdict;
    }

    if (verdictPanel) {
      verdictPanel.dataset.type = visualVerdictType;
    }

    if (panel) {
      panel.dataset.type = visualVerdictType;
    }

    if (verdictIcon) {
      verdictIcon.textContent = verdictIcons[visualVerdictType] || "◆";
    }

    if (collapsedVerdictIcon) {
      collapsedVerdictIcon.textContent = verdictIcons[visualVerdictType] || "◆";
    }

    const verdictName =
      shadowRoot.querySelector(".decision-name");

    const confidence =
      shadowRoot.querySelector(".confidence");

    const displayedVerdict =
      apiVerdict?.verdict || verdict;

    const displayedConfidence =
      apiVerdict?.confidence || (verdictType === "wait" ? "low" : "medium");

    const displayedReason =
      apiVerdict?.reason || verdict;

    if (verdictName) {
      verdictName.textContent = displayedVerdict;
    }

    if (confidence) {
      confidence.textContent = `${displayedConfidence} confidence`;
    }

    if (verdictElement) {
      verdictElement.textContent = displayedReason;
    }

    console.log("Current Price:", currentPriceValue);
    console.log("Historical Low:", historicalLow);
    console.log("Percent Above Low:", roundedPercentAboveLow);
    console.log("Verdict:", verdict);
    console.log("Verdict Type:", verdictType);
  });
}
}