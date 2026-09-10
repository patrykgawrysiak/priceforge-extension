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
        width: min(328px, calc(100vw - 32px));
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
      .topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(115deg, #1b2838, #171a21 68%); border-bottom: 1px solid #2a475e; }
      .brand { display: flex; align-items: center; gap: 9px; color: #66c0f4; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .mark { display: grid; place-items: center; width: 25px; height: 25px; color: #66c0f4; background: transparent; border-radius: 0; box-shadow: none; font-size: 18px; }
      .header-actions { display: flex; align-items: center; gap: 3px; }
      .header-button { display: grid; place-items: center; width: 25px; height: 25px; border: 1px solid transparent; border-radius: 6px; color: #7c9a9e; background: transparent; cursor: pointer; font-size: 15px; line-height: 1; }
      .header-button:hover { color: #d6d7d8; background: rgba(102, 192, 244, .1); border-color: #2a475e; }
      .close { font-size: 18px; }
      .collapsed-verdict-icon { display: none; place-items: center; width: 23px; height: 23px; margin-left: auto; margin-right: 7px; color: #102020; background: #66c0f4; border-radius: 7px; box-shadow: 0 0 13px rgba(102, 192, 244, .25); font-size: 12px; font-weight: 700; }
      .content { padding: 14px 16px 15px; background-image: linear-gradient(rgba(102, 192, 244, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(102, 192, 244, .035) 1px, transparent 1px); background-size: 24px 24px; }
      .section-label { display: flex; align-items: center; gap: 7px; color: #8f98a0; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      .section-label::before { width: 4px; height: 4px; content: ""; background: #66c0f4; border-radius: 50%; box-shadow: 0 0 8px #66c0f4; }
      .price-stage { position: relative; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; min-height: 86px; margin: 12px 0 13px; padding: 10px 0; border-top: 1px solid rgba(102, 192, 244, .16); border-bottom: 1px solid rgba(102, 192, 244, .16); }
      .price-main { text-align: center; }
      .eyebrow { margin-bottom: 5px; color: #769196; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      .price { color: #66c0f4; font-size: 33px; font-weight: 700; line-height: 1; text-shadow: 0 0 18px rgba(102, 192, 244, .22); }
      .micro-stat { min-width: 0; color: #8f98a0; font-size: 9px; line-height: 1.3; }
      .micro-stat.right { text-align: right; }
      .micro-label { display: block; margin-bottom: 3px; letter-spacing: .07em; text-transform: uppercase; }
      .micro-value { display: block; overflow: hidden; color: #d6d7d8; font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .footer { display: flex; align-items: center; gap: 6px; color: #8f98a0; font-size: 10px; }
      .status { width: 6px; height: 6px; background: #66c0f4; border-radius: 50%; box-shadow: 0 0 8px #66c0f4; }
      .verdict { margin: 0 16px 16px; padding: 14px; border: 1px solid #2a475e; border-radius: 10px; background: linear-gradient(135deg, #1b2838, #171a21 78%); box-shadow: inset 3px 0 0 #66c0f4, 0 8px 24px rgba(0, 0, 0, .16); }
      .verdict-header { display: grid; grid-template-columns: 36px 1fr auto; gap: 11px; align-items: center; }
      .verdict-icon { display: grid; place-items: center; width: 36px; height: 36px; color: #102020; background: #66c0f4; border-radius: 10px; box-shadow: 0 0 16px rgba(102, 192, 244, .2); font-size: 18px; font-weight: 700; }
      .verdict-label { margin: 0 0 3px; color: #66c0f4; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .verdict-name { color: #f5f5f5; font-size: 15px; font-weight: 700; letter-spacing: .03em; }
      .confidence { padding: 4px 7px; color: #9bb4c5; border: 1px solid #3a5870; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
      .speech { position: relative; margin-top: 13px; padding: 11px 12px; color: #d6d7d8; background: #111b24; border: 1px solid #30485d; border-radius: 4px 11px 11px 11px; font-size: 11px; line-height: 1.5; }
      .speech::before { position: absolute; top: -7px; left: 15px; width: 12px; height: 12px; content: ""; background: #111b24; border-top: 1px solid #30485d; border-left: 1px solid #30485d; transform: rotate(45deg); }
      .verdict[data-type="historical-low"] { border-color: #4f826e; box-shadow: inset 3px 0 0 #8ee6ad; }
      .verdict[data-type="historical-low"] .verdict-icon { background: #8ee6ad; }
      .verdict[data-type="historical-low"] .confidence { color: #9fe6b6; border-color: #4f826e; }
      .verdict[data-type="excellent"] { box-shadow: inset 3px 0 0 #66c0f4; }
      .verdict[data-type="good"] { box-shadow: inset 3px 0 0 #f4c95d; }
      .verdict[data-type="good"] .verdict-icon { color: #30280d; background: #f4c95d; }
      .verdict[data-type="good"] .confidence { color: #f4c95d; border-color: #766633; }
      .verdict[data-type="wait"] { box-shadow: inset 3px 0 0 #e5a45a; }
      .verdict[data-type="wait"] .verdict-icon { color: #30200f; background: #e5a45a; }
      .verdict[data-type="wait"] .confidence { color: #e5a45a; border-color: #765331; }
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
        <div class="section-label">Price intelligence</div>
        <div class="price-stage">
          <div class="micro-stat"><span class="micro-label">Discount</span><span class="micro-value discount-value"></span></div>
          <div class="price-main"><div class="eyebrow">Current price</div><div class="price current-price"></div></div>
          <div class="micro-stat right"><span class="micro-label">All-time low</span><span class="micro-value historical-low">Loading...</span></div>
        </div>
        <div class="footer"><span class="status"></span> Is it the right time to buy?</div>
      </div>
      <div class="verdict" data-type="loading">
        <div class="verdict-header">
          <div class="verdict-icon" aria-hidden="true">◆</div>
          <div><div class="verdict-label">PriceForge verdict</div><div class="verdict-name">Analysing price...</div></div>
          <span class="confidence">Checking</span>
        </div>
        <div class="speech verdict-text">I am reviewing the recent price history.</div>
      </div>
    </section>`;

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
    const apiVerdict = data.priceVerdict;

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
      shadowRoot.querySelector(".verdict-name");

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