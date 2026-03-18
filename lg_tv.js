#!/usr/bin/env node
// LG WebOS TV control via SSAP WebSocket
// Usage: node lg_tv.js <command> [args]
// Commands: on, off, volume [get|N], mute, unmute, app <appId>, youtube [videoId], screenshot, status

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const TV_IP = config.tv.ip;
const TV_WS = `wss://${TV_IP}:3001`;
const TV_MAC = config.tv.mac;
const BROADCAST = config.tv.broadcast;
const CLIENT_KEY_FILE = path.join(__dirname, 'lg_tv_client_key.txt');

function getClientKey() {
  try { return fs.readFileSync(CLIENT_KEY_FILE, 'utf8').trim(); } catch {}
  return null;
}

function saveClientKey(key) {
  fs.writeFileSync(CLIENT_KEY_FILE, key);
}

function wakeOnLan() {
  return new Promise((resolve, reject) => {
    const macBytes = Buffer.from(TV_MAC.replace(/:/g, ''), 'hex');
    const magic = Buffer.concat([Buffer.alloc(6, 0xff), ...Array(16).fill(macBytes)]);
    const client = dgram.createSocket('udp4');
    client.bind(() => {
      client.setBroadcast(true);
      client.send(magic, 9, BROADCAST, (err) => {
        client.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

function connectTV(timeout = 8000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TV_WS, { rejectUnauthorized: false });
    let msgId = 0;
    const pending = new Map();
    let registered = false;
    const timer = setTimeout(() => { ws.close(); reject(new Error('Connection timeout')); }, timeout);

    ws.on('open', () => {
      const clientKey = getClientKey();
      const perms = [
        'LAUNCH', 'LAUNCH_WEBAPP', 'APP_TO_APP', 'CONTROL_AUDIO', 'CONTROL_DISPLAY',
        'CONTROL_INPUT_JOYSTICK', 'CONTROL_INPUT_MEDIA_RECORDING', 'CONTROL_INPUT_MEDIA_PLAYBACK',
        'CONTROL_INPUT_TV', 'CONTROL_POWER', 'CONTROL_INPUT_TEXT', 'CONTROL_MOUSE_AND_KEYBOARD',
        'READ_APP_STATUS', 'READ_CURRENT_CHANNEL', 'READ_INPUT_DEVICE_LIST', 'READ_NETWORK_STATE',
        'READ_RUNNING_APPS', 'READ_TV_CHANNEL_LIST', 'WRITE_NOTIFICATION_TOAST', 'READ_POWER_STATE',
        'READ_COUNTRY_INFO', 'READ_SETTINGS', 'CONTROL_TV_SCREEN', 'CONTROL_TV_STANBY',
        'READ_TV_CURRENT_TIME', 'READ_STORAGE_DEVICE_LIST'
      ];
      const reg = {
        type: 'register',
        id: `reg_${++msgId}`,
        payload: {
          pairingType: 'PROMPT',
          manifest: {
            manifestVersion: 1,
            appVersion: '1.1',
            signed: {
              permissions: perms,
              localizedAppNames: { '': 'Home Assistant' },
              localizedVendorNames: { '': '' },
              permissions: perms,
              serial: 'rs2'
            },
            permissions: perms,
            signatures: [{ signatureVersion: 1, signature: 'eyJhbGdvcml0aG0iOiJSU0EtU0hBMjU2Iiwia2V5SWQiOiJ0ZXN0LXNpZ25pbmctY2VydCIsInNpZ25hdHVyZUJhc2U2NCI6Ii9sSjNKOVROdUc5S2VWakF4eDVSNlB3K2dQeXV0K1BCczNzQU1RTFRIRWFZY0kwRkRsTHUyUmdXSjB4Yk14MWlpUFJLUktaQitGa2REYjN4V3B4STFvNjJwMzVYSk5Kb2NrNUVWeUo1MjBTa1ZrK0d1ZWhrWlh3N042aVo3VlFOK05CZTdydjE3c29vQTVaZjhROWdBdlFOVnFiYWIzTURBQnNuaWdLbk1rZzFxczRlMkVBTFRpSXpNQ0VDRnFOQ3dFQ3pEYjBSSUFZbkIxR0NPT3JVRS81VVFxY0Y5ZC9YV3dRS2dvR0RyTUtvWkIxQnppd2w3aGZwVGtDeFZiYUlKQ2RIUHR0Q05LUGE3ZXJJL1J2SjhlcEFPaC8zN2d3YXkrcllQUEhpSmxYOWYrMXZLekF0d2lXR0h3WnhlR2o1elBTVjdEdzFVZWRlTjBUamxhVjV3PT0ifQ==' }]
          }
        }
      };
      if (clientKey) reg.payload['client-key'] = clientKey;
      ws.send(JSON.stringify(reg));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'registered') {
        registered = true;
        if (msg.payload && msg.payload['client-key']) {
          saveClientKey(msg.payload['client-key']);
        }
        clearTimeout(timer);
        const send = (uri, payload) => {
          return new Promise((res, rej) => {
            const id = `msg_${++msgId}`;
            pending.set(id, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ type: 'request', id, uri, payload }));
            setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('Request timeout')); } }, 5000);
          });
        };
        resolve({ ws, send, close: () => ws.close() });
      }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error));
        else p.resolve(msg.payload);
      }
    });

    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

