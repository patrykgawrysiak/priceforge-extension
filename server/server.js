require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = 3000;


// =========================================================
// SALE PERIOD DETECTION
// =========================================================

function detectSalePeriods(priceHistory) {

  const sortedHistory =
    priceHistory

      .filter(
        (entry) =>
          typeof entry.price === "number" &&
          Number.isFinite(entry.price)
      )

      .sort(
        (a, b) =>
          new Date(a.timestamp) -
          new Date(b.timestamp)
      );


  const salePeriods = [];

  let currentSale = null;


  for (const entry of sortedHistory) {

    const isSale =
      typeof entry.discount === "number" &&
      entry.discount > 0;


    // -------------------------------------------------------
    // SALE STARTED
    // -------------------------------------------------------

    if (isSale && !currentSale) {

      currentSale = {

        startTimestamp:
          entry.timestamp,

        startPrice:
          entry.price,

        lowestPrice:
          entry.price,

        highestPrice:
          entry.price,

        discount:
          entry.discount

      };

      continue;
    }


    // -------------------------------------------------------
    // SALE CONTINUES
    // -------------------------------------------------------

    if (isSale && currentSale) {

      currentSale.lowestPrice =
        Math.min(
          currentSale.lowestPrice,
          entry.price
        );

      currentSale.highestPrice =
        Math.max(
          currentSale.highestPrice,
          entry.price
        );

      continue;
    }


    // -------------------------------------------------------
    // SALE ENDED
    // -------------------------------------------------------

    if (!isSale && currentSale) {

      currentSale.endTimestamp =
        entry.timestamp;

      salePeriods.push(
        currentSale
      );

      currentSale = null;
    }
  }


  // -------------------------------------------------------
  // SALE STILL ACTIVE
  // -------------------------------------------------------

  if (currentSale) {

    currentSale.endTimestamp = null;

    salePeriods.push(
      currentSale
    );
  }


  return salePeriods;
}

function detectPriceRegimeChange(history) {
  if (!Array.isArray(history) || history.length < 5) {
    return { detected: false };
  }

  const observations = history
    .filter(
      entry =>
        entry &&
        entry.timestamp &&
        Number.isFinite(Number(entry.price))
    )
    .map(entry => ({
      timestamp: new Date(entry.timestamp),
      price:
        Number.isFinite(Number(entry.regularPrice))
          ? Number(entry.regularPrice)
          : Number(entry.price),
      discount: Number(entry.discount) || 0
    }))
    .filter(entry => !Number.isNaN(entry.timestamp.getTime()))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (observations.length < 5) {
    return { detected: false };
  }

  /*
   * We only care about the game's NORMAL price.
   *
   * This means:
   *
   * £15.49
   * £15.49
   * £15.49
   * £15.49
   * £23.49
   * £23.49
   *
   * rather than the actual sale prices.
   */

  const normalPrices = observations.map(entry => ({
    timestamp: entry.timestamp,
    price: entry.price
  }));

  /*
   * Look backwards from the latest price.
   *
   * The latest normal price is our candidate "new" price.
   */

  const latestPrice =
    normalPrices[normalPrices.length - 1].price;

  /*
   * Find observations that match the latest price.
   */

  const recentMatches = normalPrices.filter(
    entry =>
      Math.abs(entry.price - latestPrice) /
        latestPrice <=
      0.05
  );

  /*
   * We need at least two observations supporting the
   * new price.
   */

  if (recentMatches.length < 1) {
  return { detected: false };
}

  /*
   * Find the most recent observation belonging to the
   * previous price regime.
   */

  let changeIndex = -1;

for (let i = normalPrices.length - 2; i >= 2; i--) {
  const price = normalPrices[i].price;

  const difference =
    Math.abs(price - latestPrice) /
    latestPrice;

  if (difference > 0.05) {
    changeIndex = i + 1;
    break;
  }
}

  if (changeIndex === -1) {
    return { detected: false };
  }

  /*
   * Everything before the change should represent the
   * old normal price.
   */

  const oldObservations =
    normalPrices.slice(0, changeIndex);

  if (oldObservations.length < 3) {
    return { detected: false };
  }

  /*
   * Determine the established old normal price by taking
   * the most common value.
   */

  const counts = new Map();

  for (const observation of oldObservations) {
    const rounded =
      Number(observation.price.toFixed(2));

    counts.set(
      rounded,
      (counts.get(rounded) || 0) + 1
    );
  }

  const oldNormalPrice =
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0];

  if (!Number.isFinite(oldNormalPrice)) {
    return { detected: false };
  }

  /*
   * Make sure the old price was actually established.
   */

  const oldMatches = oldObservations.filter(
    observation =>
      Math.abs(
        observation.price - oldNormalPrice
      ) /
        oldNormalPrice <=
      0.05
  );

  if (oldMatches.length < 3) {
    return { detected: false };
  }

  /*
   * Calculate the size of the price change.
   */

  const changePercent =
    ((latestPrice - oldNormalPrice) /
      oldNormalPrice) *
    100;

  /*
   * Ignore ordinary price fluctuations.
   */

  if (Math.abs(changePercent) < 15) {
    return { detected: false };
  }

  return {
    detected: true,
    oldNormalPrice: Number(
      oldNormalPrice.toFixed(2)
    ),
    newNormalPrice: Number(
      latestPrice.toFixed(2)
    ),
    changePercent: Number(
      changePercent.toFixed(2)
    ),
    changeDate:
      normalPrices[changeIndex].timestamp.toISOString()
  };
}




