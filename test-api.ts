async function test() {
  const res = await fetch("http://127.0.0.1:3000/api/scrape", {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json" }
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
