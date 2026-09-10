require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

const PORT = 3000;

function detectSalePeriods(priceHistory) {

  const sortedHistory = priceHistory
    .filter((entry) => typeof entry.price === "number")
    .sort(
      (a, b) =>
        new Date(a.timestamp) -
        new Date(b.timestamp)
    );

  const salePeriods = [];

  let currentSale = null;


  // =======================================================
  // WALK THROUGH PRICE HISTORY
  // =======================================================

  for (const entry of sortedHistory) {

    const isSale = entry.discount > 0;


    // -------------------------------------------------------
    // SALE STARTED
    // -------------------------------------------------------

    if (isSale && !currentSale) {

      currentSale = {
        startTimestamp: entry.timestamp,
        startPrice: entry.price,
        lowestPrice: entry.price,
        highestPrice: entry.price,
        discount: entry.discount
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

      salePeriods.push(currentSale);

      currentSale = null;
    }
  }


  // =======================================================
  // HANDLE SALE STILL ACTIVE
  // =======================================================

  if (currentSale) {

    currentSale.endTimestamp = null;

    salePeriods.push(currentSale);
  }


  return salePeriods;
}


// =========================================================
// PRICE SIGNAL CALCULATOR
// =========================================================

function calculatePriceSignals(priceHistory, currentPrice, historicalLow) {

  // =======================================================
  // CLEAN AND SORT HISTORY
  // =======================================================

  const validHistory = priceHistory
    .filter((entry) => typeof entry.price === "number")
    .sort(
      (a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

  if (validHistory.length === 0) {
    return null;
  }


  // =======================================================
  // BASIC PRICE STATISTICS
  // =======================================================

  const prices = validHistory.map(
    (entry) => entry.price
  );

  const recentLow = Math.min(...prices);

  const averagePrice =
    prices.reduce(
      (sum, price) => sum + price,
      0
    ) / prices.length;


  // =======================================================
  // SALE HISTORY
  // =======================================================

  const saleEntries = validHistory.filter(
    (entry) => entry.discount > 0
  );

  const salePrices = saleEntries.map(
    (entry) => entry.price
  );


  // =======================================================
  // DETECT ACTUAL SALE PERIODS
  // =======================================================

  const salePeriods =
    detectSalePeriods(validHistory);


  // =======================================================
  // SALE PRICE RANGE
  // =======================================================

  const lowestSalePrice =
    salePrices.length > 0
      ? Math.min(...salePrices)
      : null;

  const highestSalePrice =
    salePrices.length > 0
      ? Math.max(...salePrices)
      : null;


  // =======================================================
  // TYPICAL SALE PRICE
  // =======================================================
  //
  // Rather than averaging sale prices, use the
  // most frequently occurring sale price.
  //
  // This answers:
  //
  // "What price does this game normally reach
  // when it goes on sale?"
  // =======================================================

  let typicalSalePrice = null;

  if (salePrices.length > 0) {

    const priceCounts = {};

    for (const price of salePrices) {

      const key = price.toFixed(2);

      priceCounts[key] =
        (priceCounts[key] || 0) + 1;
    }

    const mostCommonPrice =
      Object.entries(priceCounts)
        .sort((a, b) => b[1] - a[1])[0];

    typicalSalePrice =
      mostCommonPrice
        ? Number(mostCommonPrice[0])
        : null;
  }


  // =======================================================
  // SALE FREQUENCY
  // =======================================================

  const timesOnSale =
  salePeriods.length;

  // =======================================================
  // SALE FREQUENCY
  // =======================================================

const saleIntervals = [];

for (let i = 1; i < salePeriods.length; i++) {

  const previousSale =
    new Date(
      salePeriods[i - 1].startTimestamp
    ).getTime();

  const currentSale =
    new Date(
      salePeriods[i].startTimestamp
    ).getTime();

  const daysBetween =
    Math.round(
      (
        currentSale -
        previousSale
      ) /
        (1000 * 60 * 60 * 24)
    );

  saleIntervals.push(daysBetween);
}


const averageDaysBetweenSales =
  saleIntervals.length > 0
    ? saleIntervals.reduce(
        (sum, days) => sum + days,
        0
      ) / saleIntervals.length
    : null;


  // =======================================================
  // TIMES PRICE WAS BELOW TODAY
  // =======================================================

  const timesBelowCurrentPrice =
    validHistory.filter(
      (entry) =>
        entry.price < currentPrice
    ).length;


  // =======================================================
  // MOST RECENT LOW
  // =======================================================

  const recentLowEntries =
    validHistory.filter(
      (entry) =>
        entry.price === recentLow
    );

  const recentLowEntry =
    recentLowEntries[
      recentLowEntries.length - 1
    ];


  // =======================================================
  // DAYS SINCE RECENT LOW
  // =======================================================

  const daysSinceRecentLow =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          new Date(
            recentLowEntry.timestamp
          ).getTime()
        ) /
          (1000 * 60 * 60 * 24)
      )
    );


  // =======================================================
// MOST RECENT SALE
// =======================================================

  const lastSalePeriod =
    salePeriods.length > 0
      ? salePeriods[salePeriods.length - 1]
      : null;


  const daysSinceLastSale =
    lastSalePeriod
      ? Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              new Date(
                lastSalePeriod.startTimestamp
              ).getTime()
            ) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;


  // =======================================================
  // SALE RANGE
  // =======================================================

  const saleRange =
    lowestSalePrice !== null &&
    highestSalePrice !== null
      ? highestSalePrice -
        lowestSalePrice
      : null;


  // =======================================================
  // PRICE COMPARISONS
  // =======================================================

  const percentAboveRecentLow =
    recentLow > 0
      ? (
          (currentPrice - recentLow) /
          recentLow
        ) * 100
      : null;


  const percentBelowAverage =
    averagePrice > 0
      ? (
          (averagePrice - currentPrice) /
          averagePrice
        ) * 100
      : null;


  const percentAboveHistoricalLow =
    historicalLow?.price > 0
      ? (
          (currentPrice -
            historicalLow.price) /
          historicalLow.price
        ) * 100
      : null;


  // =======================================================
  // CURRENT PRICE VS TYPICAL SALE
  // =======================================================

  const percentAboveTypicalSale =
    typicalSalePrice !== null &&
    typicalSalePrice > 0
      ? (
          (currentPrice -
            typicalSalePrice) /
          typicalSalePrice
        ) * 100
      : null;

  return {

    currentPrice,

    // General price position
    recentLow,
    averagePrice,

    // Sale intelligence
    typicalSalePrice,
    lowestSalePrice,
    highestSalePrice,
    saleRange,

    timesOnSale,
    saleIntervals,
    averageDaysBetweenSales,
    daysSinceLastSale,

    // Current price context
    timesBelowCurrentPrice,
    percentAboveRecentLow,
    percentBelowAverage,
    percentAboveTypicalSale,
    percentAboveHistoricalLow,

    // Recent low information
    daysSinceRecentLow,

    recentLowEntry: {
      price: recentLowEntry.price,
      timestamp: recentLowEntry.timestamp,
      discount: recentLowEntry.discount
    },

    // Most recent sale
    lastSale: lastSalePeriod
    ? {
        price: lastSalePeriod.lowestPrice,
        timestamp: lastSalePeriod.startTimestamp,
        discount: lastSalePeriod.discount
      }
    : null
  };
}

