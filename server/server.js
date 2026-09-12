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

      discount:
        Number(entry.discount) || 0
    }))

    .filter(
      entry =>
        !Number.isNaN(
          entry.timestamp.getTime()
        )
    )

    .sort(
      (a, b) =>
        a.timestamp - b.timestamp
    );


  if (observations.length < 5) {
    return { detected: false };
  }


  /*
   * We only care about the game's NORMAL price.
   */

  const normalPrices =
    observations.map(entry => ({
      timestamp:
        entry.timestamp,

      price:
        entry.price
    }));


  /*
   * Latest normal price = candidate new price.
   */

  const latestPrice =
    normalPrices[
      normalPrices.length - 1
    ].price;


  /*
   * Find observations that match latest price.
   */

  const recentMatches =
    normalPrices.filter(
      entry =>
        Math.abs(entry.price - latestPrice) /
          latestPrice <=
        0.05
    );


  if (recentMatches.length < 1) {
    return { detected: false };
  }


  /*
   * Find previous price regime.
   */

  let changeIndex = -1;


  for (
    let i = normalPrices.length - 2;
    i >= 2;
    i--
  ) {

    const price =
      normalPrices[i].price;


    const difference =
      Math.abs(price - latestPrice) /
      latestPrice;


    if (difference > 0.05) {

      changeIndex =
        i + 1;

      break;
    }
  }


  if (changeIndex === -1) {
    return { detected: false };
  }


  /*
   * Everything before the change represents the
   * old normal price.
   */

  const oldObservations =
    normalPrices.slice(
      0,
      changeIndex
    );


  if (oldObservations.length < 3) {
    return { detected: false };
  }


  /*
   * Determine established old normal price.
   */

  const counts = new Map();


  for (const observation of oldObservations) {

    const rounded =
      Number(
        observation.price.toFixed(2)
      );


    counts.set(
      rounded,
      (counts.get(rounded) || 0) + 1
    );
  }


  const oldNormalPrice =
    [...counts.entries()]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )[0]?.[0];


  if (!Number.isFinite(oldNormalPrice)) {
    return { detected: false };
  }


  /*
   * Make sure old price was actually established.
   */

  const oldMatches =
    oldObservations.filter(
      observation =>
        Math.abs(
          observation.price -
          oldNormalPrice
        ) /
          oldNormalPrice <=
        0.05
    );


  if (oldMatches.length < 3) {
    return { detected: false };
  }


  /*
   * Calculate size of price change.
   */

  const changePercent =
    (
      (latestPrice -
        oldNormalPrice) /
      oldNormalPrice
    ) *
    100;


  /*
   * Ignore ordinary fluctuations.
   */

  if (Math.abs(changePercent) < 15) {
    return { detected: false };
  }


  return {

    detected:
      true,

    oldNormalPrice:
      Number(
        oldNormalPrice.toFixed(2)
      ),

    newNormalPrice:
      Number(
        latestPrice.toFixed(2)
      ),

    changePercent:
      Number(
        changePercent.toFixed(2)
      ),

    changeDate:
      normalPrices[
        changeIndex
      ].timestamp.toISOString()

  };
}


// =========================================================
// SALE FREQUENCY DETECTION
// =========================================================