// =========================================================
// PRICE SIGNAL CALCULATOR
// =========================================================

function calculatePriceSignals(
  history,
  currentPrice
) {

  if (
    !Array.isArray(history) ||
    history.length === 0
  ) {

    return {

      currentPrice,

      normalPrice: null,

      averagePrice: null,

      typicalSalePrice: null,

      lowestSalePrice: null,

      highestSalePrice: null,

      saleRange: null,

      recentLow: null,

      recentLowEntry: null,

      timesOnSale: 0,

      saleIntervals: [],

      averageDaysBetweenSales: null,

      daysSinceLastSale: null,

      timesBelowCurrentPrice: 0,

      percentBelowAverage: null,

      percentAboveTypicalSale: null,

      percentAboveRecentLow: null,

      lastSaleLow: null

    };
  }


  // =======================================================
  // CLEAN + SORT HISTORY
  // =======================================================

  const validHistory =
    history

      .filter(
        (entry) =>
          entry &&
          typeof entry.price === "number" &&
          Number.isFinite(entry.price)
      )

      .map(
        (entry) => ({

          timestamp:
            new Date(entry.timestamp),

          price:
            entry.price,

          regularPrice:
            typeof entry.regularPrice === "number"
              ? entry.regularPrice
              : null,

          discount:
            typeof entry.discount === "number"
              ? entry.discount
              : 0

        })
      )

      .filter(
        (entry) =>
          !isNaN(
            entry.timestamp.getTime()
          )
      )

      .sort(
        (a, b) =>
          a.timestamp - b.timestamp
      );


  if (validHistory.length === 0) {

    return {

      currentPrice,

      normalPrice: null,

      averagePrice: null,

      typicalSalePrice: null,

      lowestSalePrice: null,

      highestSalePrice: null,

      saleRange: null,

      recentLow: null,

      recentLowEntry: null,

      timesOnSale: 0,

      saleIntervals: [],

      averageDaysBetweenSales: null,

      daysSinceLastSale: null,

      timesBelowCurrentPrice: 0,

      percentBelowAverage: null,

      percentAboveTypicalSale: null,

      percentAboveRecentLow: null,

      lastSaleLow: null

    };
  }


  // =======================================================
  // BASIC PRICE DATA
  // =======================================================

  const prices =
    validHistory.map(
      (entry) =>
        entry.price
    );


  const averagePrice =
    prices.reduce(
      (sum, price) =>
        sum + price,
      0
    ) / prices.length;


  // =======================================================
  // NORMAL / FULL PRICE
  // =======================================================

  const regularPrices =
    validHistory

      .map(
        (entry) =>
          entry.regularPrice
      )

      .filter(
        (price) =>
          typeof price === "number" &&
          Number.isFinite(price) &&
          price > 0
      );


  let normalPrice = null;


  if (regularPrices.length > 0) {

    const regularPriceCounts = {};


    for (const price of regularPrices) {

      const roundedPrice =
        Number(
          price.toFixed(2)
        );


      regularPriceCounts[roundedPrice] =
        (
          regularPriceCounts[roundedPrice] ||
          0
        ) + 1;
    }


    const sortedRegularPrices =
      Object.entries(
        regularPriceCounts
      )

        .sort(
          (a, b) => {

            // Most frequently recorded price
            if (b[1] !== a[1]) {
              return b[1] - a[1];
            }

            // If tied, prefer higher price
            return (
              Number(b[0]) -
              Number(a[0])
            );
          }
        );


    if (sortedRegularPrices.length > 0) {

      normalPrice =
        Number(
          sortedRegularPrices[0][0]
        );
    }
  }


  // =======================================================
  // SALE HISTORY
  // =======================================================

  const saleEntries =
    validHistory.filter(
      (entry) =>
        entry.discount > 0
    );


  const salePrices =
    saleEntries.map(
      (entry) =>
        entry.price
    );


  // =======================================================
  // TYPICAL SALE PRICE
  // =======================================================

  let typicalSalePrice = null;


  if (salePrices.length > 0) {

    const counts = {};


    for (const price of salePrices) {

      const roundedPrice =
        Number(
          price.toFixed(2)
        );


      counts[roundedPrice] =
        (
          counts[roundedPrice] ||
          0
        ) + 1;
    }


    const sortedSalePrices =
      Object.entries(counts)

        .sort(
          (a, b) => {

            // Most frequently seen
            if (b[1] !== a[1]) {
              return b[1] - a[1];
            }

            // If tied, prefer cheaper
            return (
              Number(a[0]) -
              Number(b[0])
            );
          }
        );


    if (sortedSalePrices.length > 0) {

      typicalSalePrice =
        Number(
          sortedSalePrices[0][0]
        );
    }
  }


  // =======================================================
  // SALE RANGE
  // =======================================================

  const lowestSalePrice =
    salePrices.length > 0
      ? Math.min(...salePrices)
      : null;


  const highestSalePrice =
    salePrices.length > 0
      ? Math.max(...salePrices)
      : null;


  const saleRange =
    lowestSalePrice !== null &&
    highestSalePrice !== null

      ? {

          low:
            lowestSalePrice,

          high:
            highestSalePrice

        }

      : null;


  // =======================================================
  // RECENT LOW
  // =======================================================

  const recentLow =
    Math.min(
      ...prices
    );


  const recentLowEntry =
    [...validHistory]

      .reverse()

      .find(
        (entry) =>
          entry.price === recentLow
      ) || null;


  // =======================================================
  // SALE PERIODS
  // =======================================================

  const salePeriods =
    detectSalePeriods(
      validHistory
    );


  const timesOnSale =
    salePeriods.length;


  // =======================================================
  // SALE INTERVALS
  // =======================================================

  const saleIntervals = [];


  for (
    let i = 1;
    i < salePeriods.length;
    i++
  ) {

    const previousSale =
      salePeriods[i - 1];

    const currentSale =
      salePeriods[i];


    const previousEnd =
      previousSale.endTimestamp
        ? new Date(
            previousSale.endTimestamp
          )
        : null;


    const currentStart =
      currentSale.startTimestamp
        ? new Date(
            currentSale.startTimestamp
          )
        : null;


    if (
      previousEnd &&
      currentStart &&
      !isNaN(previousEnd) &&
      !isNaN(currentStart)
    ) {

      const daysBetween =
        (
          currentStart -
          previousEnd
        ) /
        (
          1000 *
          60 *
          60 *
          24
        );


      if (daysBetween >= 0) {

        saleIntervals.push(
          daysBetween
        );
      }
    }
  }


  const averageDaysBetweenSales =
    saleIntervals.length > 0

      ? saleIntervals.reduce(
          (sum, days) =>
            sum + days,
          0
        ) /
        saleIntervals.length

      : null;


  // =======================================================
  // LAST SALE
  // =======================================================

  const lastSalePeriod =
    salePeriods.length > 0

      ? salePeriods[
          salePeriods.length - 1
        ]

      : null;


  const lastSaleLow =
    lastSalePeriod?.lowestPrice ??
    null;


  let daysSinceLastSale = null;


  if (
    lastSalePeriod &&
    lastSalePeriod.endTimestamp
  ) {

    const saleEnd =
      new Date(
        lastSalePeriod.endTimestamp
      );


    if (
      !isNaN(
        saleEnd.getTime()
      )
    ) {

      daysSinceLastSale =
        (
          Date.now() -
          saleEnd.getTime()
        ) /
        (
          1000 *
          60 *
          60 *
          24
        );
    }
  }


  // =======================================================
  // CURRENT PRICE COMPARISONS
  // =======================================================

  const timesBelowCurrentPrice =
    typeof currentPrice === "number"

      ? prices.filter(
          (price) =>
            price < currentPrice
        ).length

      : 0;


  const percentBelowAverage =
    typeof currentPrice === "number" &&
    averagePrice > 0

      ? (
          (
            averagePrice -
            currentPrice
          ) / averagePrice
        ) *
        100

      : null;


  const percentAboveTypicalSale =
    typeof currentPrice === "number" &&
    typicalSalePrice !== null &&
    typicalSalePrice > 0

      ? (
          (
            currentPrice -
            typicalSalePrice
          ) / typicalSalePrice
        ) *
        100

      : null;


  const percentAboveRecentLow =
    typeof currentPrice === "number" &&
    recentLow > 0

      ? (
          (
            currentPrice -
            recentLow
          ) / recentLow
        ) *
        100

      : null;

      console.log("========== VALHEIM HISTORY DEBUG ==========");
console.table(
  validHistory.map(entry => ({
    date: new Date(entry.timestamp).toISOString().slice(0, 10),
    price: entry.price,
    regularPrice: entry.regularPrice,
    discount: entry.discount
  }))
);
console.log("History count:", validHistory.length);
console.log("===========================================");

    const priceRegimeChange = detectPriceRegimeChange(validHistory);

  // =======================================================
  // RETURN SIGNALS
  // =======================================================

  return {

    currentPrice,

    normalPrice,

    averagePrice,

    typicalSalePrice,

    lowestSalePrice,

    highestSalePrice,

    saleRange,

    recentLow,

    recentLowEntry,

    timesOnSale,

    saleIntervals,

    averageDaysBetweenSales,

    daysSinceLastSale,

    timesBelowCurrentPrice,

    percentBelowAverage,

    percentAboveTypicalSale,

    percentAboveRecentLow,

    lastSaleLow,

    priceRegimeChange

  };
}


