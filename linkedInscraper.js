const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

app.post("/scrape", async (req, res) => {
  const { jobTitle } = req.body;
  if (!jobTitle) {
    return res.status(400).json({ error: "Job title is required" });
  }

  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const username = process.env.Email;
    const password = process.env.password;

    // Navigate to LinkedIn login page
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.type("#username", username, { delay: 100 });
    await page.type("#password", password, { delay: 100 });
    await page.click(".btn__primary--large");

    try {
      await page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch (e) {
      console.log("Login navigation timeout:", e);
    }

    const encodedJobTitle = encodeURIComponent(jobTitle);
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedJobTitle}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    try {
      await page.waitForSelector(".job-card-container", { timeout: 120000 });
    } catch (e) {
      console.log("Job search page timeout:", e);
      await browser.close();
      return res.status(500).json({ error: "Job search page timeout" });
    }

    const jobs = await page.evaluate(() => {
      const jobCards = Array.from(
        document.querySelectorAll(".job-card-container")
      );
      return jobCards.map((card) => {
        const jobLink = card.querySelector("a.job-card-list__title");
        const jobPage = jobLink ? jobLink.href : "";
        return {
          title: card.querySelector(".job-card-list__title")?.innerText.trim(),
          company: card
            .querySelector(".job-card-container__company-name")
            ?.innerText.trim(),
          location: card
            .querySelector(".job-card-container__metadata-item")
            ?.innerText.trim(),
          description: card
            .querySelector(".job-card-container__description")
            ?.innerText.trim(),
          datePosted: card
            .querySelector(".job-card-container__footer-job-state")
            ?.innerText.trim(),
          skills: Array.from(
            card.querySelectorAll(".job-card-container__skills-item")
          ).map((skill) => skill.innerText.trim()),
          link: jobPage,
        };
      });
    });

    fs.writeFile("jobs.json", "", (err) => {
      if (err) {
        console.error("Error clearing the file:", err);
      } else {
        fs.writeFile("jobs.json", JSON.stringify(jobs, null, 2), (err) => {
          if (err) {
            console.error("Error writing JSON to file:", err);
          } else {
            console.log("Job data saved successfully.");
          }
        });
      }
    });

    await browser.close();
    res.json({ jobs });
  } catch (error) {
    console.error("Error during scraping:", error);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
