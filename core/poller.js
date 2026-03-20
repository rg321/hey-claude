const fs = require('fs');
const path = require('path');
const Alexa = require(path.join(__dirname, 'alexa', 'node_modules', 'alexa-remote2'));

const ROOT_DIR = path.join(__dirname, '..');
const alexa = new Alexa();
const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'alexa', 'cookie_data.json'), 'utf8'));
const QUEUE_FILE = path.join(ROOT_DIR, 'failed_alexa_conversations.jsonl');
const LOG_FILE = path.join(ROOT_DIR, 'all_alexa_conversations.jsonl');

let lastTimestamp = Date.now();

// Don't clear queue on start — preserve history for debugging

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
                const user = (r.description?.summary || '').trim();
                // Log all commands
                const logEntry = {
                    timestamp: r.creationTimestamp,
                    time: new Date(r.creationTimestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    user,
                    alexaResponse: r.alexaResponse || '',
                };
                fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
                // If Alexa gave a real response (not a failure/deflection), skip Claude
                const resp = (r.alexaResponse || '').trim();
                const respLower = resp.toLowerCase();
                const failurePatterns = [
                    "sorry", "i'm not sure", "i'm not quite sure",
                    "i don't know", "i don't understand", "i don't have",
                    "hmm", "i couldn't", "i can't", "i wasn't able",
                    "i'm having trouble", "i didn't find",
                    "that's not supported", "not supported yet",
                    "to control a video device", "you need to connect",
                    "i can not", "i cannot", "i'm unable",
                    "go to the alexa app", "manage your video skills",
                    "enabled video skills"
                ];
                const isFailure = !resp || failurePatterns.some(p => respLower.includes(p));
                if (resp && !isFailure) {
                    console.log(`[${logEntry.time}] ALEXA> ${user} → ${resp.substring(0, 60)}`);
                    continue;
                }
                // Alexa didn't understand — queue for Claude
                // Skip empty/junk commands (transcription artifacts)
                if (!user || user.replace(/[\s,.\-!?]/g, '').length < 2) continue;
                const entry = {
                    timestamp: r.creationTimestamp,
                    time: new Date(r.creationTimestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    command: user,
                    alexaResponse: resp,
                };
                fs.appendFileSync(QUEUE_FILE, JSON.stringify(entry) + '\n');
                console.log(`[${logEntry.time}] CLAUDE> ${user}`);
            }
        });
    }

    setInterval(poll, 2000);
});