// =========================================================
// TIME FORMATTING
// =========================================================

function formatTimeSince(days) {

  if (
    days === null ||
    days === undefined ||
    !Number.isFinite(days)
  ) {

    return null;
  }


  const rounded =
    Math.max(
      0,
      Math.round(days)
    );


  if (rounded <= 1) {
    return "yesterday";
  }


  if (rounded < 7) {
    return `${rounded} days ago`;
  }


  if (rounded < 14) {
    return "just over a week ago";
  }


  if (rounded < 30) {
    return `about ${Math.round(
      rounded / 7
    )} weeks ago`;
  }


  if (rounded < 60) {
    return "over a month ago";
  }


  return `about ${Math.round(
    rounded / 30
  )} months ago`;
}


// =========================================================
// PRICE VERDICT ENGINE
// =========================================================

function generatePriceVerdict(signals) {
  if (!signals) {
    return null;
  }

  const {
    currentPrice,
    recentLow,
    typicalSalePrice,
    lowestSalePrice,
    lastSaleLow,
    daysSinceLastSale,
    averageDaysBetweenSales,
    percentAboveRecentLow,
    priceRegimeChange
  } = signals;


  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  const validNumber = value => {
    return (
      typeof value === "number" &&
      Number.isFinite(value)
    );
  };


  const money = value => {
    if (!validNumber(value)) {
      return null;
    }

    return `£${value.toFixed(2)}`;
  };


  // ---------------------------------------------------------
  // FREE
  // ---------------------------------------------------------

  if (
    validNumber(currentPrice) &&
    currentPrice === 0
  ) {
    return {
      verdict: "IT'S FREE",
      type: "free",
      confidence: "high",
      reason: "Always better when it's free."
    };
  }


  // ---------------------------------------------------------
  // NO CURRENT PRICE
  // ---------------------------------------------------------

  if (!validNumber(currentPrice)) {
    return {
      verdict: "WAIT",
      type: "wait",
      confidence: "low",
      reason:
        "I couldn't get a reliable current price for this game."
    };
  }

  // ---------------------------------------------------------
  // PRICE REGIME CHANGE
  //
  // A recent permanent price change means older historical
  // prices should be treated with caution.
  //
  // We DO NOT immediately return a verdict here.
  // Instead, we remember that the old history is less relevant
  // and let the rest of the engine make the decision.
  // ---------------------------------------------------------

  const hasPriceRegimeChange =
    priceRegimeChange &&
    priceRegimeChange.detected;


  const priceIncreased =
    hasPriceRegimeChange &&
    priceRegimeChange.changePercent > 0;

    console.log("========== PRICE REGIME DEBUG ==========");
console.log("priceRegimeChange:", priceRegimeChange);
console.log("hasPriceRegimeChange:", hasPriceRegimeChange);
console.log("priceIncreased:", priceIncreased);
console.log("========================================");


  const newNormalPrice =
    hasPriceRegimeChange
      ? priceRegimeChange.newNormalPrice
      : null;


  const oldNormalPrice =
    hasPriceRegimeChange
      ? priceRegimeChange.oldNormalPrice
      : null;


  // ---------------------------------------------------------
  // PRICE REGIME MESSAGE
  // ---------------------------------------------------------
  //
  // If the game's normal price has increased, we don't want
  // old sale prices to automatically create a WAIT verdict.
  //
  // This flag is used later when constructing the reason.
  // ---------------------------------------------------------

  const currentPriceMatchesNewNormal =
    priceIncreased &&
    validNumber(newNormalPrice) &&
    currentPrice <=
      newNormalPrice * 1.05;


  // ---------------------------------------------------------
  // REGIME CHANGE + CURRENT PRICE IS NEW NORMAL
  //
  // Example:
  //
  // Old normal: £15.49
  // New normal: £23.49
  // Current:    £23.49
  //
  // Don't compare today's price directly against old £7.74
  // sales.
  // ---------------------------------------------------------

  if (
    currentPriceMatchesNewNormal
  ) {
    return {
      verdict: "WAIT",
      type: "wait",
      confidence: "medium",
      reason:
        `The game's normal price has recently increased, so older sales aren't a great comparison. I'd wait for a post-change sale if you're not in a rush.`
    };
  }

  // ---------------------------------------------------------
  // BASIC SIGNALS
  // ---------------------------------------------------------

  const hasTypicalSale =
    validNumber(typicalSalePrice);

  const hasLastSale =
    validNumber(lastSaleLow);

  const hasSaleFrequency =
    validNumber(averageDaysBetweenSales) &&
    averageDaysBetweenSales > 0;


  const timeSinceLastSale =
    formatTimeSince(daysSinceLastSale);


  const lastSaleSaving =
    hasLastSale &&
    lastSaleLow < currentPrice
      ? currentPrice - lastSaleLow
      : 0;


  const lastSaleSavingPercent =
    currentPrice > 0 &&
    lastSaleSaving > 0
      ? (lastSaleSaving / currentPrice) * 100
      : 0;


  // ---------------------------------------------------------
  // RECENT LOW
  // ---------------------------------------------------------

  const atRecentLow =
    validNumber(percentAboveRecentLow) &&
    percentAboveRecentLow <= 0.01;


  if (atRecentLow) {
    return {
      verdict: "BUY NOW",
      type: "historical-low",
      confidence: "high",
      reason:
        "This is the lowest recent price we've seen. I'd buy now."
    };
  }


  // ---------------------------------------------------------
  // TYPICAL SALE PRICE
  // ---------------------------------------------------------

  if (
    hasTypicalSale &&
    currentPrice <= typicalSalePrice + 0.01
  ) {
    return {
      verdict: "BUY NOW",
      type: "historical-low",
      confidence: "high",
      reason:
        `You're at the game's usual sale price of ${money(typicalSalePrice)}. I'd buy now.`
    };
  }


  // ---------------------------------------------------------
  // RECENCY
  // ---------------------------------------------------------

  const lastSaleWasVeryRecent =
    validNumber(daysSinceLastSale) &&
    daysSinceLastSale <= 14;


  const lastSaleWasRecent =
    validNumber(daysSinceLastSale) &&
    daysSinceLastSale <= 30;


  const lastSaleWasFairlyRecent =
    validNumber(daysSinceLastSale) &&
    daysSinceLastSale <= 60;


  // ---------------------------------------------------------
  // SALE FREQUENCY
  // ---------------------------------------------------------

  let saleLikelyWorthWaitingFor = false;

  if (
    hasSaleFrequency &&
    validNumber(daysSinceLastSale)
  ) {
    saleLikelyWorthWaitingFor =
      daysSinceLastSale <
      averageDaysBetweenSales;
  }


  // ---------------------------------------------------------
  // STRONG WAIT
  // ---------------------------------------------------------

  if (
    hasLastSale &&
    lastSaleWasVeryRecent &&
    lastSaleSaving >= 5 &&
    lastSaleSavingPercent >= 20
  ) {
    return {
      verdict: "WAIT",
      type: "wait",
      confidence: "high",
      reason:
        `This was ${money(lastSaleLow)} ${timeSinceLastSale}. I'd wait for another sale and potentially save ${money(lastSaleSaving)}.`
    };
  }


  // ---------------------------------------------------------
  // REGULAR SALES + RECENT CHEAPER PRICE
  // ---------------------------------------------------------

  if (
    hasLastSale &&
    hasSaleFrequency &&
    lastSaleWasRecent &&
    saleLikelyWorthWaitingFor &&
    lastSaleSaving >= 5 &&
    lastSaleSavingPercent >= 20
  ) {
    return {
      verdict: "WAIT",
      type: "wait",
      confidence: "high",
      reason:
        `This was ${money(lastSaleLow)} ${timeSinceLastSale}, and this game usually goes on sale regularly. I'd wait and potentially save ${money(lastSaleSaving)}.`
    };
  }


  // ---------------------------------------------------------
  // FAIRLY RECENT SALE + LARGE SAVING
  // ---------------------------------------------------------

  if (
    hasLastSale &&
    lastSaleWasFairlyRecent &&
    lastSaleSaving >= 10 &&
    lastSaleSavingPercent >= 25 &&
    hasSaleFrequency &&
    saleLikelyWorthWaitingFor
  ) {
    return {
      verdict: "WAIT",
      type: "wait",
      confidence: "medium",
      reason:
        `The last sale was ${money(lastSaleLow)} ${timeSinceLastSale}, and this game tends to go on sale regularly. I'd wait and potentially save ${money(lastSaleSaving)}.`
    };
  }


  // ---------------------------------------------------------
  // RECENT SALE + LARGE RELATIVE SAVING
  // ---------------------------------------------------------

  if (
    hasLastSale &&
    lastSaleWasRecent &&
    lastSaleSavingPercent >= 35
  ) {
    return {
      verdict: "WAIT",
      type: "wait",
      confidence: "high",
      reason:
        `This was ${money(lastSaleLow)} ${timeSinceLastSale}. That's a significant difference, so I'd wait for the next sale.`
    };
  }


  // ---------------------------------------------------------
  // SIGNIFICANTLY ABOVE TYPICAL SALE
  // ---------------------------------------------------------

  if (
    hasTypicalSale &&
    typicalSalePrice > 0
  ) {
    const aboveTypicalPercent =
      ((currentPrice - typicalSalePrice) /
        typicalSalePrice) * 100;


    const typicalSaleSaving =
      currentPrice - typicalSalePrice;


    if (
      aboveTypicalPercent >= 50 &&
      typicalSaleSaving >= 10
    ) {
      if (
        hasLastSale &&
        timeSinceLastSale
      ) {
        return {
          verdict: "WAIT",
          type: "wait",
          confidence: "medium",
          reason:
            `This is ${money(typicalSaleSaving)} above the game's usual sale price. It was ${money(lastSaleLow)} ${timeSinceLastSale}, so I'd wait for a better price.`
        };
      }


      return {
        verdict: "WAIT",
        type: "wait",
        confidence: "medium",
        reason:
          `You're paying ${money(typicalSaleSaving)} more than the game's usual sale price. I'd wait for a discount.`
      };
    }
  }


  // ---------------------------------------------------------
  // CHEAPER HISTORY, BUT NOT ENOUGH REASON TO WAIT
  // ---------------------------------------------------------

  if (
    hasLastSale &&
    lastSaleSaving > 0
  ) {
    if (
      lastSaleSaving < 5 ||
      lastSaleSavingPercent < 20 ||
      !lastSaleWasRecent
    ) {
      return {
        verdict: "GOOD TIME",
        type: "good",
        confidence: "medium",
        reason:
          timeSinceLastSale
            ? `The last sale was ${money(lastSaleLow)} ${timeSinceLastSale}, but the saving isn't large enough to make waiting essential.`
            : `A cheaper sale has happened before, but the saving isn't large enough to make waiting essential.`
      };
    }
  }


  // ---------------------------------------------------------
  // SLIGHTLY ABOVE TYPICAL SALE
  // ---------------------------------------------------------

  if (
    hasTypicalSale &&
    currentPrice > typicalSalePrice
  ) {
    const difference =
      currentPrice - typicalSalePrice;


    return {
      verdict: "GOOD TIME",
      type: "good",
      confidence: "medium",
      reason:
        `You're only ${money(difference)} above the game's usual sale price. It's a reasonable time to buy.`
    };
  }


  // ---------------------------------------------------------
  // FALLBACK
  // ---------------------------------------------------------

  return {
    verdict: "GOOD TIME",
    type: "good",
    confidence: "medium",
    reason:
      "This looks like a reasonable price for this game."
  };
}