async function main() {
  const [,, cmd, ...args] = process.argv;

  if (!cmd) {
    console.log('Usage: node lg_tv.js <command> [args]');
    console.log('Commands: on, off, volume [get|N], mute, unmute, app <appId>, youtube [videoId], screenshot, status');
    process.exit(0);
  }

  // Wake-on-LAN doesn't need WebSocket
  if (cmd === 'on') {
    await wakeOnLan();
    console.log('WoL magic packet sent to', TV_MAC);
    // Send a few more packets for reliability
    await new Promise(r => setTimeout(r, 500));
    await wakeOnLan();
    await new Promise(r => setTimeout(r, 500));
    await wakeOnLan();
    console.log('TV should be waking up');
    process.exit(0);
  }

  try {
    const tv = await connectTV();

    switch (cmd) {
      case 'off':
        await tv.send('ssap://system/turnOff');
        console.log('TV turned off');
        break;

      case 'volume': {
        const val = args[0];
        if (!val || val === 'get') {
          const res = await tv.send('ssap://audio/getVolume');
          console.log(`Volume: ${res.volume}, Muted: ${res.muted}`);
        } else {
          await tv.send('ssap://audio/setVolume', { volume: parseInt(val) });
          console.log(`Volume set to ${val}`);
        }
        break;
      }

      case 'mute':
        await tv.send('ssap://audio/setMute', { mute: true });
        console.log('TV muted');
        break;

      case 'unmute':
        await tv.send('ssap://audio/setMute', { mute: false });
        console.log('TV unmuted');
        break;

      case 'app': {
        const appId = args[0];
        if (!appId) { console.log('Usage: node lg_tv.js app <appId>'); break; }
        await tv.send('ssap://system.launcher/launch', { id: appId });
        console.log(`Launched ${appId}`);
        break;
      }

      case 'youtube': {
        const videoId = args[0];
        const payload = { id: 'youtube.leanback.v4' };
        if (videoId) {
          payload.params = { contentTarget: `https://www.youtube.com/tv#/watch?v=${videoId}` };
        }
        await tv.send('ssap://system.launcher/launch', payload);
        console.log(videoId ? `YouTube playing ${videoId}` : 'YouTube launched');
        break;
      }

      case 'netflix':
        await tv.send('ssap://system.launcher/launch', { id: 'netflix' });
        console.log('Netflix launched');
        break;

      case 'screenshot': {
        const res = await tv.send('ssap://tv/executeOneShot');
        console.log('Screenshot:', res.imageUri);
        break;
      }

      case 'status': {
        const power = await tv.send('ssap://com.webos.service.tvpower/power/getPowerState');
        const vol = await tv.send('ssap://audio/getVolume');
        const app = await tv.send('ssap://com.webos.applicationManager/getForegroundAppInfo');
        console.log(JSON.stringify({ power: power.state || 'Active', volume: vol.volume, muted: vol.muted, app: app.appId }, null, 2));
        break;
      }

      default:
        console.log(`Unknown command: ${cmd}`);
    }

    tv.close();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
