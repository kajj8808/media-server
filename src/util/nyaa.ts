import puppeteer from "puppeteer";

interface INyaaInfo {
  title: string;
  magnet: string;
}

export async function getNyaaMagnets(nyaaUrl: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(nyaaUrl);

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
