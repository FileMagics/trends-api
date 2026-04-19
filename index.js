const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const express = require('express');

const app = express();
puppeteer.use(StealthPlugin());

app.get('/', (req, res) => res.send('API is Ready! Add /trends?geo=IN to URL'));

app.get('/trends', async (req, res) => {
    const geo = req.query.geo || 'US';
    const url = `https://trends.google.co.in/trending?geo=${geo}&hours=4&status=active&sort=search-volume`;

    // Sabse pehle browser launch karein lekin minimalist settings ke saath
    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        executablePath: '/usr/bin/google-chrome-stable',
        headless: "new"
    });

    try {
        const page = await browser.newPage();
        
        // Timeout ko badha dete hain (Render slow hai)
        page.setDefaultNavigationTimeout(90000); 

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

        // Rule: Sab kuch block kar do jo zaroori nahi hai
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media', 'other'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // "networkidle2" ki jagah "domcontentloaded" use karenge (Fast hai)
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Wait for data to load (Google Trends takes time)
        await new Promise(r => setTimeout(r, 5000)); 

        const trendingData = await page.evaluate(() => {
            // Google Trends Table structure check karein
            const items = [];
            const rows = document.querySelectorAll('tr'); 
            
            rows.forEach(row => {
                const title = row.querySelector('.mZ37Wc-title')?.innerText;
                const volume = row.querySelector('.mZ37Wc-search-count')?.innerText;
                const queries = row.querySelector('.mZ37Wc-related-queries')?.innerText;
                
                if (title) {
                    items.push({ title, volume, queries });
                }
            });
            return items;
        });

        res.json({ success: true, geo, count: trendingData.length, results: trendingData });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await browser.close();
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
