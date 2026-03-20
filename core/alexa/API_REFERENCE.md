# Alexa Echo Dot API Reference

## Device: Raghav's Echo Dot (3rd Gen)
- Serial: G091AA1014220CJS
- Type: A2U21SRK4QGSE1
- Locale: en-IN (supports hi-IN)

## Quick Commands (control.js)

```bash
cd ~/ai/cctv_project/alexa_control

node control.js speak "text"              # Alexa speaks text
node control.js volume 50                 # Set volume (0-100)
node control.js stop                      # Pause/stop playback
node control.js play                      # Resume playback
node control.js announce "text"           # Announcement with chime
node control.js weather                   # Weather report
node control.js textcommand "query"       # Send text as voice command
node control.js dnd-on                    # Enable Do Not Disturb
node control.js dnd-off                   # Disable Do Not Disturb
```

---

## Full API Reference (alexa-remote2)

### Voice & Speech

| Method | Description | Example |
|--------|-------------|---------|
| `sendSequenceCommand(dev, 'speak', text)` | Alexa speaks text (250 char limit) | `'speak', 'Hello Raghav'` |
| `sendSequenceCommand(dev, 'ssml', ssml)` | Speak with SSML markup (pauses, pitch, speed) | `'ssml', '<speak>Hi <break time="1s"/> there</speak>'` |
| `sendSequenceCommand(dev, 'textCommand', text)` | Send text as if spoken to Alexa | `'textCommand', 'what time is it'` |
| `sendSequenceCommand(dev, 'announcement', text)` | Announcement with chime | `'announcement', 'Dinner is ready'` |
| `sendSequenceCommand(dev, 'notification', text)` | Push notification (yellow ring) | `'notification', 'Reminder text'` |

### Music & Media

| Method | Description |
|--------|-------------|
| `sendCommand(dev, 'play')` | Resume playback |
| `sendSequenceCommand(dev, 'deviceStop', '')` | Pause/stop playback |
| `sendSequenceCommand(dev, 'deviceStopAll', '')` | Stop all devices |
| `sendCommand(dev, 'next')` | Next track |
| `sendCommand(dev, 'previous')` | Previous track |
| `sendCommand(dev, 'shuffle')` | Toggle shuffle |
| `sendCommand(dev, 'repeat')` | Toggle repeat |
| `playMusicProvider(dev, providerId, query, cb)` | Play from a provider |
| `playAudible(dev, query, cb)` | Play Audible audiobook |
| `setTunein(dev, stationId, cb)` | Play TuneIn station |
| `tuneinSearch(query, cb)` | Search TuneIn stations |
| `getPlayerInfo(dev, cb)` | Get current playback info |
| `getPlayerQueue(dev, cb)` | Get playback queue |
| `sendMessage(dev, 'jump', mediaId, cb)` | Jump to queue item |

#### Music Providers Available
- `SPOTIFY` — Spotify
- `AMAZON_MUSIC` — Amazon Music (current default)
- `SAAVN` — JioSaavn
- `TUNEIN` — TuneIn Radio
- `CLOUDPLAYER` — My Library

#### Play Music via textCommand (easiest)
```js
alexa.sendSequenceCommand(dev, 'textCommand', 'play romantic Hindi songs on Spotify');
alexa.sendSequenceCommand(dev, 'textCommand', 'play Machli Jal Ki Rani Hai on Spotify');
```

### Volume & Audio

| Method | Description |
|--------|-------------|
| `sendCommand(dev, 'volume', 0-100)` | Set volume |
| `getAllDeviceVolumes(cb)` | Get volume of all devices |
| `setAlarmVolume(dev, volume, cb)` | Set alarm volume |
| `setDeviceNotificationVolume(dev, volume, cb)` | Set notification volume |
| `getEqualizerSettings(dev, cb)` | Get bass/mid/treble EQ |
| `setEqualizerSettings(dev, {bass, mid, treble}, cb)` | Adjust EQ (-6 to 6) |
| `getEqualizerRange(dev, cb)` | Get supported EQ range |
| `getEqualizerEnabled(dev, cb)` | Check if EQ is enabled |

### Alarms, Timers & Reminders

