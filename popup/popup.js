import {
  calcNextTime,
  canClick,
  fetchFPTPlaceTab,
  fetchTimeRemaining,
  getCurrentTime,
  isEnabled,
  setAlarm,
  setMessage,
  setNextTime,
  toggleExtension,
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
statusLabel.innerText = getCurrentTime().started() ? 'Started' : 'Ended';

// collected
void updateCollected();

// next timestamp
(async () => {
  const timeToNext = await fetchTimeRemaining();
  const [min, sec] = timeToNext.split(':');
  const baseTime = getCurrentTime();
  baseTime.add(0, Number(min), Number(sec));
  setNextTime(baseTime.toString());
})();

// listen for storage changes (e.g. from background or content script)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.message) {
    const messageEl = document.querySelector('#message');
    if (messageEl) messageEl.innerText = changes.message.newValue;
  }
});

// auto set alarm (especially when reloaded)
(async () => {
  const alarm = await chrome.alarms.get('autoClick');
  if (alarm) return;

  const timeToNext = await fetchTimeRemaining();
  const [min, sec] = timeToNext.split(':');
  let minute = Number(min);
  if (Number(sec) > 0) minute++;
  setTimeout(() => {
    setAlarm(minute);
    void setMessage(`Set alarm: ${minute}min.`);
  }, 1000);
})();

// ===== button event listeners =====
// toggle
const toggleButton = document.querySelector('#toggle-button');

toggleButton.innerHTML = `Toggle: ${(await isEnabled())
  ? '<span class="toggle on">ON</span>'
  : '<span class="toggle off">OFF</span>'}`;

toggleButton.addEventListener('click', async () => {
  void toggleExtension();
});

// force claim
const forceClaimButton = document.querySelector('#force-claim-button');
forceClaimButton.addEventListener('click', async () => {
  if (!(await isEnabled())) {
    await setMessage('Extension is disabled. Toggle ON to claim.');
    return;
  }

  if (!getCurrentTime().started()) {
    await setMessage('Please wait until tomorrow.');
    return;
  }

  if (!(await canClick())) {
    const timeToNext = await fetchTimeRemaining();
    await setMessage(`Please wait until next claim (in ${timeToNext}).`);
    return;
  }

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
});

// check alarm
const checkAlarmButton = document.querySelector('#check-alarm-button');
checkAlarmButton.addEventListener('click', async () => {
  const alarm = await chrome.alarms.get('autoClick');
  if (!alarm) {
    void setMessage('No alarm set', false);
  } else {
    void setMessage(`Alarm set at: ${new Date(alarm.scheduledTime).toLocaleTimeString()}`, false);
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

  const [min, sec] = timeToNext.split(':');
  let minute = Number(min);
  if (Number(sec) > 0) minute++;
  setAlarm(minute);
  await setMessage(`Set alarm: ${minute}min.`);
});
