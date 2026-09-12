
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

    const currentPrice = readText(
      ".discount_final_price, .game_purchase_price",
      "Price unavailable"
    );

    const discount = readText(".discount_pct");

    // ---------------------------------------------------------
    // PRICEFORGE CONTAINER
    // ---------------------------------------------------------

    const priceforge = document.createElement("aside");

    priceforge.id = "priceforge-root";

    priceforge.setAttribute(
      "aria-label",
      "PriceForge price summary"
    );

    const shadowRoot = priceforge.attachShadow({
      mode: "open"
    });

    // ---------------------------------------------------------
    // UI
    // ---------------------------------------------------------

    shadowRoot.innerHTML = `
      <style>

        :host {
          all: initial;
        }

        /* ---------------------------------------------------
           PANEL
        --------------------------------------------------- */

        .panel {
          position: fixed;
          right: 10px;
          bottom: 24px;

          width: min(320px, calc(100vw - 32px));

          box-sizing: border-box;
          overflow: hidden;

          color: #d6d7d8;
          background: #15191f;

          border: 1px solid #303944;
          border-radius: 12px;

          box-shadow:
            0 20px 54px rgba(0, 0, 0, .48),
            0 0 28px rgba(102, 192, 244, .1);

          font-family: "Trebuchet MS", "Segoe UI", sans-serif;
          letter-spacing: 0;

          z-index: 999999;

          animation: rise .4s cubic-bezier(.2, .8, .2, 1) both;
        }

        /* ---------------------------------------------------
           TOP-RIGHT CONTROLS
        --------------------------------------------------- */

        .panel-controls {
          position: absolute;
          top: 10px;
          right: 10px;

          display: flex;
          align-items: center;

          gap: 6px;

          z-index: 5;
        }

        .header-button {
          display: grid;
          place-items: center;

          width: 22px;
          height: 22px;

          padding: 0;

          border: none;
          border-radius: 0;

          color: #7c9a9e;
          background: transparent;

          cursor: pointer;

          font-size: 14px;
          line-height: 1;
        }

        .header-button:hover {
          color: #d6d7d8;
          background: rgba(102, 192, 244, .1);
        }

        .close {
          font-size: 17px;
        }

        /* ---------------------------------------------------
           MAIN CONTENT
        --------------------------------------------------- */

        .content {
          padding: 19px 20px 10px;
        }

        /* ---------------------------------------------------
           VERDICT HEADER
        --------------------------------------------------- */

        .decision {
          display: grid;
          grid-template-columns: 9px minmax(0, 1fr);

          gap: 13px;

          align-items: center;

          margin-bottom: 0;
        }

        .decision-marker {
          width: 9px;
          height: 48px;

          border-radius: 3px;

          background: #66c0f4;

          box-shadow:
            0 0 16px rgba(102, 192, 244, .3);
        }

        .decision-label {
          margin-bottom: 3px;

          color: #8f98a0;

          font-size: 9px;
          font-weight: 700;

          letter-spacing: .13em;

          text-transform: uppercase;
        }

        .decision-name {
          color: #f5f5f5;

          font-size: 27px;
          font-weight: 800;

          letter-spacing: .02em;

          line-height: 1;
        }

        .confidence {
          margin-top: 6px;

          color: #9bb4c5;

          font-size: 9px;
          font-weight: 700;

          letter-spacing: .08em;

          text-transform: uppercase;
        }

        /* ---------------------------------------------------
           VERDICT SPEECH
        --------------------------------------------------- */

        .verdict {
          display: grid;

          grid-template-columns: 65px minmax(0, 1fr);

          gap: 0;

          align-items: start;

          margin-top: 17px;

          padding-top: 14px;

          border-top: 1px solid #303944;
        }

        .verdict-speaker {
          display: block;

          width: 70px;
          height: 70px;

          overflow: hidden;

          transform: translate(-14px, -12px);
        }

        .verdict-speaker img {
          display: block;

          width: 100%;
          height: 100%;

          object-fit: contain;
        }

        .speech {
          position: relative;
          padding: 10px 11px;
          color: #d6d7d8;
          background: #1c252e;
          border: 1px solid rgba(102, 192, 244, .45);
          border-radius: 4px 10px 10px 10px;
          font-size: 11px;
          line-height: 1.55;

          /* Blue PriceForge glow */
          box-shadow:
            0 0 8px rgba(102, 192, 244, .25),
            0 0 20px rgba(102, 192, 244, .12);
        }

        .speech::before {
          position: absolute;
          top: 20px;
          left: -6px;
          width: 10px;
          height: 10px;
          content: "";
          background: #1c252e;
          border-bottom: 1px solid rgba(102, 192, 244, .45);
          border-left: 1px solid rgba(102, 192, 244, .45);
          transform: rotate(45deg);
        }

        /* ---------------------------------------------------
           PRICE ANALYSIS TOGGLE
        --------------------------------------------------- */

        .analysis-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;

          width: 100%;

          margin-top: 12px;
          margin-bottom: 12px;

          padding: 5px 0 3px;

          color: #8f98a0;

          background: transparent;
          border: none;

          cursor: pointer;

          font-family: inherit;
          font-size: 9px;
          font-weight: 700;

          letter-spacing: .13em;
          text-align: left;
          text-transform: uppercase;
        }

        .analysis-toggle:hover {
          color: #d6d7d8;
        }

        .analysis-toggle-arrow {
          display: inline-flex;

          align-items: center;
          justify-content: center;

          width: 16px;
          height: 16px;

          color: #7c9a9e;

          font-size: 15px;

          line-height: 1;
        }

        .analysis-toggle:hover .analysis-toggle-arrow {
          color: #66c0f4;
        }

        /* ---------------------------------------------------
          KEY PRICE CHECK
        --------------------------------------------------- */

        .key-check-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-top: 2px;
          margin-bottom: 12px;
          padding: 5px 0 3px;
          color: #8f98a0;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .13em;
          text-align: left;
          text-transform: uppercase;
        }

        .key-check-toggle:hover {
          color: #d6d7d8;
        }

        .key-check-toggle-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          color: #7c9a9e;
          font-size: 15px;
          line-height: 1;
        }

        .key-check-toggle:hover .key-check-toggle-arrow {
          color: #66c0f4;
        }

        /* ---------------------------------------------------
          KEY CHECK RESULT
        --------------------------------------------------- */

        .key-check {
          display: none;
          margin: 3px 0 12px;
          padding: 11px 12px;
          background: #1c252e;
          border: 1px solid rgba(102, 192, 244, .25);
          border-radius: 8px;
        }

        .key-check.is-open {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .key-check-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          color: #15191f;
          background: #8ee6ad;
          font-size: 13px;
          font-weight: 900;
          line-height: 1;
        }

        .key-check-content {
          min-width: 0;
        }

        .key-check-title {
          margin-bottom: 3px;
          color: #f5f5f5;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .key-check-text {
          color: #9da6ad;
          font-size: 10px;
          line-height: 1.5;
        }

        /* ---------------------------------------------------
           PRICE ANALYSIS
        --------------------------------------------------- */

        .analysis {
          display: none;

          padding-top: 5px;
        }

        .analysis.is-open {
          display: block;
        }

        .section-label {
          margin-bottom: 15px;

          color: #8f98a0;

          font-size: 10px;
          font-weight: 700;

          letter-spacing: .13em;

          text-transform: uppercase;
        }

        .price-chart {
          display: grid;

          gap: 13px;
        }

        .chart-row {
          display: grid;

          grid-template-columns:
            74px
            minmax(0, 1fr)
            76px;

          gap: 12px;

          align-items: center;

          min-height: 18px;

          color: #d6d7d8;

          font-size: 11px;
        }

        .chart-price {
          font-variant-numeric: tabular-nums;
        }

        .chart-track {
          position: relative;

          width: 100%;
          height: 5px;

          overflow: visible;

          background: #303944;

          border-radius: 3px;
        }

        .chart-fill {
          display: block;

          height: 100%;

          min-width: 5px;

          background: #506575;

          border-radius: 3px;
        }

        .chart-row.current .chart-fill {
          background: #66c0f4;
        }

        .chart-marker {
          position: absolute;

          top: 50%;

          left: var(--marker-position, 100%);

          width: 12px;
          height: 12px;

          border: 2px solid #15191f;
          border-radius: 50%;

          background: #66c0f4;

          box-shadow:
            0 0 0 1px #66c0f4,
            0 0 12px rgba(102, 192, 244, .42);

          transform: translate(-50%, -50%);
        }

        .chart-note {
          color: #8f98a0;

          font-size: 10px;

          white-space: nowrap;
        }

        /* ---------------------------------------------------
            VERDICT COLOURS
          --------------------------------------------------- */

          .panel[data-type="historical-low"] .decision-marker {
            background: #8ee6ad;
            box-shadow:
              0 0 16px rgba(142, 230, 173, .3);
          }

          .panel[data-type="historical-low"]
          .chart-row.current
          .chart-fill,
          .panel[data-type="historical-low"]
          .chart-marker {
            background: #8ee6ad;
          }

          .panel[data-type="fair"] .decision-marker {
            background: #f4c95d;
            box-shadow:
              0 0 16px rgba(244, 201, 93, .25);
          }

          .panel[data-type="fair"]
          .chart-row.current
          .chart-fill,
          .panel[data-type="fair"]
          .chart-marker {
            background: #f4c95d;
          }

          .panel[data-type="wait"] .decision-marker {
            background: #af1c1c;
            box-shadow:
              0 0 16px rgba(229, 164, 90, .25);
          }

          .panel[data-type="wait"]
          .chart-row.current
          .chart-fill,
          .panel[data-type="wait"]
          .chart-marker {
            background: #af1c1c;
          }

          .panel[data-type="free"] .decision-marker {
            background: #8ee6ad;
            box-shadow:
              0 0 16px rgba(142, 230, 173, .3);
          }

        /* Free games do not need the analysis link */

        .panel[data-type="free"] .analysis-toggle {
          display: none;
        }

        /* ---------------------------------------------------
           FOOTER
        --------------------------------------------------- */

        .panel-footer {
          display: flex;
          align-items: center;
          justify-content: center;

          padding: 8px 16px 11px;
        }

        .powered-by {
          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 5px;

          color: #66717c;

          font-size: 8px;
          font-weight: 600;

          letter-spacing: .08em;

          text-transform: uppercase;
        }

        .powered-by .mark {
          display: inline-grid;

          place-items: center;

          width: 12px;
          height: 12px;

          color: #15191f;

          background: #66c0f4;

          border-radius: 3px;

          font-size: 7px;
          font-weight: 800;

          opacity: .7;
        }

        /* ---------------------------------------------------
           COLLAPSED PANEL
        --------------------------------------------------- */

        .panel.is-collapsed {
          width: max-content;

          min-width: 164px;
        }

        .panel.is-collapsed .content {
          display: none;
        }

        .panel.is-collapsed .powered-by {
          display: none;
        }

        .panel.is-collapsed .panel-footer {
          padding: 0;
        }

        .panel.is-collapsed .panel-controls {
          position: static;

          padding: 10px;

          justify-content: center;
        }

        /* ---------------------------------------------------
           ANIMATION
        --------------------------------------------------- */

        @keyframes rise {
          from {
            opacity: 0;

            transform:
              translateY(12px)
              scale(.98);
          }

          to {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }

        /* ---------------------------------------------------
           RESPONSIVE
        --------------------------------------------------- */

        @media (max-width: 480px) {
          .panel {
            right: 16px;
            bottom: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .panel {
            animation: none;
          }
        }

      </style>

      <section class="panel">

        <!-- TOP CONTROLS -->

        <div class="panel-controls">

          <button
            class="header-button collapse"
            type="button"
            aria-label="Collapse PriceForge"
            aria-expanded="true"
            title="Collapse PriceForge"
          >−</button>

          <button
            class="header-button close"
            type="button"
            aria-label="Close PriceForge"
            title="Close PriceForge"
          >&times;</button>

        </div>

        <!-- MAIN CONTENT -->

        <div class="content">

          <!-- VERDICT -->

          <div class="decision">

            <span
              class="decision-marker"
              aria-hidden="true"
            ></span>

            <div>

              <div class="decision-label">
                PriceForge verdict
              </div>

              <div class="decision-name">
                Analysing...
              </div>

              <div class="confidence">
                Checking confidence
              </div>

            </div>

          </div>

          <!-- VERDICT SPEECH -->

          <div class="verdict">

            <div
              class="verdict-speaker"
              aria-hidden="true"
            >
              <img
                src="${chrome.runtime.getURL("test.png")}"
                alt=""
              >
            </div>

            <div class="speech verdict-text">
              I am reviewing the recent price history.
            </div>

          </div>

          <!-- PRICE ANALYSIS TOGGLE -->

          <button
            class="analysis-toggle"
            type="button"
            aria-expanded="false"
          >

            <span>
              View price analysis
            </span>

            <span
              class="analysis-toggle-arrow"
              aria-hidden="true"
            >›</span>

          </button>

          <!-- KEY PRICE CHECK -->

          <button
            class="key-check-toggle"
            type="button"
            aria-expanded="false"
          >
            <span>
              Is a key cheaper?
            </span>

            <span
              class="key-check-toggle-arrow"
              aria-hidden="true"
            >›</span>
          </button>

          <div
            class="key-check"
            aria-hidden="true"
          >
            <div class="key-check-icon">✓</div>

            <div class="key-check-content">
              <div class="key-check-title">
                Keys are cheaper
              </div>

              <div class="key-check-text">
                An external game key is currently cheaper than Steam.
              </div>
            </div>
          </div>

          <!-- PRICE ANALYSIS -->

          <div
            class="analysis"
            aria-hidden="true"
          >

            <div class="section-label">
              Price position
            </div>

            <div class="price-chart">

              <div
                class="chart-row"
                data-chart="normal"
              >

                <span class="chart-price">
                  --
                </span>

                <span class="chart-track">

                  <span class="chart-fill"></span>

                </span>

                <span class="chart-note">
                  Normal price
                </span>

              </div>

              <div
                class="chart-row current"
                data-chart="current"
              >

                <span class="chart-price">
                  --
                </span>

                <span class="chart-track">

                  <span class="chart-fill"></span>

                  <span
                    class="chart-marker"
                    aria-hidden="true"
                  ></span>

                </span>

                <span class="chart-note">
                  Current price
                </span>

              </div>

              <div
                class="chart-row"
                data-chart="typical"
              >

                <span class="chart-price">
                  --
                </span>

                <span class="chart-track">

                  <span class="chart-fill"></span>

                </span>

                <span class="chart-note">
                  Typical sale
                </span>

              </div>

              <div
                class="chart-row"
                data-chart="recent"
              >

                <span class="chart-price">
                  --
                </span>

                <span class="chart-track">

                  <span class="chart-fill"></span>

                </span>

                <span class="chart-note">
                  3 Month low
                </span>

              </div>

            </div>

          </div>

        </div>

        <!-- FOOTER -->

        <div class="panel-footer">

          <div class="powered-by">

            <span class="mark">
              ⚒
            </span>

            <span>
              Powered by PriceForge
            </span>

          </div>

        </div>

      </section>
    `;

    // ---------------------------------------------------------
    // ELEMENT REFERENCES
    // ---------------------------------------------------------

    const panel =
      shadowRoot.querySelector(".panel");

    const closeButton =
      shadowRoot.querySelector(".close");

    const collapseButton =
      shadowRoot.querySelector(".collapse");

    const analysisToggle =
      shadowRoot.querySelector(".analysis-toggle");

    const analysis =
      shadowRoot.querySelector(".analysis");

    const analysisToggleArrow =
      shadowRoot.querySelector(
        ".analysis-toggle-arrow"
      );

      const keyCheckToggle =
    shadowRoot.querySelector(
      ".key-check-toggle"
    );

  const keyCheck =
    shadowRoot.querySelector(
      ".key-check"
    );

  const keyCheckToggleArrow =
    shadowRoot.querySelector(
      ".key-check-toggle-arrow"
    );

    // ---------------------------------------------------------
    // CLOSE
    // ---------------------------------------------------------

    closeButton.addEventListener(
      "click",
      () => {
        priceforge.remove();
      }
    );

    // ---------------------------------------------------------
    // COLLAPSE
    // ---------------------------------------------------------

    collapseButton.addEventListener(
      "click",
      () => {
        const isCollapsed =
          panel.classList.toggle(
            "is-collapsed"
          );

        collapseButton.setAttribute(
          "aria-expanded",
          String(!isCollapsed)
        );

        collapseButton.setAttribute(
          "aria-label",
          isCollapsed
            ? "Expand PriceForge"
            : "Collapse PriceForge"
        );

        collapseButton.setAttribute(
          "title",
          isCollapsed
            ? "Expand PriceForge"
            : "Collapse PriceForge"
        );

        collapseButton.textContent =
          isCollapsed
            ? "+"
            : "−";
      }
    );

    // ---------------------------------------------------------
    // VIEW PRICE ANALYSIS
    // ---------------------------------------------------------

    analysisToggle.addEventListener(
      "click",
      () => {
        const isOpen =
          analysis.classList.toggle(
            "is-open"
          );

        analysisToggle.setAttribute(
          "aria-expanded",
          String(isOpen)
        );

        analysis.setAttribute(
          "aria-hidden",
          String(!isOpen)
        );

        analysisToggle.querySelector(
          "span:first-child"
        ).textContent =
          isOpen
            ? "Hide price analysis"
            : "View price analysis";

        analysisToggleArrow.textContent =
          isOpen
            ? "⌃"
            : "›";
      }
    );

    // ---------------------------------------------------------