function detectSaleFrequency(
  salePeriods,
  averageDaysBetweenSales
) {

  if (
    !Array.isArray(salePeriods) ||
    salePeriods.length < 2 ||
    !Number.isFinite(averageDaysBetweenSales) ||
    averageDaysBetweenSales <= 0
  ) {

    return {

      classification:
        "unknown",

      label:
        null,

      salesObserved:
        Array.isArray(salePeriods)
          ? salePeriods.length
          : 0,

      averageDaysBetweenSales:
        null
    };
  }


  let classification;
  let label;


  if (averageDaysBetweenSales < 20) {

    classification =
      "very-frequent";

    label =
      "This game goes on sale very often.";

  } else if (averageDaysBetweenSales < 45) {

    classification =
      "frequent";

    label =
      "This game goes on sale frequently.";

  } else if (averageDaysBetweenSales < 90) {

    classification =
      "occasional";

    label =
      "This game goes on sale occasionally.";

  } else {

    classification =
      "rare";

    label =
      "This game rarely goes on sale.";
  }


  return {

    classification,

    label,

    salesObserved:
      salePeriods.length,

    averageDaysBetweenSales:
      Number(
        averageDaysBetweenSales.toFixed(1)
      )
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

      saleFrequency: null,

      daysSinceLastSale: null,

      timesBelowCurrentPrice: 0,

      percentBelowAverage: null,

      percentAboveTypicalSale: null,

      percentAboveRecentLow: null,

      lastSaleLow: null,

      priceRegimeChange: null

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

      saleFrequency: null,

      daysSinceLastSale: null,

      timesBelowCurrentPrice: 0,

      percentBelowAverage: null,

      percentAboveTypicalSale: null,

      percentAboveRecentLow: null,

      lastSaleLow: null,

      priceRegimeChange: null

    };
  }


  // =======================================================
  // BASIC PRICE DATA
  // =======================================================

  const prices =
    validHistory.map(
      entry =>
        entry.price
    );


  const averagePrice =
    prices.reduce(
      (sum, price) =>
        sum + price,
      0
    ) /
    prices.length;


  // =======================================================
  // NORMAL / FULL PRICE
  // =======================================================

  const regularPrices =
    validHistory

      .map(
        entry =>
          entry.regularPrice
      )

      .filter(
        price =>
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

          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }

          return (
            Number(b[0]) -
            Number(a[0])
          );
        }
      );


    if (
      sortedRegularPrices.length > 0
    ) {

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
      entry =>
        entry.discount > 0
    );


  const salePrices =
    saleEntries.map(
      entry =>
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

            if (b[1] !== a[1]) {
              return b[1] - a[1];
            }

            return (
              Number(a[0]) -
              Number(b[0])
            );
          }
        );


    if (
      sortedSalePrices.length > 0
    ) {

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
        entry =>
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
  // SALE FREQUENCY
  // =======================================================

  const saleFrequency =
    detectSaleFrequency(
      salePeriods,
      averageDaysBetweenSales
    );


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
          price =>
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
          ) /
          averagePrice
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
          ) /
          typicalSalePrice
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
          ) /
          recentLow
        ) *
        100

      : null;


  console.log(
    "========== VALHEIM HISTORY DEBUG =========="
  );

  console.table(
    validHistory.map(entry => ({

      date:
        new Date(
          entry.timestamp
        )
        .toISOString()
        .slice(0, 10),

      price:
        entry.price,

      regularPrice:
        entry.regularPrice,

      discount:
        entry.discount

    }))
  );

  console.log(
    "History count:",
    validHistory.length
  );

  console.log(
    "==========================================="
  );


  const priceRegimeChange =
    detectPriceRegimeChange(
      validHistory
    );


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

    saleFrequency,

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

