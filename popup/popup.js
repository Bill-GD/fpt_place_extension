import {
  calcNextTime,
  canClick,
  fetchFPTPlaceTab,
  fetchTimeRemaining,
  getCurrentTime,
  hasAlarm,
  setAlarm,
  setMessage,
  setNextTime,
  updateCollected,
} from '../scripts/utils.js';

const tab = await fetchFPTPlaceTab();

// set alarm if opened before start time
(async () => {
  const time = getCurrentTime();
  if (time.isBeforeStart()) {
    await setAlarm(true, getCurrentTime().to(8, 31).toMinutes() - time.toMinutes());
    console.log('Set alarm for when day start');
  }
})();

// next timestamp
(async () => {
  const { nextTime } = await chrome.storage.local.get('nextTime');
  if (nextTime) {
    setNextTime(nextTime);
    return;
  }

  const timeToNext = await fetchTimeRemaining();
  if (timeToNext.length <= 0 || !timeToNext.includes(':')) {
    const { nextTime = 'N/A' } = await chrome.storage.local.get('nextTime');
    setNextTime(nextTime);
    return;
  }

  const [minStr, secStr] = timeToNext.split(':');
  const time = getCurrentTime();
  time.add(0, Number(minStr) || 0, Number(secStr) || 0);
  setNextTime(time.toString());
})();

// auto start on open
(async () => {
  if (!tab) return;

  if (getCurrentTime().isOngoing() && await canClick()) {
    await forceClaim();
    await setMessage('Auto claimed (may or may not actually claimed)');
    return;
  }

  if (getCurrentTime().isEnded()) {
    await chrome.alarms.clear('autoClick');
    return;
  }

  if (await hasAlarm()) return;

  setTimeout(() => void setAlarm(false), 1000);
})();

// current time
(() => {
  const currentTime = document.querySelector('#current-time');
  currentTime.innerText = getCurrentTime().toString();
  setInterval(() => {
    currentTime.innerText = getCurrentTime().toString();
  }, 1000);
})();

// status
document.querySelector('#status').innerText = getCurrentTime().getStatus();

// collected
void updateCollected();

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
      calcNextTime();
    }
    if (response?.message) {
      await setMessage(response.message);
    }
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Could not force claim, consider reloading page.');
  }
}

// force claim
const forceClaimButton = document.querySelector('#force-claim-button');
forceClaimButton.addEventListener('click', async () => {
  if (!tab) return;

  const time = getCurrentTime();
  if (!time.isOngoing()) {
    await setMessage(time.isBeforeStart() ? 'Please wait until 8:30' : 'Please wait until tomorrow.');
    return;
  }

  if (!(await canClick())) {
    const timeToNext = await fetchTimeRemaining();
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
  const timeToNext = await fetchTimeRemaining();
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
