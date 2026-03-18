const Alexa = require('alexa-remote2');
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, 'cookie_data.json');
const alexa = new Alexa();

if (!fs.existsSync(COOKIE_FILE)) {
    console.error('No cookie file found. Run auth.js first.');
    process.exit(1);
}

const savedCookie = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));

alexa.on('cookie', (cookie, csrf, macDms) => {
    const data = { cookie: alexa.cookieData || cookie, csrf, macDms };
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(data, null, 2));
});

const command = process.argv[2] || 'list';
const arg = process.argv[3];

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
    if (err) {
        console.error('Init error:', err.message || err);
        process.exit(1);
    }

    // Get ALL devices, not just serialNumbers
    const allDevices = alexa.serialNumbers;

    // Find the physical Echo device (not app instances)
    // ECHO, KNIGHT, ROOK are physical Echo devices
    // VOX = Alexa app, WHA = multi-room group
    let echoDevice = null;
    const deviceList = [];

    for (const serial of Object.keys(allDevices)) {
        const dev = alexa.find(serial);
        deviceList.push(dev);
        if (dev.deviceFamily === 'ECHO' || dev.deviceFamily === 'KNIGHT' || dev.deviceFamily === 'ROOK') {
            echoDevice = dev;
        }
    }

    // If no ECHO family found, try to find by capabilities or type
    if (!echoDevice) {
        echoDevice = deviceList.find(d =>
            d.capabilities && d.capabilities.includes('VOLUME_SETTING')
        ) || deviceList[0];
    }

    switch (command) {
        case 'list':
            console.log('All registered devices:\n');
            for (const dev of deviceList) {
                console.log(`Name: ${dev.accountName}`);
                console.log(`  Serial: ${dev.serialNumber}`);
                console.log(`  Family: ${dev.deviceFamily}`);
                console.log(`  Type: ${dev.deviceType}`);
                console.log(`  Online: ${dev.online}`);
                console.log(`  Capabilities: ${(dev.capabilities || []).join(', ')}`);
                console.log('');
            }
            if (echoDevice) {
                console.log(`Selected device for commands: ${echoDevice.accountName} [${echoDevice.serialNumber}]`);
            }
            // Also try to get all device volumes
            alexa.getAllDeviceVolumes((err, res) => {
                if (!err && res) {
                    console.log('\nDevice Volumes:');
                    console.log(JSON.stringify(res, null, 2));
                }
                process.exit(0);
            });
            break;

        case 'speak':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            const text = arg || 'Hello! I am being controlled remotely.';
            console.log(`Speaking on ${echoDevice.accountName}: "${text}"`);
            alexa.sendSequenceCommand(echoDevice, 'speak', text, (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'ssml':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            const ssml = arg || '<speak>Hello! <break time="500ms"/> This is an SSML test.</speak>';
            console.log(`SSML on ${echoDevice.accountName}`);
            alexa.sendSequenceCommand(echoDevice, 'ssml', ssml, (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'volume':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            const vol = parseInt(arg || '50');
            console.log(`Setting volume to ${vol} on ${echoDevice.accountName}`);
            alexa.sendCommand(echoDevice, 'volume', vol, (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'stop':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            console.log(`Stopping playback on ${echoDevice.accountName}`);
            alexa.sendCommand(echoDevice, 'pause', (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'play':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            console.log(`Resuming playback on ${echoDevice.accountName}`);
            alexa.sendCommand(echoDevice, 'play', (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'announce':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            const announcement = arg || 'This is a test announcement';
            console.log(`Announcing on ${echoDevice.accountName}: "${announcement}"`);
            alexa.sendSequenceCommand(echoDevice, 'announcement', announcement, (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'weather':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            console.log(`Getting weather on ${echoDevice.accountName}`);
            alexa.sendSequenceCommand(echoDevice, 'weather', '', (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'textcommand':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            const cmd = arg || 'what time is it';
            console.log(`Sending text command: "${cmd}"`);
            alexa.sendSequenceCommand(echoDevice, 'textCommand', cmd, (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'dnd-on':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            console.log(`Enabling Do Not Disturb on ${echoDevice.accountName}`);
            alexa.sendSequenceCommand(echoDevice, 'deviceDoNotDisturb', true, (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        case 'dnd-off':
            if (!echoDevice) { console.error('No Echo device found'); process.exit(1); }
            console.log(`Disabling Do Not Disturb on ${echoDevice.accountName}`);
            alexa.sendSequenceCommand(echoDevice, 'deviceDoNotDisturb', false, (err) => {
                if (err) console.error('Error:', err.message || err);
                else console.log('Done!');
                process.exit(err ? 1 : 0);
            });
            break;

        default:
            console.log('Usage: node control.js <command> [arg]');
            console.log('Commands:');
            console.log('  list                    - List all devices');
            console.log('  speak "text"            - Make Alexa speak text');
            console.log('  ssml "<speak>...</speak>" - Speak with SSML');
            console.log('  volume 0-100            - Set volume');
            console.log('  stop                    - Stop/pause playback');
            console.log('  play                    - Resume playback');
            console.log('  announce "text"         - Make announcement');
            console.log('  weather                 - Get weather report');
            console.log('  textcommand "query"     - Send text as voice command');
            console.log('  dnd-on                  - Enable Do Not Disturb');
            console.log('  dnd-off                 - Disable Do Not Disturb');
            process.exit(0);
    }
});
