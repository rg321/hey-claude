const Alexa = require('alexa-remote2');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), 'utf8'));
const LAPTOP_IP = config.network.laptop;
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
    proxyOnly: !savedCookie,
    proxyOwnIp: LAPTOP_IP,
    proxyPort: 3001,
    proxyLogLevel: 'info',
    bluetooth: false,
    useWsMqtt: false,
    alexaServiceHost: 'alexa.amazon.in',
    amazonPage: 'amazon.in',
    logger: console.log,
    cookieRefreshInterval: 7 * 24 * 60 * 1000,
};

console.log('Initializing Alexa Remote...');
if (!savedCookie) {
    console.log('\n>>> No saved cookie. Will open proxy for authentication.');
    console.log(`>>> Open http://${LAPTOP_IP}:3001 in your browser and log in to Amazon.\n`);
}

alexa.init(initOptions, function (err) {
    if (err) {
        // When proxyOnly=true, init returns an "error" telling user to open browser
        // The proxy server is still running - don't exit
        if (err.message && err.message.includes('Please open')) {
            console.log('\n========================================');
            console.log('PROXY IS RUNNING!');
            console.log(`Open http://${LAPTOP_IP}:3001 in your browser`);
            console.log('Log in to your Amazon account (amazon.in)');
            console.log('========================================\n');
            return; // Keep process alive, proxy is running
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

    // Print all devices with details
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
