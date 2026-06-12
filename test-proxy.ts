async function testAllOrigins() {
  const url = "https://www.ebay.com/itm/315183353594";
  const pUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(pUrl);
  const data = await res.json();
  console.log("Length:", data.contents?.length);
}
testAllOrigins();
