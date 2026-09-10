chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "getGameData") {
    return;
  }

  fetch(`http://localhost:3000/api/game/${message.appId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return response.json();
    })
    .then(data => {
      sendResponse({
        success: true,
        data
      });
    })
    .catch(error => {
      console.error("PriceForge background API error:", error);

      sendResponse({
        success: false,
        error: error.message
      });
    });

  return true;
});