// =======================================================
  // RETURN PRICEFORGE SIGNALS
  // =======================================================

  // =========================================================
// PRICEFORGE VERDICT ENGINE
// =========================================================

function generatePriceVerdict(signals) {

  if (!signals) {
    return null;
  }


  // =======================================================
  // EXTRACT SIGNALS
  // =======================================================

  const {
    currentPrice,
    recentLow,
    averagePrice,
    typicalSalePrice,
    lowestSalePrice,
    highestSalePrice,
    timesOnSale,
    averageDaysBetweenSales,
    daysSinceLastSale,
    daysSinceRecentLow,
    percentAboveRecentLow,
    percentAboveTypicalSale,
    percentBelowAverage
  } = signals;


  // =======================================================
  // HELPER
  // =======================================================

  const money = (value) => {

    if (value === null || value === undefined) {
      return null;
    }

    return `£${value.toFixed(2)}`;
  };


  // =======================================================
  // BASIC PRICE STATES
  // =======================================================

  const atRecentLow =
    percentAboveRecentLow !== null &&
    percentAboveRecentLow <= 0;

  const atTypicalSalePrice =
    percentAboveTypicalSale !== null &&
    Math.abs(percentAboveTypicalSale) < 0.01;

  const belowTypicalSale =
    percentAboveTypicalSale !== null &&
    percentAboveTypicalSale < -5;

  const veryCloseToTypicalSale =
  percentAboveTypicalSale !== null &&
  percentAboveTypicalSale >= 0 &&
  percentAboveTypicalSale <= 5;

  const moderatelyAboveTypicalSale =
    percentAboveTypicalSale !== null &&
    percentAboveTypicalSale > 5 &&
    percentAboveTypicalSale < 20;

  const aboveTypicalSale =
    percentAboveTypicalSale !== null &&
    percentAboveTypicalSale > 0;

  const significantlyAboveTypicalSale =
    percentAboveTypicalSale !== null &&
    percentAboveTypicalSale >= 20;


  // =======================================================
  // BUY NOW
  // =======================================================
  //
  // Current price is at the recent low and matches the
  // established sale price.
  // =======================================================

  if (
    atRecentLow &&
    atTypicalSalePrice
  ) {

    let reason =
      `${money(currentPrice)} looks like the price to beat. `;


    if (
      timesOnSale >= 2 &&
      lowestSalePrice === highestSalePrice
    ) {

      reason +=
        `The last ${timesOnSale} sales have all dropped to exactly ${money(typicalSalePrice)}, and you're currently at that price. `;

    } else {

      reason +=
        `You're currently at the lowest recent price, and this is also the price the game normally reaches during sales. `;
    }


    if (
      averageDaysBetweenSales !== null &&
      averageDaysBetweenSales > 0 &&
      daysSinceLastSale !== null &&
      daysSinceLastSale < averageDaysBetweenSales
    ) {

      reason +=
        `I'd personally consider this a strong time to buy rather than waiting for another discount.`;

    } else {

      reason +=
        `There's little in the recent history suggesting that waiting would save you much.`;
    }


    return {
      verdict: "BUY NOW",
      type: "historical-low",
      confidence: "high",
      reason
    };
  }


  // =======================================================
  // BUY NOW — BELOW TYPICAL SALE
  // =======================================================

  if (belowTypicalSale) {

    let reason =
      `This is an unusually strong price. `;


    reason +=
      `You're paying ${money(currentPrice)}, which is below the game's typical sale price of ${money(typicalSalePrice)}. `;


    if (
      lowestSalePrice !== null &&
      currentPrice <= lowestSalePrice
    ) {

      reason +=
        `It's also at the bottom of the recent sale range, so I'd be very comfortable buying at this price.`;

    } else {

      reason +=
        `Prices this low don't appear to be the norm, which makes this a particularly good opportunity.`;
    }


    return {
      verdict: "BUY NOW",
      type: "historical-low",
      confidence: "high",
      reason
    };
  }


  // =======================================================
  // GOOD TIME
  // =======================================================
  //
  // Current price is around the normal sale price and
  // substantially below the normal price level.
  // =======================================================

  if (
    atTypicalSalePrice &&
    meaningfullyBelowAverage
  ) {

    let reason =
      `${money(currentPrice)} is right around the price this game normally reaches during sales. `;


    if (
      averagePrice !== null
    ) {

      reason +=
        `That's also about ${Math.round(percentBelowAverage)}% below its recent average price. `;
    }


    if (
      lowestSalePrice !== null &&
      currentPrice > lowestSalePrice
    ) {

      reason +=
        `You have seen it cheaper at ${money(lowestSalePrice)}, but you're still getting a historically reasonable deal.`;
    } else {

      reason +=
        `I'd consider this a good time to buy if you want the game now.`;
    }


    return {
      verdict: "GOOD TIME",
      type: "excellent",
      confidence: "high",
      reason
    };
  }


  if (
  veryCloseToTypicalSale &&
  timesOnSale >= 2
) {

  const difference =
    currentPrice - typicalSalePrice;

  return {
    verdict: "GOOD TIME",
    type: "good",
    confidence: "high",
    reason:
      `£${currentPrice.toFixed(2)} is only £${difference.toFixed(2)} above this game's usual sale price of £${typicalSalePrice.toFixed(2)}. ` +
      `You've seen it reach this price repeatedly during recent sales, so while it isn't the absolute lowest price, you're already very close to the game's normal sale territory.`
  };
}

  // =======================================================
  // WAIT — SIGNIFICANTLY ABOVE TYPICAL SALE
  // =======================================================

  if (
    significantlyAboveTypicalSale
  ) {

    let reason =
      `${money(currentPrice)} is currently well above this game's typical sale price of ${money(typicalSalePrice)}. `;


    if (
      percentAboveTypicalSale !== null
    ) {

      reason +=
        `You're paying around ${Math.round(percentAboveTypicalSale)}% more than you would normally pay during a sale. `;
    }


    if (
      lowestSalePrice !== null &&
      currentPrice > lowestSalePrice
    ) {

      reason +=
        `Recent sales have reached as low as ${money(lowestSalePrice)}. `;
    }


    if (
      daysSinceLastSale !== null &&
      averageDaysBetweenSales !== null &&
      daysSinceLastSale < averageDaysBetweenSales
    ) {

      reason +=
        `The last sale was only ${daysSinceLastSale} days ago, so I'd personally wait rather than pay full price here.`;

    } else {

      reason +=
        `If you're not in a hurry, I'd wait for another discount.`;
    }


    return {
      verdict: "WAIT",
      type: "wait",
      confidence: "high",
      reason
    };
  }


  // =======================================================
  // WAIT — ABOVE TYPICAL SALE
  // =======================================================

  if (
    aboveTypicalSale
  ) {

    let reason =
      `${money(currentPrice)} is above the game's usual sale price of ${money(typicalSalePrice)}. `;


    if (
      lowestSalePrice !== null
    ) {

      reason +=
        `Recent sales have gone as low as ${money(lowestSalePrice)}, `;
    }


    if (
      highestSalePrice !== null &&
      lowestSalePrice !== null &&
      highestSalePrice !== lowestSalePrice
    ) {

      reason +=
        `with the recent sale range sitting around ${money(lowestSalePrice)}–${money(highestSalePrice)}. `;
    } else {

      reason +=
        `so there's a reasonable chance of paying less if you wait. `;
    }


    reason +=
      `If you don't need it immediately, I'd wait for another sale.`;


    return {
      verdict: "WAIT",
      type: "good",
      confidence: "medium",
      reason
    };
  }


  // =======================================================
  // GOOD TIME — BELOW AVERAGE
  // =======================================================

  if (
    percentBelowAverage !== null &&
    percentBelowAverage >= 10
  ) {

    let reason =
      `${money(currentPrice)} is currently around ${Math.round(percentBelowAverage)}% below the game's recent average price. `;


    if (
      typicalSalePrice !== null &&
      currentPrice <= typicalSalePrice
    ) {

      reason +=
        `It's also around its normal sale price, making this a reasonably good time to buy.`;

    } else {

      reason +=
        `It's not the strongest price we've seen, but it is still reasonably favourable.`;
    }


    return {
      verdict: "GOOD TIME",
      type: "good",
      confidence: "medium",
      reason
    };
  }


  // =======================================================
  // DEFAULT — WAIT
  // =======================================================

  return {

    verdict: "WAIT",

    type: "wait",

    confidence: "low",

    reason:
      `${money(currentPrice)} doesn't currently stand out as a particularly strong deal. ` +
      `I'd wait for a more meaningful discount unless you really want the game now.`
  };
}

