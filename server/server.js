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

    lastSaleLow

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

    percentAboveRecentLow

  } = signals;


  const money =
    (value) => {

      if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
      ) {

        return null;
      }


      return `£${value.toFixed(2)}`;
    };


  // =======================================================
  // FREE TO PLAY
  // =======================================================

  if (
    typeof currentPrice === "number" &&
    currentPrice === 0
  ) {

    return {

      verdict:
        "IT'S FREE",

      type:
        "free",

      confidence:
        "high",

      reason:
        "Always better when it's free."

    };
  }


  // =======================================================
  // INVALID PRICE
  // =======================================================

  if (
    currentPrice === null ||
    currentPrice === undefined ||
    !Number.isFinite(currentPrice)
  ) {

    return {

      verdict:
        "WAIT",

      type:
        "wait",

      confidence:
        "low",

      reason:
        "I couldn't get a reliable current price for this game."

    };
  }


  // =======================================================
  // AT RECENT LOW
  // =======================================================

  const atRecentLow =
    Number.isFinite(
      percentAboveRecentLow
    ) &&
    percentAboveRecentLow <= 0.01;


  if (atRecentLow) {

    return {

      verdict:
        "BUY NOW",

      type:
        "historical-low",

      confidence:
        "high",

      reason:
        "This is the lowest price we've seen recently. I'd buy now."

    };
  }


  // =======================================================
  // AT OR BELOW TYPICAL SALE PRICE
  // =======================================================

  if (
    Number.isFinite(
      typicalSalePrice
    ) &&
    currentPrice <=
      typicalSalePrice + 0.01
  ) {

    return {

      verdict:
        "BUY NOW",

      type:
        "historical-low",

      confidence:
        "high",

      reason:
        "You're at the game's usual sale price. I'd buy now."

    };
  }


  // =======================================================
  // SLIGHTLY ABOVE TYPICAL SALE
  // =======================================================
  //
  // Being above the typical sale price doesn't automatically
  // mean the user should wait.
  //
  // Example:
  //
  // Typical sale: £2.09
  // Current:      £3.44
  //
  // That's still a very cheap price compared with the game's
  // normal price, so this should remain a GOOD TIME.
  // =======================================================

  if (
    Number.isFinite(
      typicalSalePrice
    ) &&
    currentPrice <=
      typicalSalePrice * 1.5
  ) {

    return {

      verdict:
        "GOOD TIME",

      type:
        "good",

      confidence:
        "high",

      reason:
        "You're still close to the game's usual sale price. It's a good time to buy."

    };
  }


  // =======================================================
  // SIGNIFICANTLY ABOVE TYPICAL SALE
  // =======================================================
  //
  // We only recommend waiting once the current price is
  // substantially higher than what the game normally sells
  // for during a sale.
  // =======================================================

  if (
    Number.isFinite(
      typicalSalePrice
    ) &&
    currentPrice >=
      typicalSalePrice * 2
  ) {

    const timeSinceSale =
      formatTimeSince(
        daysSinceLastSale
      );


    // -----------------------------------------------------
    // Prefer a previous sale price that is actually cheaper
    // than the current price.
    // -----------------------------------------------------

    const usefulLastSalePrice =
      Number.isFinite(lastSaleLow) &&
      lastSaleLow < currentPrice

        ? lastSaleLow

        : null;


    // -----------------------------------------------------
    // Recent completed sale with useful price
    // -----------------------------------------------------

    if (
      usefulLastSalePrice !== null &&
      timeSinceSale
    ) {

      return {

        verdict:
          "WAIT",

        type:
          "wait",

        confidence:
          "high",

        reason:
          `This game was ${money(
            usefulLastSalePrice
          )} ${timeSinceSale}. I'd wait for the next sale.`

      };
    }


    // -----------------------------------------------------
    // We have a historical sale price
    // -----------------------------------------------------

    const usefulHistoricalSale =
      Number.isFinite(lowestSalePrice) &&
      lowestSalePrice < currentPrice

        ? lowestSalePrice

        : null;


    if (
      usefulHistoricalSale !== null
    ) {

      return {

        verdict:
          "WAIT",

        type:
          "wait",

        confidence:
          "medium",

        reason:
          `Recent sales have reached ${money(
            usefulHistoricalSale
          )}. I'd wait for the next sale.`

      };
    }


    // -----------------------------------------------------
    // No useful sale history
    // -----------------------------------------------------

    return {

      verdict:
        "WAIT",

      type:
        "wait",

      confidence:
        "medium",

      reason:
        "You're paying much more than this game usually costs during sales. I'd wait for a discount."

    };
  }


  // =======================================================
  // FALLBACK
  // =======================================================

  return {

    verdict:
      "GOOD TIME",

    type:
      "good",

    confidence:
      "medium",

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