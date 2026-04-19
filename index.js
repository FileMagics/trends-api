const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const express = require('express');
const app = express();

puppeteer.use(StealthPlugin());

app.get('/trends', async (req, res) => {
    const geo = req.query.geo || 'US';
    const url = `https://trends.google.co.in/trending?geo=${geo}&hours=4&status=active&sort=search-volume`;

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote'],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        headless: "new"
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const data = await page.evaluate(() => {
            const rows = document.querySelectorAll('tr.mZ37Wc'); 
            return Array.from(rows).map(row => ({
                title: row.querySelector('.mZ37Wc-title')?.innerText,
                volume: row.querySelector('.mZ37Wc-search-count')?.innerText,
                queries: row.querySelector('.mZ37Wc-related-queries')?.innerText
            }));
        });

        res.json({ success: true, geo, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    } finally {
        await browser.close();
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