| Method | Description |
|--------|-------------|
| `createNotification(type, label, date, time, cb)` | Create alarm/timer/reminder |
| `getNotifications(cached, cb)` | List all alarms/timers/reminders |
| `deleteNotification(id, cb)` | Delete one |
| `changeNotification(notification, cb)` | Modify alarm/reminder |
| `cancelNotification(id, cb)` | Cancel a notification |
| `setNotification(notification, cb)` | Set notification |
| `setReminder(dev, label, date, time, cb)` | Quick reminder creation |
| `getAscendingAlarmState(dev, cb)` | Check ascending alarm status |
| `setDeviceAscendingAlarmState(dev, enabled, cb)` | Enable/disable ascending alarm |
| `getNotificationSounds(dev, cb)` | List available alarm sounds |
| `setDeviceNotificationDefaultSound(dev, sound, cb)` | Change alarm sound |

### Do Not Disturb

| Method | Description |
|--------|-------------|
| `sendSequenceCommand(dev, 'deviceDoNotDisturb', true/false)` | Toggle DND |
| `sendSequenceCommand(dev, 'deviceDoNotDisturbAll', true/false)` | Toggle DND on all devices |
| `setDoNotDisturb(dev, enabled, cb)` | Set DND via API |
| `getAllDoNotDisturbDeviceStatus(cb)` | Get DND status of all devices |
| `getDoNotDisturb(cb)` | Get DND status |

### Built-in Responses (Sequence Commands)

| Command | Description |
|---------|-------------|
| `'weather'` | Weather report |
| `'traffic'` | Traffic update |
| `'flashbriefing'` | Flash news briefing |
| `'goodmorning'` | Good morning routine |
| `'goodnight'` | Good night routine |
| `'singasong'` | Alexa sings a song |
| `'tellstory'` | Alexa tells a story |
| `'joke'` | Tell a joke |
| `'funfact'` | Random fun fact |
| `'cleanup'` | Cleanup routine |
| `'calendarToday'` | Today's calendar |
| `'calendarTomorrow'` | Tomorrow's calendar |
| `'calendarNext'` | Next calendar event |
| `'curatedtts'` | Curated phrases — values: `goodbye`, `compliments`, `birthday`, `confirmations`, `goodmorning`, `goodnight`, `iamhome` |
| `'sound'` | Play a routine sound by ID |
| `'wait'` | Wait (for multi-sequence chains) |

Usage:
```js
alexa.sendSequenceCommand(dev, 'joke', '', callback);
alexa.sendSequenceCommand(dev, 'singasong', '', callback);
alexa.sendSequenceCommand(dev, 'curatedtts', 'compliments', callback);
```

### Lists (Shopping/To-Do)

| Method | Description |
|--------|-------------|
| `getLists(cb)` / `getListsV2(cb)` | Get all lists |
| `getList(listId, cb)` / `getListV2(listId, cb)` | Get a specific list |
| `getListItems(listId, cb)` / `getListItemsV2(listId, cb)` | Get items in a list |
| `addListItem(listId, text, cb)` | Add item |
| `updateListItem(listId, itemId, data, cb)` | Update item |
| `deleteListItem(listId, itemId, options, cb)` | Delete item |

### Bluetooth

| Method | Description |
|--------|-------------|
| `getBluetooth(cached, cb)` | List paired Bluetooth devices |
| `disconnectBluetooth(dev, cb)` | Disconnect current Bluetooth |

### Smart Home

| Method | Description |
|--------|-------------|
| `getSmarthomeDevices(cb)` / `getSmarthomeDevicesV2(cb)` | List all smart home devices |
| `getSmarthomeGroups(cb)` | List groups |
| `getSmarthomeEntities(cb)` | List all entities |
| `querySmarthomeDevices(devices, cb)` | Query device states |
| `executeSmarthomeDeviceAction(entityIds, parameters, cb)` | Control devices |
| `setEnablementForSmarthomeDevice(id, enabled, cb)` | Enable/disable device |
| `deleteSmarthomeDevice(id, cb)` | Remove device |
| `deleteSmarthomeGroup(id, cb)` | Remove group |
| `deleteAllSmarthomeDevices(cb)` | Remove all |
| `getSmarthomeBehaviourActionDefinitions(cb)` | Get available actions |

### Routines

| Method | Description |
|--------|-------------|
| `getAutomationRoutines(cb)` | List all Alexa routines |
| `executeAutomationRoutine(routine, cb)` | Trigger a routine |
| `getRoutineSkillCatalog(cb)` | Available skills for routines |
| `getRoutineSoundList(cb)` | Available routine sounds |

