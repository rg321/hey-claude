const Alexa = require('alexa-remote2');
const fs = require('fs');

const alexa = new Alexa();
const saved = JSON.parse(fs.readFileSync('cookie_data.json', 'utf8'));

let lastTimestamp = Date.now();

alexa.init({
    cookie: saved.cookie, macDms: saved.macDms, formerRegistrationData: saved.cookie,
    proxyOnly: false, bluetooth: false, useWsMqtt: false,
    alexaServiceHost: 'alexa.amazon.in', amazonPage: 'amazon.in',
    logger: false, cookieRefreshInterval: 0,
}, function (err) {
    if (err) { console.error('Init error:', err.message); process.exit(1); }
    console.log('Listening for voice commands... (polling every 2s)\n');

    function poll() {
        alexa.getCustomerHistoryRecords({}, (err, res) => {
            if (err) return;
            const records = Array.isArray(res) ? res : [];
            const newOnes = records.filter(r => r.creationTimestamp > lastTimestamp).reverse();
            for (const r of newOnes) {
                lastTimestamp = r.creationTimestamp;
                const time = new Date(r.creationTimestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                const user = r.description?.summary || '(unknown)';
                const resp = r.alexaResponse || '';
                console.log(`[${time}]`);
                console.log(`  You:   ${user}`);
                if (resp) console.log(`  Alexa: ${resp}`);
                console.log('');
            }
        });
    }

    poll();
    setInterval(poll, 2000);
});