// IS A KEY CHEAPER?
// ---------------------------------------------------------

keyCheckToggle.addEventListener(
  "click",
  () => {

    const isOpen =
      keyCheck.classList.toggle(
        "is-open"
      );

    keyCheckToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    keyCheck.setAttribute(
      "aria-hidden",
      String(!isOpen)
    );

    keyCheckToggleArrow.textContent =
      isOpen
        ? "⌃"
        : "›";
  }
);

    // ---------------------------------------------------------
    // ADD TO PAGE
    // ---------------------------------------------------------

    document.body.appendChild(priceforge);

    // ---------------------------------------------------------
    // REQUEST GAME DATA
    // ---------------------------------------------------------

    chrome.runtime.sendMessage(
      {
        type: "getGameData",
        appId: appId
      },
      response => {

        // -----------------------------------------------------
        // API ERROR
        // -----------------------------------------------------

        if (!response?.success) {

          console.error(
            "PriceForge API error:",
            response?.error ||
              "Unknown error"
          );

          const verdictName =
            shadowRoot.querySelector(
              ".decision-name"
            );

          const confidence =
            shadowRoot.querySelector(
              ".confidence"
            );

          const verdictElement =
            shadowRoot.querySelector(
              ".verdict-text"
            );

          if (verdictName) {
            verdictName.textContent =
              "UNAVAILABLE";
          }

          if (confidence) {
            confidence.textContent =
              "Low confidence";
          }

          if (verdictElement) {
            verdictElement.textContent =
              "I couldn't get reliable price data for this game.";
          }

          if (panel) {
            panel.dataset.type =
              "wait";
          }

          return;
        }

        // -----------------------------------------------------
        // API DATA
        // -----------------------------------------------------

        const data =
          response.data;

        const apiVerdict =
          data.priceVerdict;

        const signals =
          data.priceSignals;

        const historicalLow =
          data.historicalLow?.price;

        // -----------------------------------------------------
        // CURRENT PRICE
        // -----------------------------------------------------

        const currentPriceValue =
          parseFloat(
            currentPrice.replace(
              /[^0-9.]/g,
              ""
            )
          );

        // -----------------------------------------------------
        // PRICE FORMAT
        // -----------------------------------------------------

        const formatPrice =
          value => {
            return typeof value === "number" &&
              Number.isFinite(value)
              ? `£${value.toFixed(2)}`
              : "Unavailable";
          };

        // -----------------------------------------------------
        // CHART VALUES
        // -----------------------------------------------------

        const chartValues = {
          normal:
            signals?.normalPrice,

          current:
            signals?.currentPrice ??
            currentPriceValue,

          typical:
            signals?.typicalSalePrice,

          recent:
            signals?.recentLow
        };

        const availableChartValues =
          Object.values(chartValues)
            .filter(
              value =>
                typeof value === "number" &&
                Number.isFinite(value)
            );

        const chartMaximum =
          Math.max(
            ...availableChartValues,
            1
          );

        // -----------------------------------------------------
        // UPDATE CHART
        // -----------------------------------------------------

        Object.entries(
          chartValues
        ).forEach(
          ([key, value]) => {

            const row =
              shadowRoot.querySelector(
                `[data-chart="${key}"]`
              );

            if (!row) {
              return;
            }

            row.querySelector(
              ".chart-price"
            ).textContent =
              formatPrice(value);

            row.querySelector(
              ".chart-fill"
            ).style.width =
              typeof value === "number" &&
              Number.isFinite(value)
                ? `${Math.max(
                    5,
                    (value / chartMaximum) * 100
                  )}%`
                : "5%";
          }
        );

        // -----------------------------------------------------
        // CURRENT PRICE MARKER
        // -----------------------------------------------------

        const currentRow =
          shadowRoot.querySelector(
            '[data-chart="current"]'
          );

        if (
          currentRow &&
          typeof chartValues.current === "number"
        ) {

          currentRow.style.setProperty(
            "--marker-position",
            `${Math.max(
              0,
              Math.min(
                100,
                (chartValues.current /
                  chartMaximum) *
                  100
              )
            )}%`
          );
        }

        // -----------------------------------------------------
        // PRICEFORGE VERDICT
        // -----------------------------------------------------

        const verdictName =
          shadowRoot.querySelector(
            ".decision-name"
          );

        const confidence =
          shadowRoot.querySelector(
            ".confidence"
          );

        const verdictElement =
          shadowRoot.querySelector(
            ".verdict-text"
          );

        // -----------------------------------------------------
        // BACKEND VERDICT IS SOURCE OF TRUTH
        // -----------------------------------------------------

        const displayedVerdict =
          apiVerdict?.verdict ||
          "WAIT";

        const displayedConfidence =
          apiVerdict?.confidence ||
          "low";

        const displayedReason =
          apiVerdict?.reason ||
          "I couldn't determine whether this is a good time to buy.";

        // -----------------------------------------------------
        // VISUAL TYPE
        // -----------------------------------------------------

        const visualVerdictType =
          apiVerdict?.type ||
          (
            displayedVerdict === "BUY NOW"
              ? "historical-low"
              : displayedVerdict === "GOOD TIME"
                ? "good"
                : displayedVerdict === "IT'S FREE"
                  ? "free"
                  : "wait"
          );

        // -----------------------------------------------------
        // UPDATE VERDICT NAME
        // -----------------------------------------------------

        if (verdictName) {
          verdictName.textContent =
            displayedVerdict;
        }

        // -----------------------------------------------------
        // UPDATE CONFIDENCE
        // -----------------------------------------------------

        if (confidence) {
          confidence.textContent =
            `${displayedConfidence} confidence`;
        }

        // -----------------------------------------------------
        // UPDATE SPEECH
        // -----------------------------------------------------

        if (verdictElement) {
          verdictElement.textContent =
            displayedReason;
        }

        // -----------------------------------------------------
        // UPDATE PANEL TYPE
        // -----------------------------------------------------

        if (panel) {
          panel.dataset.type =
            visualVerdictType;
        }

        // -----------------------------------------------------
        // FREE GAME
        // -----------------------------------------------------

        if (
          visualVerdictType === "free"
        ) {

          analysis.classList.remove(
            "is-open"
          );

          analysisToggle.setAttribute(
            "aria-expanded",
            "false"
          );

          analysis.setAttribute(
            "aria-hidden",
            "true"
          );
        }

        // -----------------------------------------------------
        // DEBUG
        // -----------------------------------------------------

        console.log(
          "Current Price:",
          currentPriceValue
        );

        console.log(
          "Historical Low:",
          historicalLow
        );

        console.log(
          "Price Signals:",
          signals
        );

        console.log(
          "PriceForge Verdict:",
          apiVerdict
        );
      }
    );
  }
}
