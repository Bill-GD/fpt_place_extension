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

void fetchFPTPlaceTab();

// current time
const currentTime = document.querySelector('#current-time');
currentTime.innerText = getCurrentTime().toString();
setInterval(() => {
  currentTime.innerText = getCurrentTime().toString();
}, 1000);

// status
const statusLabel = document.querySelector('#status');
statusLabel.innerText = getCurrentTime().isOngoing() ? 'Ongoing' : 'Ended';

// collected
void updateCollected();

// next timestamp
(async () => {
  const timeToNext = await fetchTimeRemaining();
  if (timeToNext.length <= 0) {
    setNextTime('N/A');
    return;
  }

  const [minStr, secStr] = timeToNext.split(':');
  const time = getCurrentTime();
  time.add(0, Number(minStr) || 0, Number(secStr) || 0);
  setNextTime(time.toString());
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

// auto start on open
(async () => {
  if (!getCurrentTime().isOngoing() || !(await canClick())) {
    if (!(await hasAlarm())) {
      setTimeout(() => setAlarm(false), 1000);
    }
    return;
  }

  await forceClaim();
  await setMessage('Auto claimed (may or may not actually claimed)');
})();

// force claim
const forceClaimButton = document.querySelector('#force-claim-button');
forceClaimButton.addEventListener('click', async () => {
  if (!getCurrentTime().isOngoing()) {
    await setMessage('Please wait until tomorrow.');
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
