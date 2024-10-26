import { settingsStorage } from "settings";
import * as messaging from "messaging";
import { sendVal } from "./utils.js";
import { device } from "peer";

if (!device.screen) device.screen = { width: 348, height: 250 };
console.log(`Dimensions: ${device.screen.width}x${device.screen.height}`);


messaging.peerSocket.onopen = function() {
  restoreSettings();
}

settingsStorage.onchange = evt => {
  console.log("Sent key " + evt.key);
  console.log("Sent newValue " + evt.newValue);
  let data = {
    key: evt.key,
    newValue: evt.newValue
  };
  sendVal(data);
};

function restoreSettings() {
  for (let index = 0; index < settingsStorage.length; index++) {
    let key = settingsStorage.key(index);
    if (key) {
      let data = {
        key: key,
        newValue: JSON.parse(settingsStorage.getItem(key))
      };
      sendVal(data);
    }
  }
}