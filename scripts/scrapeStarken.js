import fs from 'fs';
import https from 'https';

async function scrapeStarken() {
  console.log("Attempting to fetch Starken branches...");
  // Sometimes endpoints are like this:
  const urlsToTry = [
    'https://gateway.starken.cl/agency/city',
    'https://www.starken.cl/api/agencias',
    'https://www.starken.cl/api/sucursales'
  ];

  for (let url of urlsToTry) {
    console.log(`Trying ${url}...`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Referer': 'https://www.starken.cl/',
          'Origin': 'https://www.starken.cl'
        }
      });
      clearTimeout(timeout);
      
      console.log(`Response from ${url}:`, response.status);
      if (response.ok) {
        const data = await response.text();
        console.log(`Data length: ${data.length}`);
        console.log(`Preview: ${data.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`Failed to fetch ${url}: ${e.message}`);
    }
  }
}

scrapeStarken();
