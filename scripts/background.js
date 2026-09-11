import { calcNextTime, fetchFPTPlaceTab, setAlarm, setMessage, updateCollected } from './utils.js';

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'autoClick') return;

  const tab = await fetchFPTPlaceTab();
  if (!tab) return;

  // If tab was discarded by Chrome Memory Saver, reload it first
  if (tab.discarded) {
    try {
      await chrome.tabs.reload(tab.id);
      await new Promise((resolve) => {
        const listener = (tabId, info) => {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }, 8000);
      });
    } catch (err) {
      console.error('Failed to reload discarded tab:', err);
      // await setMessage('Tab was discarded, failed to reload');
    }
  }

  // If tab is not currently active, temporarily activate it so Chrome unthrottles
  // timers, resumes requestAnimationFrame, and updates the DOM
  let previousTabId = null;
  try {
    const [currentActiveTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (currentActiveTab && currentActiveTab.id !== tab.id) {
      previousTabId = currentActiveTab.id;
      await chrome.tabs.update(tab.id, { active: true });
      // let the page catch up and re-render
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  } catch (err) {
    console.warn('Could not activate tab:', err);
    // await setMessage('Tab was deactivated, failed to activate');
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'clickClaimButton' });
    if (response?.success === true) {
      await updateCollected();
      await calcNextTime();
    } else if (response?.remainingTime) {
      const [minStr, secStr] = response.remainingTime.split(':');
      const min = Number(minStr) || 0, sec = Number(secStr) || 0;
      let delayInMinutes = Math.max(min + (sec > 0 ? 1 : 0), 1);
      await setAlarm();
      console.log(`Button still in countdown. Rescheduled alarm for ${delayInMinutes} min.`);
    }
    if (response?.message) {
      await setMessage(response.message);
    }
  } catch (err) {
    console.error('Failed to send message to tab:', err);
    await setMessage('Could not claim, consider reloading page.');
  } finally {
    // Restore user's previous active tab if activated FPT Place
    if (previousTabId) {
      try {
        await chrome.tabs.update(previousTabId, { active: true });
      } catch (err) {
        console.warn('Could not restore previous tab:', err);
      }
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  switch (message.action) {
    case 'resetAlarm':
      setTimeout(() => setAlarm(), 1000);
      return;
    case 'updateNextTime':
      void calcNextTime();
      return;
  }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.enabled) {
    if (changes.enabled.newValue) {
      await setAlarm(false);
    } else {
      void chrome.alarms.clear('autoClick');
      console.log('Extension disabled: cleared autoClick alarm');
    }
  }
});
