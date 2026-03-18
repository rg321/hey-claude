const Alexa = require('alexa-remote2');
const fs = require('fs');
const readline = require('readline');

const alexa = new Alexa();
const saved = JSON.parse(fs.readFileSync('cookie_data.json', 'utf8'));

const SONGS = [
    'Mundian To Bach Ke by Panjabi MC',
    'Amplifier by Imran Khan',
    'Patiala Peg by Diljit Dosanjh',
    'Proper Patola by Badshah',
    'Lahore by Guru Randhawa',
];

const FX = {
    dhol: 'dhol drum beats Punjabi',
    horn: 'air horn sound effect',
    crowd: 'crowd cheering sound effect',
};

let dev = null;

function cmd(type, value) {
    return new Promise((resolve) => {
        if (type === 'speak') {
            alexa.sendSequenceCommand(dev, 'speak', value, () => resolve());
        } else if (type === 'text') {
            alexa.sendSequenceCommand(dev, 'textCommand', value, () => resolve());
        } else if (type === 'volume') {
            alexa.sendCommand(dev, 'volume', parseInt(value), () => resolve());
        } else if (type === 'stop') {
            alexa.sendSequenceCommand(dev, 'deviceStop', '', () => resolve());
        } else {
            resolve();
        }
    });
}

function showMenu() {
    console.log('\n🎧 PUNJABI DJ ORCHESTRATOR 🎧\n');
    SONGS.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log('\n  v <0-100>    volume');
    console.log('  p            pause');
    console.log('  r            resume');
    console.log('  fx dhol/horn/crowd');
    console.log('  shout <text> DJ announcement');
    console.log('  mix          random song');
    console.log('  loop         repeat current');
    console.log('  q            quit\n');
}

alexa.init({
    cookie: saved.cookie, macDms: saved.macDms, formerRegistrationData: saved.cookie,
    proxyOnly: false, bluetooth: false, useWsMqtt: false,
    alexaServiceHost: 'alexa.amazon.in', amazonPage: 'amazon.in',
    logger: false, cookieRefreshInterval: 0,
}, function (err) {
    if (err) { console.error('Init error:', err.message); process.exit(1); }

    const serial = Object.keys(alexa.serialNumbers).find(s => alexa.find(s).deviceFamily === 'ECHO');
    dev = alexa.find(serial);
    console.log(`Connected to: ${dev.accountName}`);

    showMenu();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'DJ> ' });
    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) { rl.prompt(); return; }

        const num = parseInt(input);
        if (num >= 1 && num <= SONGS.length) {
            console.log(`Playing: ${SONGS[num - 1]}`);
            await cmd('text', `play ${SONGS[num - 1]} on Spotify`);
        } else if (input.startsWith('v ')) {
            const vol = input.split(' ')[1];
            console.log(`Volume: ${vol}`);
            await cmd('volume', vol);
        } else if (input === 'p') {
            console.log('Paused');
            await cmd('stop');
        } else if (input === 'r') {
            console.log('Resuming');
            await cmd('text', 'resume music');
        } else if (input.startsWith('fx ')) {
            const effect = input.split(' ')[1];
            if (FX[effect]) {
                console.log(`FX: ${effect}`);
                await cmd('text', `play ${FX[effect]} on Spotify`);
            } else {
                console.log('FX options: dhol, horn, crowd');
            }
        } else if (input.startsWith('shout ')) {
            const text = input.slice(6);
            console.log(`Announcing: ${text}`);
            await cmd('speak', text);
        } else if (input === 'mix') {
            const pick = SONGS[Math.floor(Math.random() * SONGS.length)];
            console.log(`Random: ${pick}`);
            await cmd('text', `play ${pick} on Spotify`);
        } else if (input === 'loop') {
            console.log('Looping current song');
            await cmd('text', 'repeat this song');
        } else if (input === 'q') {
            console.log('Bye!');
            process.exit(0);
        } else {
            console.log('Unknown command. Type a number 1-5 or see menu above.');
        }
        rl.prompt();
    });
});