// =========================================================
// GAME API
// =========================================================

app.get(
  "/api/game/:appId",
  async (req, res) => {

    const {
      appId
    } = req.params;


    try {

      // ===================================================
      // FIND GAME
      // ===================================================

      const lookupResponse =
        await fetch(
          `https://api.isthereanydeal.com/games/lookup/v1?key=${process.env.ITAD_API_KEY}&appid=${appId}`
        );


      const lookupData =
        await lookupResponse.json();


      if (
        !lookupData.found
      ) {

        return res.status(404).json({

          error:
            "Game not found"

        });
      }


      const gameId =
        lookupData.game.id;


      // ===================================================
      // STEAM ALL-TIME HISTORICAL LOW
      // ===================================================

      const historyLowResponse =
        await fetch(
          `https://api.isthereanydeal.com/games/storelow/v2?key=${process.env.ITAD_API_KEY}&country=GB&shops=61`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify([
                gameId
              ])

          }
        );


      const historyLowData =
        await historyLowResponse.json();


      const steamLow =
        historyLowData?.[0]?.lows?.find(
          (low) =>
            low.shop.id === 61
        );


      // ===================================================
      // RECENT STEAM PRICE HISTORY
      // ===================================================

      const historyResponse =
        await fetch(
          `https://api.isthereanydeal.com/games/history/v2?key=${process.env.ITAD_API_KEY}&country=GB&shops=61&id=${gameId}`
        );


      const historyData =
        await historyResponse.json();


      // ===================================================
      // KEEP ONLY STEAM
      // ===================================================

      const steamHistory =
        Array.isArray(
          historyData
        )

          ? historyData.filter(
              (entry) =>
                entry.shop.id === 61
            )

          : [];


      // ===================================================
      // CREATE CLEAN HISTORY
      // ===================================================

      const priceHistory =
        steamHistory.map(
          (entry) => ({

            timestamp:
              entry.timestamp,

            price:
              entry.deal?.price?.amount ??
              null,

            regularPrice:
              entry.deal?.regular?.amount ??
              null,

            discount:
              entry.deal?.cut ??
              0

          })
        );


      // ===================================================
      // TEMPORARY CURRENT PRICE
      // ===================================================
      //
      // IMPORTANT:
      // ITAD history is sorted newest-first in the
      // response, but we explicitly find the newest
      // timestamp rather than relying on array order.
      //
      // This will later be replaced by the live Steam
      // price supplied by content.js.
      // ===================================================

      const newestHistoryEntry =
        [...priceHistory]

          .filter(
            (entry) =>
              typeof entry.price === "number" &&
              Number.isFinite(entry.price)
          )

          .sort(
            (a, b) =>
              new Date(b.timestamp) -
              new Date(a.timestamp)
          )[0];


      const testCurrentPrice =
        newestHistoryEntry?.price ??
        null;


      // ===================================================
      // CALCULATE PRICE SIGNALS
      // ===================================================

      const priceSignals =
        calculatePriceSignals(
          priceHistory,
          testCurrentPrice
        );


      // ===================================================
      // GENERATE VERDICT
      // ===================================================

      const priceVerdict =
        generatePriceVerdict(
          priceSignals
        );


      // ===================================================
      // RETURN DATA
      // ===================================================

      res.json({

        game: {

          id:
            lookupData.game.id,

          title:
            lookupData.game.title,

          slug:
            lookupData.game.slug

        },


        historicalLow:

          steamLow

            ? {

                price:
                  steamLow.price.amount,

                currency:
                  steamLow.price.currency,

                discount:
                  steamLow.cut,

                timestamp:
                  steamLow.timestamp

              }

            : null,


        priceHistory,

        priceSignals,

        priceVerdict

      });

    }


    catch (error) {

      console.error(
        "ITAD ERROR:",
        error
      );


      res.status(500).json({

        error:
          "Failed to contact ITAD",

        details:
          error.message

      });
    }
  }
);


// =========================================================
// START SERVER
// =========================================================

app.listen(
  PORT,
  () => {

    console.log(
      `PriceForge API running on http://localhost:${PORT}`
    );

  }
);