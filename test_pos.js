const fetch = require('node-fetch');

async function test() {
    const body = {
        nino_id: 1,
        lat: -17.7816,
        lon: -63.1780
    };
    console.log('Sending:', body);
    try {
        const res = await fetch('http://localhost:4000/api/posiciones', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log('Response:', data);
    } catch (e) {
        console.error(e);
    }
}

test();