### Device Settings

| Method | Description |
|--------|-------------|
| `renameDevice(dev, newName, cb)` | Change device name |
| `getDevicePreferences(dev, cb)` | Get device preferences |
| `setDevicePreferences(dev, prefs, cb)` | Set device preferences |
| `getDeviceWifiDetails(dev, cb)` | Get WiFi info |
| `getDeviceSettings(dev, setting, cb)` | Get a setting |
| `setDeviceSettings(dev, setting, value, cb)` | Set a setting |
| `setAttentionSpanSetting(dev, enabled, cb)` | Follow-up mode |
| `setAlexaGesturesSetting(dev, enabled, cb)` | Tap gestures |
| `getConnectedSpeakerOptionSetting(dev, cb)` | Connected speaker options |
| `setConnectedSpeakerOptionSetting(dev, value, cb)` | Set speaker options |
| `getEqualizerSettings(dev, cb)` | EQ settings |
| `setEqualizerSettings(dev, settings, cb)` | Set EQ |
| `deleteDevice(dev, cb)` | Remove device |

### Messaging & Communication

| Method | Description |
|--------|-------------|
| `sendTextMessage(conversationId, text, cb)` | Send message |
| `getContacts(options, cb)` | List contacts |
| `getConversations(options, cb)` | Get conversations |
| `deleteConversation(conversationId, cb)` | Delete conversation |

### Account & Info

| Method | Description |
|--------|-------------|
| `getUsersMe(cb)` | Get account info |
| `getHousehold(cb)` | Get household members |
| `getAccount(cb)` | Account details |
| `getSkills(cb)` | Installed skills |
| `getCustomerHistoryRecords(options, cb)` | Voice command history |
| `getWakeWords(cb)` | Wake word settings |
| `getMusicProviders(cb)` | Available music providers |
| `getDeviceStatusList(cb)` | Device status list |
| `getDeviceNotificationState(dev, cb)` | Notification state |
| `getWholeHomeAudioGroups(cb)` | Multi-room audio groups |
| `getEndpoints(cb)` | API endpoints |
| `getHomeGroup(cb)` | Home group info |

### Multi-Sequence Commands

```js
// Chain multiple commands sequentially
const nodes = [
    alexa.createSequenceNode('speak', 'First message', dev),
    alexa.createSequenceNode('speak', 'Second message', dev),
];
alexa.sendMultiSequenceCommand(nodes, 'SerialNode', callback);

// Parallel execution
alexa.sendMultiSequenceCommand(nodes, 'ParallelNode', callback);
```

### Echo Dot Capabilities
APPLE_MUSIC, AMAZON_MUSIC, SPOTIFY (via skill), SIRIUSXM, I_HEART_RADIO, PANDORA, TUNE_IN, DEEZER, TIDAL, AUDIBLE, KINDLE_BOOKS, EQUALIZER (bass/mid/treble), ADAPTIVE_VOLUME, ADAPTIVE_LISTENING, WAKE_WORD_SENSITIVITY, MOTION_DETECTION, FAR_FIELD_WAKE_WORD, MULTI_WAKEWORDS, BLUETOOTH (source & sink), ASCENDING_ALARM_VOLUME, CUSTOM_ALARM_TONE, FLASH_BRIEFING, REMINDERS, TIMERS_AND_ALARMS

### Init Boilerplate

```js
const Alexa = require('alexa-remote2');
const fs = require('fs');
const alexa = new Alexa();
const saved = JSON.parse(fs.readFileSync('cookie_data.json', 'utf8'));

alexa.init({
    cookie: saved.cookie,
    macDms: saved.macDms,
    formerRegistrationData: saved.cookie,
    proxyOnly: false,
    bluetooth: false,
    useWsMqtt: false,
    alexaServiceHost: 'alexa.amazon.in',
    amazonPage: 'amazon.in',
    logger: false,
    cookieRefreshInterval: 0,
}, function(err) {
    if (err) { console.error(err); process.exit(1); }
    const serial = Object.keys(alexa.serialNumbers)
        .find(s => alexa.find(s).deviceFamily === 'ECHO');
    const dev = alexa.find(serial);

    // Your commands here
});
```
