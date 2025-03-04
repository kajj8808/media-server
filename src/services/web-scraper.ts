import puppeteer from "puppeteer";

export async function getNyaaMagnets(nyaaQuery: string) {
  const nyaaUrl = `https://nyaa.si/?q=${nyaaQuery}`;
  const browser = await puppeteer.launch({
    timeout: 1000 * 60 * 10
  });
  const page = await browser.newPage();
  await page.goto(nyaaUrl, { waitUntil: "load", timeout: 0 });
  const nyaaMagnets = await page.evaluate(() => {
    const anchorTags = Array.from(document.querySelectorAll("a"));
    const nyaaMagnets: string[] = [];
    anchorTags.forEach((anchor) => {
      if (anchor.getAttribute("href")?.includes("magnet")) {
        nyaaMagnets.push(anchor.getAttribute("href") + "");
      }
    });
    return nyaaMagnets;
  });
  await browser.close();
  return nyaaMagnets;
}
