const pathParts = window.location.pathname.split("/");

const appIndex = pathParts.indexOf("app");
const appId = appIndex !== -1 ? pathParts[appIndex + 1] : null;

// Find the game title on the Steam page
const gameTitleElement = document.querySelector(".apphub_AppName");
const gameTitle = gameTitleElement
  ? gameTitleElement.textContent.trim()
  : "Unknown game";

// Find the price element on the Steam page
const purchaseArea = document.querySelector("#game_area_purchase");

const priceElement = purchaseArea
  ? purchaseArea.querySelector(".discount_final_price, .game_purchase_price")
  : null;

const originalPriceElement = purchaseArea
  ? purchaseArea.querySelector(".discount_original_price")
  : null;

const discountElement = purchaseArea
  ? purchaseArea.querySelector(".discount_pct")
  : null;

const currentPrice = priceElement
  ? priceElement.textContent.trim()
  : "Price unavailable";

const originalPrice = originalPriceElement
  ? originalPriceElement.textContent.trim()
  : null;

const discount = discountElement
  ? discountElement.textContent.trim()  
  : null;

// Create PriceForge panel
const priceforge = document.createElement("div");

// Convert price strings to numeric values
const currentPriceValue = priceElement
  ? parseFloat(currentPrice.replace(/[^\d.]/g, ""))
  : null;

const originalPriceValue = originalPriceElement
  ? parseFloat(originalPrice.replace(/[^\d.]/g, ""))
  : null;

const discountValue = discountElement
  ? parseInt(discount.replace(/\D/g, ""), 10)
  : 0;

priceforge.innerHTML = `
    <strong>⚒️ PriceForge</strong>
    <br>
    ${gameTitle}
    <br>
    <small>App ID: ${appId ?? "Unknown"}</small>
    <br>
    <strong>Price: ${currentPrice}</strong>
    <br>
    Current price: ${currentPrice}
    <br>
    Original price: ${originalPrice ?? "Not on sale"}
    <br>
    Discount: ${discount ?? "No discount"}
    <br>
    <small>
        Numeric: £${currentPriceValue}<br>
        Original: £${originalPriceValue}<br>
        Discount: ${discountValue}%
    </small>
`;

priceforge.style.position = "fixed";
priceforge.style.bottom = "20px";
priceforge.style.right = "20px";
priceforge.style.padding = "12px 18px";
priceforge.style.background = "#171a21";
priceforge.style.color = "white";
priceforge.style.border = "1px solid #66c0f4";
priceforge.style.borderRadius = "8px";
priceforge.style.fontFamily = "Arial, sans-serif";
priceforge.style.fontSize = "14px";
priceforge.style.lineHeight = "1.5";
priceforge.style.zIndex = "999999";

document.body.appendChild(priceforge);