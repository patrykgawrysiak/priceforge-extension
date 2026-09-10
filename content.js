if (!document.getElementById("priceforge-root")) {
  const pathParts = window.location.pathname.split("/");
  const appIndex = pathParts.indexOf("app");
  const appId = appIndex !== -1 ? pathParts[appIndex + 1] : null;

  const purchaseArea = document.querySelector("#game_area_purchase");
  const readText = (selector, fallback = null) => {
    const element = purchaseArea?.querySelector(selector);
    return element ? element.textContent.trim() : fallback;
  };

  const gameTitle = document.querySelector(".apphub_AppName")?.textContent.trim() || "Unknown game";
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
        background: #171a21;
        border: 1px solid #2a475e;
        border-radius: 14px;
        box-shadow: 0 20px 54px rgba(0, 0, 0, .48), 0 0 28px rgba(102, 192, 244, .1);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        letter-spacing: 0;
        z-index: 999999;
        animation: rise .4s cubic-bezier(.2, .8, .2, 1) both;
      }
      .topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 12px; background: linear-gradient(115deg, #1b2838, #171a21 68%); border-bottom: 1px solid #2a475e; }
      .brand { display: flex; align-items: center; gap: 9px; color: #66c0f4; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .mark { display: grid; place-items: center; width: 25px; height: 25px; color: #66c0f4; background: transparent; border-radius: 0; box-shadow: none; font-size: 18px; }
      .header-actions { display: flex; align-items: center; gap: 3px; }
      .header-button { display: grid; place-items: center; width: 25px; height: 25px; border: 1px solid transparent; border-radius: 6px; color: #7c9a9e; background: transparent; cursor: pointer; font-size: 15px; line-height: 1; }
      .header-button:hover { color: #d6d7d8; background: rgba(102, 192, 244, .1); border-color: #2a475e; }
      .close { font-size: 18px; }
      .collapsed-verdict-icon { display: none; place-items: center; width: 23px; height: 23px; margin-left: auto; margin-right: 7px; color: #102020; background: #66c0f4; border-radius: 7px; box-shadow: 0 0 13px rgba(102, 192, 244, .25); font-size: 12px; font-weight: 700; }
      .content { padding: 17px 16px 14px; background-image: linear-gradient(rgba(102, 192, 244, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(102, 192, 244, .035) 1px, transparent 1px); background-size: 24px 24px; }
      .title { margin: 0 26px 0 0; color: #f5f5f5; font-size: 18px; font-weight: 700; line-height: 1.22; }
      .price-stage { position: relative; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; min-height: 94px; margin: 17px 0 13px; padding: 10px 0; border-top: 1px solid rgba(102, 192, 244, .16); border-bottom: 1px solid rgba(102, 192, 244, .16); }
      .price-main { text-align: center; }
      .eyebrow { margin-bottom: 5px; color: #769196; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      .price { color: #66c0f4; font-size: 31px; font-weight: 700; line-height: 1; text-shadow: 0 0 18px rgba(102, 192, 244, .22); }
      .micro-stat { min-width: 0; color: #8f98a0; font-size: 9px; line-height: 1.3; }
      .micro-stat.right { text-align: right; }
      .micro-label { display: block; margin-bottom: 3px; letter-spacing: .07em; text-transform: uppercase; }
      .micro-value { display: block; overflow: hidden; color: #d6d7d8; font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .footer { display: flex; align-items: center; gap: 6px; color: #8f98a0; font-size: 10px; }
      .status { width: 6px; height: 6px; background: #66c0f4; border-radius: 50%; box-shadow: 0 0 8px #66c0f4; }
      .verdict { display: grid; grid-template-columns: 36px 1fr; gap: 11px; align-items: start; margin: 0 16px 16px; padding: 13px; border: 1px solid #2a475e; border-radius: 10px; background: linear-gradient(135deg, #1b2838, #171a21 78%); box-shadow: inset 3px 0 0 #66c0f4; }
      .verdict-icon { display: grid; place-items: center; width: 36px; height: 36px; color: #102020; background: #66c0f4; border-radius: 10px; box-shadow: 0 0 16px rgba(102, 192, 244, .2); font-size: 18px; font-weight: 700; }
      .verdict-label { margin: 1px 0 5px; color: #66c0f4; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .verdict-text { color: #d6d7d8; font-size: 13px; line-height: 1.45; }
      .verdict[data-type="historical-low"] { border-color: #4f826e; box-shadow: inset 3px 0 0 #8ee6ad; }
      .verdict[data-type="historical-low"] .verdict-icon { background: #8ee6ad; }
      .verdict[data-type="excellent"] { box-shadow: inset 3px 0 0 #66c0f4; }
      .verdict[data-type="good"] { box-shadow: inset 3px 0 0 #f4c95d; }
      .verdict[data-type="good"] .verdict-icon { color: #30280d; background: #f4c95d; }
      .verdict[data-type="wait"] { box-shadow: inset 3px 0 0 #e5a45a; }
      .verdict[data-type="wait"] .verdict-icon { color: #30200f; background: #e5a45a; }
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
        <h2 class="title"></h2>
        <div class="price-stage">
          <div class="micro-stat"><span class="micro-label">Discount</span><span class="micro-value discount-value"></span></div>
          <div class="price-main"><div class="eyebrow">Current price</div><div class="price current-price"></div></div>
          <div class="micro-stat right"><span class="micro-label">All-time low</span><span class="micro-value historical-low">Loading...</span></div>
        </div>
        <div class="footer"><span class="status"></span> Live price from Steam</div>
      </div>
      <div class="verdict" data-type="loading">
        <div class="verdict-icon" aria-hidden="true">◆</div>
        <div><div class="verdict-label">PriceForge verdict</div><div class="verdict-text">Analysing price...</div></div>
      </div>
    </section>`;

  shadowRoot.querySelector(".title").textContent = gameTitle;
  shadowRoot.querySelector(".current-price").textContent = currentPrice;
  shadowRoot.querySelector(".discount-value").textContent = discount || "No discount";
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

    const historicalLow = data.historicalLow?.price;
    const historicalLowElement =
      shadowRoot.querySelector(".historical-low");

    const currentPriceValue = parseFloat(
      currentPrice.replace(/[^0-9.]/g, "")
    );

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
      verdictPanel.dataset.type = verdictType;
    }

    if (panel) {
      panel.dataset.type = verdictType;
    }

    if (verdictIcon) {
      verdictIcon.textContent = verdictIcons[verdictType] || "◆";
    }

    if (collapsedVerdictIcon) {
      collapsedVerdictIcon.textContent = verdictIcons[verdictType] || "◆";
    }

    console.log("Current Price:", currentPriceValue);
    console.log("Historical Low:", historicalLow);
    console.log("Percent Above Low:", roundedPercentAboveLow);
    console.log("Verdict:", verdict);
    console.log("Verdict Type:", verdictType);
  }
);}