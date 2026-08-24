const query = `
[out:json];
area["name"="Chile"]->.searchArea;
(
  node["name"~"(?i)starken"](area.searchArea);
);
out body;
`;

fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query), {
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': '*/*'
  }
}).then(r => r.json()).then(data => {
  const branches = data.elements.map(e => ({
    name: e.tags.name,
    city: e.tags['addr:city'] || '',
    address: e.tags['addr:street'] || '',
    lat: e.lat,
    lng: e.lon
  }));
  console.log(JSON.stringify(branches, null, 2));
}).catch(console.error);
