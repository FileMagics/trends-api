const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const express = require('express');

const app = express();
puppeteer.use(StealthPlugin());

// Root URL check karne ke liye
app.get('/', (req, res) => {
    res.send('Google Trends API is Live! Use /trends?geo=IN');
});

app.get('/trends', async (req, res) => {
    const geo = req.query.geo || 'US';
    const url = `https://trends.google.co.in/trending?geo=${geo}&hours=4&status=active&sort=search-volume`;

    console.log(`Fetching trends for: ${geo}`);

    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ],
        // Docker environment ka path
        executablePath: '/usr/bin/google-chrome-stable', 
        headless: "new"
    });

    try {
        const page = await browser.newPage();
        
        // Anti-detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

        // Resources block karke speed badhayein
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Google Trends scraping logic
        const trendingData = await page.evaluate(() => {
            const rows = document.querySelectorAll('tr'); // Google Trends row
            const results = [];
            
            rows.forEach((row) => {
                const title = row.querySelector('.mZ37Wc-title')?.innerText;
                const volume = row.querySelector('.mZ37Wc-search-count')?.innerText;
                const queries = row.querySelector('.mZ37Wc-related-queries')?.innerText;
                
                if (title) {
                    results.push({
                        title: title,
                        search_volume: volume,
                        related_queries: queries,
                        timestamp: new Date().toISOString()
                    });
                }
            });
            return results;
        });

        res.json({
            status: "success",
            geo: geo,
            count: trendingData.length,
            results: trendingData
        });

    } catch (error) {
        console.error("Scraping Error:", error.message);
        res.status(500).json({ status: "failed", error: error.message });
    } finally {
        await browser.close();
    }
});

// Render's default port 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
