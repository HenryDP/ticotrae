async function test() {
  const url = "https://www.amazon.com/dp/B08F7PTF54";
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  console.log("Status:", response.status);
  const html = await response.text();
  console.log("HTML length:", html.length);
  if (html.includes("captcha") || html.includes("api-services-support@amazon.com")) {
    console.log("CAPTCHA or BLOCK detected.");
  } else {
    console.log("Looks ok, snippet:");
    console.log(html.substring(0, 300));
  }
}
test();
