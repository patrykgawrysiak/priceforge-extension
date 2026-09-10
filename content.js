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
  const originalPrice = readText(".discount_original_price");
  const discount = readText(".discount_pct");

  const discountValue = discount ? parseInt(discount.replace(/\D/g, ""), 10) : 0;

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
        color: #e9f4f7;
        background: #101a20;
        border: 1px solid #2f5960;
        border-radius: 12px;
        box-shadow: 0 18px 46px rgba(0, 0, 0, .42), 0 0 0 1px rgba(92, 221, 190, .06);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        letter-spacing: 0;
        z-index: 999999;
        animation: rise .4s cubic-bezier(.2, .8, .2, 1) both;
      }
      .topbar { display: flex; align-items: center; justify-content: space-between; padding: 15px 16px 12px; background: linear-gradient(135deg, #142b2d, #101a20 72%); border-bottom: 1px solid #24454a; }
      .brand { display: flex; align-items: center; gap: 9px; color: #70e1c2; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .mark { display: grid; place-items: center; width: 25px; height: 25px; color: #102020; background: #70e1c2; border-radius: 7px; font-size: 15px; }
      .close { border: 0; padding: 3px 6px; color: #7c9a9e; background: transparent; cursor: pointer; font-size: 18px; line-height: 1; }
      .close:hover { color: #e9f4f7; }
      .content { padding: 17px 16px 15px; }
      .title { margin: 0 28px 4px 0; color: #f5fbfc; font-size: 18px; font-weight: 700; line-height: 1.22; }
      .app-id { color: #769196; font-size: 11px; }
      .price-row { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-top: 18px; }
      .eyebrow { margin-bottom: 3px; color: #769196; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .price { color: #70e1c2; font-size: 28px; font-weight: 700; line-height: 1; }
      .discount { padding: 5px 8px; color: #102020; background: #f4c95d; border-radius: 5px; font-size: 12px; font-weight: 700; }
      .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin-top: 17px; overflow: hidden; background: #2a484d; border: 1px solid #2a484d; border-radius: 8px; }
      .stat { padding: 10px; background: #152329; }
      .stat-label { display: block; margin-bottom: 4px; color: #769196; font-size: 10px; }
      .stat-value { color: #d7e7e9; font-size: 13px; font-weight: 700; }
      .muted { color: #8aa0a4; font-weight: 400; }
      .footer { display: flex; align-items: center; gap: 6px; margin-top: 14px; color: #769196; font-size: 10px; }
      .status { width: 6px; height: 6px; background: #70e1c2; border-radius: 50%; box-shadow: 0 0 8px #70e1c2; }
      .verdict { display: grid; grid-template-columns: 30px 1fr; gap: 10px; align-items: start; margin: 0 16px 16px; padding: 12px; border: 1px solid #2f5960; border-radius: 10px; background: linear-gradient(135deg, #152a2d, #0c151a 78%); box-shadow: inset 3px 0 0 #70e1c2; }
      .verdict-icon { display: grid; place-items: center; width: 30px; height: 30px; color: #102020; background: #70e1c2; border-radius: 8px; font-size: 15px; font-weight: 700; }
      .verdict-label { margin: 1px 0 5px; color: #70e1c2; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .verdict-text { color: #d7e4e5; font-size: 13px; line-height: 1.45; }
      .verdict[data-type="historical-low"] { border-color: #4f826e; box-shadow: inset 3px 0 0 #8ee6ad; }
      .verdict[data-type="historical-low"] .verdict-icon { background: #8ee6ad; }
      .verdict[data-type="excellent"] { box-shadow: inset 3px 0 0 #70e1c2; }
      .verdict[data-type="good"] { box-shadow: inset 3px 0 0 #f4c95d; }
      .verdict[data-type="good"] .verdict-icon { color: #30280d; background: #f4c95d; }
      .verdict[data-type="wait"] { box-shadow: inset 3px 0 0 #e5a45a; }
      .verdict[data-type="wait"] .verdict-icon { color: #30200f; background: #e5a45a; }
      @keyframes rise { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @media (max-width: 480px) { .panel { right: 16px; bottom: 16px; } }
      @media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
    </style>
    <section class="panel">
      <header class="topbar">
        <div class="brand"><span class="mark">⚒</span> PriceForge</div>
        <button class="close" type="button" aria-label="Close PriceForge">&times;</button>
      </header>
      <div class="content">
        <h2 class="title"></h2>
        <div class="app-id">STEAM APP <span class="app-id-value"></span></div>
        <div class="price-row">
          <div><div class="eyebrow">Current price</div><div class="price current-price"></div></div>
          ${discountValue ? `<span class="discount"></span>` : ""}
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-label">Original price</span>
            <span class="stat-value original-price"></span>
          </div>
          <div class="stat">
            <span class="stat-label">Historical low</span>
            <span class="stat-value historical-low">Loading...</span>
          </div>
        </div>
        <div class="footer"><span class="status"></span> Live price from Steam</div>
      </div>
      <div class="verdict" data-type="loading">
        <div class="verdict-icon" aria-hidden="true">◆</div>
        <div><div class="verdict-label">PriceForge verdict</div><div class="verdict-text">Analysing price...</div></div>
      </div>
    </section>`;

  shadowRoot.querySelector(".title").textContent = gameTitle;
  shadowRoot.querySelector(".app-id-value").textContent = appId || "Unknown";
  shadowRoot.querySelector(".current-price").textContent = currentPrice;
  shadowRoot.querySelector(".original-price").textContent = originalPrice || "Not on sale";
  if (discountValue) shadowRoot.querySelector(".discount").textContent = `${discountValue}% OFF`;
  shadowRoot.querySelector(".close").addEventListener("click", () => priceforge.remove());

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

    if (verdictElement) {
      verdictElement.textContent = verdict;
    }

    if (verdictPanel) {
      verdictPanel.dataset.type = verdictType;
    }

    console.log("Current Price:", currentPriceValue);
    console.log("Historical Low:", historicalLow);
    console.log("Percent Above Low:", roundedPercentAboveLow);
    console.log("Verdict:", verdict);
    console.log("Verdict Type:", verdictType);
  }
);}