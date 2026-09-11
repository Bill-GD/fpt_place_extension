import {
  calcNextTime,
  canClaim,
  fetchCooldownTime,
  fetchFPTPlaceTab,
  hasAlarm,
  setAlarm,
  setMessage,
  updateCollected,
  updateMaxCountAndLastClaim,
} from '../scripts/utils.js';
import { Time } from '../types/Time.js';

const tab = await fetchFPTPlaceTab();

// current time
(() => {
  const currentTime = document.querySelector('#current-time');
  currentTime.innerText = Time.now().toString();
  setInterval(() => {
    currentTime.innerText = Time.now().toString();
  }, 1000);
})();

// status
document.querySelector('#status').innerText = Time.now().getStatus();

// collected
void updateCollected();
void updateMaxCountAndLastClaim();

// set alarm if opened before start time
(async () => {
  const time = Time.now();
  if (time.isBeforeStart()) {
    await setAlarm(true, Time.now().to(8, 31).toMinutes() - time.toMinutes());
    console.log('Set alarm for when day start');
  }
})();

// next timestamp
(() => {
  void calcNextTime(true);
})();

// auto start on open
(async () => {
  if (!tab) return;

  if (Time.now().isOngoing() && await canClaim()) {
    const claimed = await forceClaim();
    if (claimed) await setMessage('Auto claimed');
    return;
  }

  if (Time.now().isEnded()) {
    await chrome.alarms.clear('autoClick');
    return;
  }

  const { collected = '' } = await chrome.storage.local.get('collected');
  if ((collected && collected === '10/10') || await hasAlarm()) return;

  setTimeout(() => void setAlarm(false), 1000);
})();

// listen for storage changes (e.g. from background or content script)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.message) {
    const messageEl = document.querySelector('#message');
    if (messageEl) messageEl.innerText = changes.message.newValue;
  }
});

// ===== button event listeners =====
async function forceClaim() {
  const tab = await fetchFPTPlaceTab();
  if (!tab) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'forceClaim' });
    if (response?.success === true) {
      await updateCollected();
      await calcNextTime();
    }
    if (response?.message) {
      await setMessage(response.message);
    }
    return response?.success ?? false;
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Could not force claim, consider reloading page.');
    return false;
  }
}

// force claim
const forceClaimButton = document.querySelector('#force-claim-button');
forceClaimButton.addEventListener('click', async () => {
  if (!tab) return;

  const time = Time.now();
  if (!time.isOngoing()) {
    await setMessage(time.isBeforeStart() ? 'Please wait until 8:30' : 'Please wait until tomorrow.');
    return;
  }

  if (!(await canClaim())) {
    const timeToNext = await fetchCooldownTime();
    await setMessage(`Please wait until next claim (in ${timeToNext}).`);
    return;
  }

  void forceClaim();
});

// check alarm
const checkAlarmButton = document.querySelector('#check-alarm-button');
checkAlarmButton.addEventListener('click', async () => {
  const alarm = await chrome.alarms.get('autoClick');
  if (!alarm) {
    void setMessage('No alarm set');
  } else {
    void setMessage(
      `Alarm set at: ${new Date(alarm.scheduledTime).toLocaleTimeString(undefined, { hour12: false })}`,
    );
  }
});

// force set alarm
const forceSetAlarmButton = document.querySelector('#set-alarm-button');
forceSetAlarmButton.addEventListener('click', async () => {
  const timeToNext = await fetchCooldownTime();
  if (timeToNext.length <= 0) {
    await setMessage('Could not force set alarm, consider reloading page.');
    return;
  }
  void setAlarm();
});

// remove alarm
const removeSetAlarmButton = document.querySelector('#remove-alarm-button');
removeSetAlarmButton.addEventListener('click', async () => {
  await chrome.alarms.clear('autoClick');
  void setMessage('Cleared alarm');
});
