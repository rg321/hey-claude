const Alexa = require('alexa-remote2');
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, 'cookie_data.json');
const alexa = new Alexa();
const savedCookie = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));

alexa.on('cookie', (cookie, csrf, macDms) => {
    const data = { cookie: alexa.cookieData || cookie, csrf, macDms };
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(data, null, 2));
});

alexa.init({
    cookie: savedCookie.cookie,
    macDms: savedCookie.macDms,
    formerRegistrationData: savedCookie.cookie,
    proxyOnly: false,
    bluetooth: false,
    useWsMqtt: false,
    alexaServiceHost: 'alexa.amazon.in',
    amazonPage: 'amazon.in',
    logger: false,
    cookieRefreshInterval: 0,
}, function (err) {
    if (err) { console.error('Init error:', err.message || err); process.exit(1); }

    // Query uncached device list
    alexa.httpsGet('/api/devices-v2/device?cached=false', (err, res) => {
        console.log('=== UNCACHED DEVICES ===');
        if (err) console.error('Error:', err);
        else {
            const devices = res.devices || [];
            console.log(`Found ${devices.length} device(s):\n`);
            for (const d of devices) {
                console.log(`Name: ${d.accountName}`);
                console.log(`  Serial: ${d.serialNumber}`);
                console.log(`  Family: ${d.deviceFamily}`);
                console.log(`  Type: ${d.deviceType}`);
                console.log(`  Online: ${d.online}`);
                console.log(`  MAC: ${d.macAddress}`);
                console.log(`  ESSID: ${d.essid}`);
                console.log(`  SW Version: ${d.softwareVersion}`);
                console.log(`  Capabilities: ${(d.capabilities || []).join(', ')}`);
                console.log('');
            }
        }

        // Also check smart home devices
        alexa.getSmarthomeDevices((err2, res2) => {
            if (!err2 && res2) {
                console.log('=== SMART HOME DEVICES ===');
                const items = res2 || [];
                if (Array.isArray(items)) {
                    for (const d of items.slice(0, 10)) {
                        console.log(`  ${d.friendlyName || d.entityId || JSON.stringify(d).substring(0, 100)}`);
                    }
                } else {
                    console.log(JSON.stringify(res2, null, 2).substring(0, 2000));
                }
            }
            process.exit(0);
        });
    });
});
