const Alexa = require('alexa-remote2');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), 'utf8'));
const LAPTOP_IP = config.network.laptop;
const AMAZON_DOMAIN = config.alexa.amazonDomain || 'amazon.com';
const ALEXA_SERVICE_HOST = config.alexa.alexaServiceHost || 'pitangui.amazon.com';
const PROXY_PORT = 3456;
const COOKIE_FILE = path.join(__dirname, 'cookie_data.json');
const alexa = new Alexa();

// Load saved cookie if exists
let savedCookie = null;
if (fs.existsSync(COOKIE_FILE)) {
    try {
        savedCookie = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
        console.log('Found saved cookie data, attempting to reuse...');
    } catch (e) {
        console.log('Failed to parse saved cookie, will re-authenticate');
    }
}

alexa.on('cookie', (cookie, csrf, macDms) => {
    console.log('\n=== Cookie received/refreshed ===');
    const data = {
        cookie: alexa.cookieData || cookie,
        csrf,
        macDms
    };
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(data, null, 2));
    console.log('Cookie saved to', COOKIE_FILE);
});

const initOptions = {
    cookie: savedCookie ? savedCookie.cookie : undefined,
    macDms: savedCookie ? savedCookie.macDms : undefined,
    formerRegistrationData: savedCookie ? savedCookie.cookie : undefined,
    setupProxy: !savedCookie,
    proxyOnly: !savedCookie,
    proxyOwnIp: 'localhost',
    proxyPort: PROXY_PORT,
    proxyListenBind: '0.0.0.0',
    proxyLogLevel: 'info',
    amazonPageProxyLanguage: 'en_US',
    bluetooth: false,
    useWsMqtt: false,
    alexaServiceHost: ALEXA_SERVICE_HOST,
    amazonPage: AMAZON_DOMAIN,
    logger: console.log,
    cookieRefreshInterval: 7 * 24 * 60 * 1000,
};

console.log('Initializing Alexa Remote...');
console.log(`Amazon domain: ${AMAZON_DOMAIN}`);
if (!savedCookie) {
    console.log(`\n>>> No saved cookie. Will open proxy for authentication.`);
    console.log(`>>> Open http://${LAPTOP_IP}:${PROXY_PORT} in your browser and log in to Amazon.`);
    console.log(`>>> Or try http://localhost:${PROXY_PORT} if the above doesn't work.\n`);
}

alexa.init(initOptions, function (err) {
    if (err) {
        if (err.message && err.message.includes('Please open')) {
            console.log('\n========================================');
            console.log('PROXY IS RUNNING!');
            console.log(`Open http://${LAPTOP_IP}:${PROXY_PORT} in your browser`);
            console.log(`Or try http://localhost:${PROXY_PORT}`);
            console.log(`Log in to your Amazon account (${AMAZON_DOMAIN})`);
            console.log('========================================\n');
            return;
        }
        console.error('Init error:', err.message || err);
        process.exit(1);
    }

    console.log('\n=== Connected successfully! ===\n');
    console.log('Devices found:');

    const devices = alexa.serialNumbers;
    for (const serial of Object.keys(devices)) {
        const dev = alexa.find(serial);
        console.log(`  - ${dev.accountName} (${dev.deviceFamily}) [${serial}]`);
    }

    for (const serial of Object.keys(devices)) {
        const dev = alexa.find(serial);
        console.log(`\n--- ${dev.accountName} ---`);
        console.log(`  Serial: ${dev.serialNumber}`);
        console.log(`  Family: ${dev.deviceFamily}`);
        console.log(`  Type: ${dev.deviceType}`);
        console.log(`  Online: ${dev.online}`);
    }

    setTimeout(() => {
        console.log('\nAuth complete. Cookie saved. You can now run control.js');
        process.exit(0);
    }, 5000);
});
