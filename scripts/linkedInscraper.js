const puppeteer = require("puppeteer");
const fs = require("fs");
const scraper = async (jobTitle) => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = `https://www.linkedin.com/jobs/search/?keywords=${jobTitle}`;
  await page.goto(url, { waitUntil: "networkidle2" });

  const jobs = await page.evaluate(() => {
    const jobCards = Array.from(
      document.querySelectorAll(".job-card-container")
    );
    return jobCards.map((card) => {
      return {
        title: card.querySelector(".job-card-list__title")?.innerText.trim(),
        company: card
          .querySelector(".job-card-container__company-name")
          ?.innerText.trim(),
        location: card
          .querySelector(".job-card-container__metadata-item")
          ?.innerText.trim(),
        link: card.querySelector("a.job-card-list__title")?.href,
        DatePosted: card
          .querySelector("job-card-container__footer-job-state")
          .innerText.trim(),
      };
    });
  });

  fs.writeFile("jobs.json", JSON.stringify(jobs, null, 2), (err) => {
    if (err) {
      console.error("Error writing JSON to file:", err);
    } else {
      console.log("Job data saved successfully.");
    }
  });

  await browser.close();
};

scraper("mlops");