function generatePriceVerdict(currentPrice, signals = null) {

    // Support both:
    // generatePriceVerdict(currentPrice, signals)
    // and:
    // generatePriceVerdict(signals)

    if (signals === null) {
        signals = currentPrice;
        currentPrice = signals?.currentPrice;
    }

    const {
        normalPrice,
        averagePrice,
        typicalSalePrice,
        recentLow,
        recentLowEntry,
        timesOnSale,
        daysSinceLastSale,
        lastSaleLow,
        lastSalePeriod,
        saleFrequency,
        priceRegimeChange,
        percentAboveRecentLow,
        percentBelowAverage,
        timesBelowCurrentPrice
    } = signals;

    // ---------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------

    const validNumber = value =>
        typeof value === "number" && Number.isFinite(value);

    const money = value =>
        validNumber(value)
            ? `£${value.toFixed(2)}`
            : null;

    const formatTimeSince = days => {
        if (!validNumber(days)) return "a while ago";

        if (days <= 1) return "yesterday";
        if (days < 7) return `${Math.round(days)} days ago`;
        if (days < 14) return "just over a week ago";
        if (days < 30) return `about ${Math.round(days / 7)} weeks ago`;
        if (days < 60) return "over a month ago";

        return `about ${Math.round(days / 30)} months ago`;
    };

    // ---------------------------------------------------------
    // FREE
    // ---------------------------------------------------------

    if (currentPrice === 0) {
        return {
            verdict: "IT'S FREE",
            type: "free",
            confidence: "high",
            reason:
                "The game is currently free, so there's no reason to wait."
        };
    }

    // ---------------------------------------------------------
    // NO CURRENT PRICE
    // ---------------------------------------------------------

    if (!validNumber(currentPrice)) {
        return {
            verdict: "FAIR PRICE",
            type: "fair",
            confidence: "low",
            reason:
                "I can't reliably compare the current price with the game's history, so I'd wait until the price data is available."
        };
    }

    // ---------------------------------------------------------
    // PRICE REGIME CHANGE
    // ---------------------------------------------------------

    if (
        priceRegimeChange &&
        validNumber(priceRegimeChange.changePercent)
    ) {
        const change = priceRegimeChange.changePercent;

        if (change >= 15) {
            return {
                verdict: "WAIT",
                type: "wait",
                confidence: "high",
                reason:
                    `The game's normal price has increased from ${money(priceRegimeChange.oldNormalPrice)} to ${money(priceRegimeChange.newNormalPrice)}. ` +
                    `I'd wait for a sale rather than buying at the new higher price.`
            };
        }
    }

    // ---------------------------------------------------------
    // SIGNALS
    // ---------------------------------------------------------

    const hasTypicalSale =
        validNumber(typicalSalePrice) &&
        typicalSalePrice > 0;

    const hasNormalPrice =
        validNumber(normalPrice) &&
        normalPrice > 0;

    const hasRecentLow =
        validNumber(recentLow) &&
        recentLow > 0;

    const hasLastSale =
        validNumber(lastSaleLow) &&
        lastSaleLow > 0;

    const hasDaysSinceLastSale =
        validNumber(daysSinceLastSale);

    const recentLowWasSale =
        recentLowEntry &&
        validNumber(recentLowEntry.discount) &&
        recentLowEntry.discount > 0;

    const atRecentLow =
        hasRecentLow &&
        validNumber(percentAboveRecentLow) &&
        percentAboveRecentLow <= 0.01;

    const atGenuineRecentSaleLow =
        atRecentLow &&
        recentLowWasSale;

    // ---------------------------------------------------------
    // CURRENT VS NORMAL
    // ---------------------------------------------------------

    const currentBelowNormal =
        hasNormalPrice &&
        currentPrice < normalPrice;

    const normalPriceSaving =
        currentBelowNormal
            ? normalPrice - currentPrice
            : 0;

    const normalPriceSavingPercent =
        currentBelowNormal
            ? (normalPriceSaving / normalPrice) * 100
            : 0;

    // ---------------------------------------------------------
    // CURRENT VS TYPICAL SALE
    // ---------------------------------------------------------

    const potentialSaving =
        hasTypicalSale &&
        currentPrice > typicalSalePrice
            ? currentPrice - typicalSalePrice
            : 0;

    const potentialSavingPercent =
        hasTypicalSale &&
        currentPrice > 0
            ? (potentialSaving / currentPrice) * 100
            : 0;

    const salePremiumPercent =
        hasTypicalSale &&
        typicalSalePrice > 0
            ? ((currentPrice - typicalSalePrice) / typicalSalePrice) * 100
            : null;

    const saleSavingPercentOfCurrent =
    hasTypicalSale && currentPrice > 0
        ? ((currentPrice - typicalSalePrice) / currentPrice) * 100
        : 0;

    const salesAreFrequent =
        saleFrequency?.classification === "very-frequent" ||
        saleFrequency?.classification === "frequent";

    // ---------------------------------------------------------
    // RECENCY
    // ---------------------------------------------------------

    const lastSaleVeryRecent =
        hasDaysSinceLastSale &&
        daysSinceLastSale <= 30;

    const lastSaleRecent =
        hasDaysSinceLastSale &&
        daysSinceLastSale <= 90;

    const lastSaleOld =
        hasDaysSinceLastSale &&
        daysSinceLastSale > 90;

    // =========================================================
    // 1. BUY NOW
    // Genuine recent sale low
    // =========================================================

    if (atGenuineRecentSaleLow) {
        return {
            verdict: "BUY NOW",
            type: "historical-low",
            confidence: "high",
            reason:
                `You're currently at ${money(currentPrice)}, matching the lowest recent sale price we've seen. ` +
                `This is a genuine sale low, so I'd buy it now rather than waiting.`
        };
    }

    // =========================================================
    // 2. BUY NOW
    // At or below typical sale price
    // =========================================================

    if (
        hasTypicalSale &&
        currentPrice <= typicalSalePrice
    ) {
        return {
            verdict: "BUY NOW",
            type: "historical-low",
            confidence: "high",
            reason:
                `You're paying ${money(currentPrice)}, which is at or below the game's typical sale price of ${money(typicalSalePrice)}. ` +
                `That's a strong buying opportunity, so I'd buy it now.`
        };
    }

    // ---------------------------------------------------------
    // FREQUENT SALES + LARGE SAVING
    // ---------------------------------------------------------
    // If the game regularly goes much cheaper, there is little
    // reason to pay today's price and hope for another sale.
    //
    // Example:
    // Current: £4.79
    // Typical sale: £0.62
    // Saving: £4.17 / ~87%
    // Sales: frequent
    //
    // → WAIT
    // ---------------------------------------------------------

    if (
        hasTypicalSale &&
        currentPrice > typicalSalePrice &&
        salesAreFrequent &&
        saleSavingPercentOfCurrent >= 50
    ) {
        return {
            verdict: "WAIT",
            type: "wait",
            confidence: "high",
            reason:
                `This game regularly drops to around ${money(typicalSalePrice)}, compared with ${money(currentPrice)} today. ` +
                `That's a saving of ${money(potentialSaving)}, or around ${Math.round(saleSavingPercentOfCurrent)}% off the current price. ` +
                `Because sales happen frequently, I'd wait for the next one.`
        };
    }

    // =========================================================
    // 3. FAIR PRICE
    // Current price is the recent low, but the low wasn't
    // actually a sale.
    // =========================================================

    if (
        atRecentLow &&
        !recentLowWasSale &&
        (
            !hasDaysSinceLastSale ||
            daysSinceLastSale > 90
        )
    ) {
        return {
            verdict: "FAIR PRICE",
            type: "fair",
            confidence: "medium",
            reason:
                `The current price of ${money(currentPrice)} is the lowest we've seen recently, but that price isn't coming from a recent sale. ` +
                `I'd consider this a fair price if you want the game now, rather than waiting indefinitely for a discount.`
        };
    }

    // =========================================================
    // 4. STRONG WAIT
    //
    // A VERY large saving can justify waiting even when the
    // last sale wasn't recent.
    //
    // £60 current / £30 typical = £30 saving
    // £50 current / £20 typical = £30 saving
    //
    // This is different from simply saying "2x the sale price".
    // We're looking at the actual money the user could save.
    // =========================================================

    if (
        hasTypicalSale &&
        potentialSaving >= 20
    ) {
        return {
            verdict: "WAIT",
            type: "wait",
            confidence: "high",
            reason:
                `The game usually drops to around ${money(typicalSalePrice)} during sales, but it's currently ${money(currentPrice)}. ` +
                `You could save around ${money(potentialSaving)} by waiting. I'd wait for a sale.`
        };
    }

    // =========================================================
    // 5. WAIT
    //
    // A meaningful saving combined with a RECENT sale is strong
    // evidence that waiting is worthwhile.
    // =========================================================

    if (
        hasTypicalSale &&
        lastSaleRecent &&
        potentialSaving >= 10
    ) {
        return {
            verdict: "WAIT",
            type: "wait",
            confidence: "high",
            reason:
                `The game was around ${money(typicalSalePrice)} during its recent sale ${formatTimeSince(daysSinceLastSale)}. ` +
                `You could save about ${money(potentialSaving)} by waiting for another one. I'd wait.`
        };
    }

    // =========================================================
    // 6. WAIT
    //
    // Very recent sale + meaningful percentage saving.
    //
    // Example:
    // £40 current
    // £30 sale
    // £10 saving / 25%
    //
    // Recent enough to make waiting worthwhile.
    // =========================================================

    if (
        hasTypicalSale &&
        lastSaleVeryRecent &&
        potentialSaving >= 7.50 &&
        potentialSavingPercent >= 20
    ) {
        return {
            verdict: "WAIT",
            type: "wait",
            confidence: "high",
            reason:
                `The game was around ${money(typicalSalePrice)} ${formatTimeSince(daysSinceLastSale)}, and it's ${money(currentPrice)} today. ` +
                `That's ${money(potentialSaving)} more than its recent sale price. I'd wait for another sale.`
        };
    }

    // =========================================================
    // 7. GOOD PRICE
    // Meaningfully below normal price
    // =========================================================

    if (
        currentBelowNormal &&
        normalPriceSaving >= 5 &&
        normalPriceSavingPercent >= 10
    ) {
        return {
            verdict: "GOOD PRICE",
            type: "good",
            confidence: "medium",
            reason:
                `You're paying ${money(normalPriceSaving)} less than the game's normal price of ${money(normalPrice)}. ` +
                `It isn't necessarily the lowest price we've seen, but this is still a good price to buy at.`
        };
    }

    // =========================================================
    // 8. GOOD PRICE
    // Rarely on sale + currently below normal
    // =========================================================

    if (
        saleFrequency?.classification === "rare" &&
        currentBelowNormal &&
        normalPriceSaving >= 3 &&
        normalPriceSavingPercent >= 7
    ) {
        return {
            verdict: "GOOD PRICE",
            type: "good",
            confidence: "medium",
            reason:
                `This game doesn't go on sale very often, and you're currently paying ${money(normalPriceSaving)} less than its normal price. ` +
                `I'd be comfortable buying it at this price rather than waiting indefinitely for a sale.`
        };
    }

    // =========================================================
    // 9. GOOD PRICE
    // Recent sale, but the potential saving is too small to
    // strongly recommend waiting.
    // =========================================================

    if (
        hasLastSale &&
        lastSaleRecent &&
        currentPrice > lastSaleLow
    ) {
        const saving =
            currentPrice - lastSaleLow;

        const savingPercent =
            (saving / currentPrice) * 100;

        if (
            savingPercent < 20 ||
            (saving < 10 && savingPercent < 25)
        ) {
            return {
                verdict: "GOOD PRICE",
                type: "good",
                confidence: "medium",
                reason:
                    `The game was ${money(lastSaleLow)} ${formatTimeSince(daysSinceLastSale)}, so it has been a little cheaper recently. ` +
                    `The difference is small enough that I'd be comfortable buying at ${money(currentPrice)}.`
            };
        }
    }

    // =========================================================
    // 10. FAIR PRICE
    //
    // This is now the important middle ground.
    //
    // If the game is more expensive than its typical sale,
    // but the actual saving isn't significant enough to tell
    // someone to wait, we call it FAIR PRICE.
    // =========================================================

    if (
        hasTypicalSale &&
        potentialSaving > 0
    ) {
        // Small saving
        if (potentialSaving < 10) {
            return {
                verdict: "FAIR PRICE",
                type: "fair",
                confidence: "medium",
                reason:
                    `The game last dropped to ${money(typicalSalePrice)} ${hasDaysSinceLastSale ? formatTimeSince(daysSinceLastSale) : "during a sale"}. ` +
                    `You could save ${money(potentialSaving)} by waiting, but that's not enough for me to strongly recommend holding off. ` +
                    `I'd consider ${money(currentPrice)} a fair price if you want to play it now.`
            };
        }

        // £10–£20 saving, but the sale is old and there is
        // no strong evidence that waiting is worthwhile.
        if (
            potentialSaving < 20 &&
            lastSaleOld
        ) {
            return {
                verdict: "FAIR PRICE",
                type: "fair",
                confidence: "medium",
                reason:
                    `The game has been as low as ${money(typicalSalePrice)}, but that sale was ${formatTimeSince(daysSinceLastSale)}. ` +
                    `You could save ${money(potentialSaving)} by waiting, but there's no strong indication of when the next sale will arrive. ` +
                    `I'd consider ${money(currentPrice)} a fair price if you want it now.`
            };
        }
    }

    // =========================================================
    // 11. FAIR PRICE
    // Current price is close to typical sale price
    // =========================================================

    if (
        hasTypicalSale &&
        salePremiumPercent < 25
    ) {
        const difference =
            Math.max(0, currentPrice - typicalSalePrice);

        return {
            verdict: "FAIR PRICE",
            type: "fair",
            confidence: "medium",
            reason:
                `The game usually drops to around ${money(typicalSalePrice)} during sales, and it's currently ${money(currentPrice)}. ` +
                `The difference isn't large enough to make waiting an obvious choice, so I'd consider this a fair price to buy at.`
        };
    }

    // =========================================================
    // 12. FAIR PRICE
    // Normal price with no meaningful sale history
    // =========================================================

    if (
        hasNormalPrice &&
        Math.abs(currentPrice - normalPrice) < 0.01 &&
        !hasTypicalSale
    ) {
        return {
            verdict: "FAIR PRICE",
            type: "fair",
            confidence: "medium",
            reason:
                `The game is currently at its normal price of ${money(currentPrice)}. ` +
                `There isn't a meaningful sale price to chase, so I'd consider this a fair price if you want to play it now.`
        };
    }

    // =========================================================
    // 13. GOOD PRICE
    // Slightly above typical sale price
    // =========================================================

    if (
        hasTypicalSale &&
        currentPrice > typicalSalePrice
    ) {
        const difference =
            currentPrice - typicalSalePrice;

        if (difference <= 2) {
            return {
                verdict: "GOOD PRICE",
                type: "good",
                confidence: "medium",
                reason:
                    `The game usually drops to around ${money(typicalSalePrice)} during sales, and you're only ${money(difference)} above that today. ` +
                    `I'd be comfortable buying at this price rather than waiting for a small saving.`
            };
        }
    }

    // =========================================================
    // 14. FAIR PRICE
    // Close to normal price
    // =========================================================

    if (
        hasNormalPrice &&
        currentPrice <= normalPrice * 1.10
    ) {
        return {
            verdict: "FAIR PRICE",
            type: "fair",
            confidence: "medium",
            reason:
                `The current price of ${money(currentPrice)} is close to the game's normal price of ${money(normalPrice)}. ` +
                `It's not a standout deal, but I'd consider it a fair price if you want to play it now.`
        };
    }

    // =========================================================
    // 15. FINAL FALLBACK
    // =========================================================

    return {
        verdict: "FAIR PRICE",
        type: "fair",
        confidence: "medium",
        reason:
            `At ${money(currentPrice)}, this looks like a reasonable price based on the game's available price history. ` +
            `I'd consider buying if you want to play it now rather than waiting for an uncertain discount.`
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
          low =>
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
              entry =>
                entry.shop.id === 61
            )

          : [];


      // ===================================================
      // CREATE CLEAN HISTORY
      // ===================================================

      const priceHistory =
        steamHistory.map(
          entry => ({

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

      const newestHistoryEntry =
        [...priceHistory]

          .filter(
            entry =>
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