// =========================================================
// GAME API
// =========================================================

app.get("/api/game/:appId", async (req, res) => {

  const { appId } = req.params;

  try {

    // =======================================================
    // FIND ITAD GAME USING STEAM APP ID
    // =======================================================

    const lookupResponse = await fetch(
      `https://api.isthereanydeal.com/games/lookup/v1?key=${process.env.ITAD_API_KEY}&appid=${appId}`
    );

    const lookupData =
      await lookupResponse.json();

    if (!lookupData.found) {

      return res.status(404).json({
        error: "Game not found"
      });

    }

    const gameId =
      lookupData.game.id;


    // =======================================================
    // GET STEAM ALL-TIME HISTORICAL LOW
    // =======================================================

    const historyLowResponse = await fetch(
      `https://api.isthereanydeal.com/games/storelow/v2?key=${process.env.ITAD_API_KEY}&country=GB&shops=61`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify([gameId])
      }
    );

    const historyLowData =
      await historyLowResponse.json();


    const steamLow =
      historyLowData?.[0]?.lows?.find(
        (low) => low.shop.id === 61
      );


    // =======================================================
    // GET RECENT STEAM PRICE HISTORY
    // =======================================================

    const historyResponse = await fetch(
      `https://api.isthereanydeal.com/games/history/v2?key=${process.env.ITAD_API_KEY}&country=GB&shops=61&id=${gameId}`
    );

    const historyData =
      await historyResponse.json();


    // =======================================================
    // KEEP ONLY STEAM HISTORY
    // =======================================================

    const steamHistory =
      Array.isArray(historyData)
        ? historyData.filter(
            (entry) =>
              entry.shop.id === 61
          )
        : [];


    // =======================================================
    // CREATE CLEAN PRICE HISTORY
    // =======================================================

    const priceHistory =
      steamHistory.map((entry) => ({

        timestamp:
          entry.timestamp,

        price:
          entry.deal?.price?.amount ?? null,

        regularPrice:
          entry.deal?.regular?.amount ?? null,

        discount:
          entry.deal?.cut ?? 0

      }));


    // =======================================================
    // TEMPORARY CURRENT PRICE
    // =======================================================
    //
    // For now we use the newest ITAD price.
    //
    // Later this will be replaced with the actual
    // live Steam price from content.js.
    // =======================================================

    const testCurrentPrice =
      priceHistory[0]?.price ?? null;


    // =======================================================
    // CALCULATE PRICE SIGNALS
    // =======================================================

    const priceSignals =
      calculatePriceSignals(
        priceHistory,
        testCurrentPrice,
        steamLow
      );

      const priceVerdict =
      generatePriceVerdict(priceSignals);


    // =======================================================
    // RETURN EVERYTHING PRICEFORGE NEEDS
    // =======================================================

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


  } catch (error) {

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

});


// =========================================================
// START SERVER
// =========================================================

app.listen(PORT, () => {

  console.log(
    `PriceForge API running on http://localhost:${PORT}`
  );

});