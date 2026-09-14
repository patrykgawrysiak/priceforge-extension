chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "getGameData") return;

  fetch(`https://priceforge-extension.onrender.com/api/game/${message.appId}`)
    .then(async response => {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "API request failed");
      }

      sendResponse({
        success: true,
        data
      });
    })
    .catch(error => {
      console.error("PriceForge API error:", error);

      sendResponse({
        success: false,
        error: error.message
      });
    });

  return true;
});