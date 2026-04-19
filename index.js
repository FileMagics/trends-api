const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const app = express();

app.get('/', (req, res) => res.send('API is Live! Use /trends?geo=IN'));

app.get('/trends', async (req, res) => {
    const geo = req.query.geo || 'IN';
    const url = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`;

    try {
        const response = await axios.get(url);
        const parser = new xml2js.Parser({ explicitArray: false });
        
        parser.parseString(response.data, (err, result) => {
            if (err) throw err;

            const items = result.rss.channel.item;
            const trends = (Array.isArray(items) ? items : [items]).map(item => ({
                title: item.title,
                search_volume: item['ht:approx_traffic'],
                description: item.description,
                pubDate: item.pubDate,
                picture: item['ht:picture'],
                news_title: item['ht:news_item'] ? item['ht:news_item']['ht:news_item_title'] : '',
                source: item['ht:news_item'] ? item['ht:news_item']['ht:news_item_source'] : ''
            }));

            res.json({
                status: "success",
                geo: geo,
                count: trends.length,
                results: trends
            });
        });
    } catch (error) {
        res.status(500).json({ status: "failed", error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Stable API running on port ${PORT}`));
