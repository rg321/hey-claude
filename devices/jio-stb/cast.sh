#!/bin/bash
# Jio STB DLNA control — cast media, volume, CCTV streaming
# Usage: cast.sh <url> [title] | stop | volume <0-100> | mute | unmute | cctv [channel]

set -e

ROOT_DIR="$HOME/ai/home_assistant"
CONFIG="$ROOT_DIR/config.json"
STB_IP=$(jq -r '.stb.ip' "$CONFIG")
STB_PORT=2870
BASE_URL="http://${STB_IP}:${STB_PORT}/AVTransport/control"
RENDER_URL="http://${STB_IP}:${STB_PORT}/RenderingControl/control"

CMD="${1:-}"

soap_request() {
  local url="$1" action="$2" body="$3"
  curl -s -X POST "$url" \
    -H 'Content-Type: text/xml; charset="utf-8"' \
    -H "SOAPAction: \"$action\"" \
    -d "<?xml version=\"1.0\"?>
<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">
  <s:Body>$body</s:Body>
</s:Envelope>"
}

cast_url() {
  local media_url="$1" title="${2:-Stream}"
  local metadata="&lt;DIDL-Lite xmlns=&quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&quot; xmlns:dc=&quot;http://purl.org/dc/elements/1.1/&quot; xmlns:upnp=&quot;urn:schemas-upnp-org:metadata-1-0/upnp/&quot;&gt;&lt;item&gt;&lt;dc:title&gt;${title}&lt;/dc:title&gt;&lt;upnp:class&gt;object.item.videoItem&lt;/upnp:class&gt;&lt;res protocolInfo=&quot;http-get:*:application/x-mpegURL:*&quot;&gt;${media_url}&lt;/res&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;"

  soap_request "$BASE_URL" \
    "urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI" \
    "<u:SetAVTransportURI xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">
      <InstanceID>0</InstanceID>
      <CurrentURI>${media_url}</CurrentURI>
      <CurrentURIMetaData>${metadata}</CurrentURIMetaData>
    </u:SetAVTransportURI>" > /dev/null

  # Play returns 501 but actually works — ignore error
  soap_request "$BASE_URL" \
    "urn:schemas-upnp-org:service:AVTransport:1#Play" \
    "<u:Play xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">
      <InstanceID>0</InstanceID>
      <Speed>1</Speed>
    </u:Play>" > /dev/null 2>&1 || true

  echo "Casting $media_url to Jio STB"
}

case "$CMD" in
  stop)
    soap_request "$BASE_URL" \
      "urn:schemas-upnp-org:service:AVTransport:1#Stop" \
      "<u:Stop xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">
        <InstanceID>0</InstanceID>
      </u:Stop>" > /dev/null
    echo "Stopped playback"
    ;;

  volume)
    local vol="${2:-50}"
    soap_request "$RENDER_URL" \
      "urn:schemas-upnp-org:service:RenderingControl:1#SetVolume" \
      "<u:SetVolume xmlns:u=\"urn:schemas-upnp-org:service:RenderingControl:1\">
        <InstanceID>0</InstanceID>
        <Channel>Master</Channel>
        <DesiredVolume>${vol}</DesiredVolume>
      </u:SetVolume>" > /dev/null
    echo "Volume set to $vol"
    ;;

  mute)
    soap_request "$RENDER_URL" \
      "urn:schemas-upnp-org:service:RenderingControl:1#SetMute" \
      "<u:SetMute xmlns:u=\"urn:schemas-upnp-org:service:RenderingControl:1\">
        <InstanceID>0</InstanceID>
        <Channel>Master</Channel>
        <DesiredMute>1</DesiredMute>
      </u:SetMute>" > /dev/null
    echo "Muted"
    ;;

  unmute)
    soap_request "$RENDER_URL" \
      "urn:schemas-upnp-org:service:RenderingControl:1#SetMute" \
      "<u:SetMute xmlns:u=\"urn:schemas-upnp-org:service:RenderingControl:1\">
        <InstanceID>0</InstanceID>
        <Channel>Master</Channel>
        <DesiredMute>0</DesiredMute>
      </u:SetMute>" > /dev/null
    echo "Unmuted"
    ;;

  cctv)
    CHANNEL="${2:-1}"
    # Start CCTV stream if not already running
    bash "$ROOT_DIR/devices/cpplus-dvr/stream.sh" start "$CHANNEL" > /dev/null 2>&1
    sleep 3
    LAPTOP_IP=$(ipconfig getifaddr en0 2>/dev/null || jq -r '.network.laptop' "$CONFIG")
    cast_url "http://${LAPTOP_IP}:8899/stream.m3u8" "CCTV Camera $CHANNEL"
    ;;

  "")
    echo "Usage: cast.sh <url> [title] | stop | volume <0-100> | mute | unmute | cctv [channel]"
    ;;

  *)
    cast_url "$CMD" "${2:-Stream}"
    ;;
esac
