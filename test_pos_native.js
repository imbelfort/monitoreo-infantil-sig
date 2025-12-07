const http = require('http');

const data = JSON.stringify({
    nino_id: 1,
    lat: -17.7816,
    lon: -63.1780
});

const options = {
    hostname: 'localhost',
    port: 80,
    path: '/api/posiciones',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log(body));
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
