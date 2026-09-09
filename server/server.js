require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
const PORT = 3000;

app.get("/api/game/:appId", async (req, res) => {
  const { appId } = req.params;

  try {
    // Find the ITAD game using the Steam App ID
    const lookupResponse = await fetch(
      `https://api.isthereanydeal.com/games/lookup/v1?key=${process.env.ITAD_API_KEY}&appid=${appId}`
    );

    const lookupData = await lookupResponse.json();

    if (!lookupData.found) {
      return res.status(404).json({
        error: "Game not found"
      });
    }

    const gameId = lookupData.game.id;

        // Get Steam's all-time historical low
            const historyResponse = await fetch(
            `https://api.isthereanydeal.com/games/storelow/v2?key=${process.env.ITAD_API_KEY}&country=GB&shops=61`,
            {
                method: "POST",
                headers: {
                "Content-Type": "application/json"
                },
                body: JSON.stringify([gameId])
            }
            );

            const historyData = await historyResponse.json();
            

    const steamLow = historyData?.[0]?.lows?.find(
    (low) => low.shop.id === 61
    );

    res.json({
    game: {
        id: lookupData.game.id,
        title: lookupData.game.title,
        slug: lookupData.game.slug
    },
    historicalLow: steamLow
        ? {
            price: steamLow.price.amount,
            currency: steamLow.price.currency,
            discount: steamLow.cut,
            timestamp: steamLow.timestamp
        }
        : null
    });

  } catch (error) {
    console.error("ITAD ERROR:",error);
    res.status(500).json({
      error: "Failed to contact ITAD",
      details: error.message    
    });
  }
});

app.listen(PORT, () => {
  console.log(`PriceForge API running on http://localhost:${PORT}`);
});