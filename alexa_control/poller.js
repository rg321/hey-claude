const Alexa = require('alexa-remote2');
const fs = require('fs');

const alexa = new Alexa();
const saved = JSON.parse(fs.readFileSync('cookie_data.json', 'utf8'));
const QUEUE_FILE = '/tmp/alexa_commands.jsonl';

let lastTimestamp = Date.now();

// Clear queue file on start
fs.writeFileSync(QUEUE_FILE, '');

alexa.init({
    cookie: saved.cookie, macDms: saved.macDms, formerRegistrationData: saved.cookie,
    proxyOnly: false, bluetooth: false, useWsMqtt: false,
    alexaServiceHost: 'alexa.amazon.in', amazonPage: 'amazon.in',
    logger: false, cookieRefreshInterval: 0,
}, function (err) {
    if (err) { console.error('Init error:', err.message); process.exit(1); }
    console.log('Poller running. Writing to', QUEUE_FILE);

    function poll() {
        alexa.getCustomerHistoryRecords({}, (err, res) => {
            if (err) return;
            const records = Array.isArray(res) ? res : [];
            const newOnes = records.filter(r => r.creationTimestamp > lastTimestamp).reverse();
            for (const r of newOnes) {
                lastTimestamp = r.creationTimestamp;
                const entry = {
                    timestamp: r.creationTimestamp,
                    user: r.description?.summary || '',
                    alexaResponse: r.alexaResponse || '',
                    device: r.name || '',
                    processed: false
                };
                fs.appendFileSync(QUEUE_FILE, JSON.stringify(entry) + '\n');
                console.log(`[${new Date(entry.timestamp).toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})}] ${entry.user}`);
            }
        });
    }

    setInterval(poll, 2000);
});
