export const DEFAULT_TIMESTAMPS = [
  '08:30:00',
  '09:15:00',
  '10:00:00',
  '10:45:00',
  '11:30:00',
  '12:15:00',
  '13:00:00',
  '13:45:00',
  '14:30:00',
  '15:15:00',
  '16:00:00',
];

function padStart(value) {
  return String(value).padStart(2, '0');
}

export function getCurrentTime() {
  const date = new Date();
  const hour = date.getHours(), minute = date.getMinutes(), second = date.getSeconds();
  return {
    hour,
    minute,
    second,
    add(hour = 0, minute = 0, second = 0) {
      this.second += second;
      if (this.second > 60) {
        this.second %= 60;
        this.minute++;
      }
      this.minute += minute;
      if (this.minute > 60) {
        this.minute %= 60;
        this.hour++;
      }
      this.hour = (this.hour + hour) % 24;
    },
    isBeforeStart() {
      return this.hour < 8 || (this.hour === 8 && this.minute < 30);
    },
    isOngoing() {
      return ((this.hour >= 8 && this.minute >= 30) || this.hour >= 9) && this.hour < 16;
    },
    isEnded() {
      return this.hour >= 16;
    },
    getStatus() {
      if (this.isBeforeStart()) return 'Starting Soon';
      if (this.isOngoing()) return 'Ongoing';
      if (this.isEnded()) return 'Ended';
    },
    toMinutes() {
      return this.minute + this.hour * 60 + (this.second > 0 ? 1 : 0);
    },
    to(hour = 0, minute = 0, second = 0) {
      this.second = second % 60;
      this.minute = minute % 60;
      this.hour = hour % 24;
      return this;
    },
    toString() {
      return `${padStart(this.hour)}:${padStart(this.minute)}:${padStart(this.second)}`;
    },
  };
}

export async function fetchTimeRemaining() {
  if (!getCurrentTime().isOngoing()) return '';

  const tab = await fetchFPTPlaceTab();
  if (!tab) return '';

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTimeRemaining' });
    if (response?.success === true && response?.message) {
      return String(response.message);
    }
    await setMessage(response?.message ?? 'Failed to fetch cooldown time');
    return '';
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Failed to fetch time until next claim, consider reloading page.');
  }
  return '';
}

export function setNextTime(time) {
  void chrome.storage.local.set({ nextTime: time });
  if (typeof document !== 'undefined') {
    const nextTimeEl = document.querySelector('#next-time');
    if (nextTimeEl) {
      nextTimeEl.innerText = time;
    }
  }
}

export function calcNextTime() {
  const currentTime = getCurrentTime();
  if (!currentTime.isOngoing()) {
    setNextTime(DEFAULT_TIMESTAMPS[0]);
    return;
  }

  currentTime.add(0, 45);
  setNextTime(currentTime.isOngoing() ? currentTime.toString() : DEFAULT_TIMESTAMPS[0]);
}

export async function setMessage(str, isHTML = false) {
  if (typeof document === 'undefined') return;
  const messageEl = document.querySelector('#message');
  if (messageEl) {
    if (isHTML) {
      messageEl.innerHTML = str;
    } else {
      messageEl.innerText = str;
    }
  }
  console.log(`Message: ${str}`);
}

export function setCollected(str) {
  if (typeof document !== 'undefined') {
    const collectedCountEl = document.querySelector('#collected-count');
    if (collectedCountEl) {
      collectedCountEl.innerText = str;
    }
  }
  void chrome.storage.local.set({ collected: str });
}

export async function updateCollected() {
  const tab = await fetchFPTPlaceTab();
  if (!tab) {
    return setCollected((await chrome.storage.local.get('collected'))?.collected ?? 'N/A');
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getCollected',
      isOngoing: getCurrentTime().isOngoing(),
    });
    if (response?.collected) {
      setCollected(response.collected);
    }
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Failed to fetch collected count, consider reloading page.');
  }
}

export async function canClick() {
  if (!getCurrentTime().isOngoing()) return false;

  const tab = await fetchFPTPlaceTab();
  if (!tab) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'canClick' });
    return response?.canClick ?? false;
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Failed to determine if claim is available, consider reloading page.');
  }
}

export async function hasAlarm() {
  const alarm = await chrome.alarms.get('autoClick');
  return !!alarm;
}

export async function setAlarm(log = true, override = 0) {
  let minute = 1;

  if (!override || override <= 0) {
    const timeToNext = await fetchTimeRemaining();
    if (timeToNext.length > 0) {
      const [minStr, secStr] = timeToNext.split(':');
      minute = Number(minStr) || 0;
      if (Number(secStr) > 0) minute++;
    }
  }

  void chrome.alarms.create('autoClick', {
    periodInMinutes: override > 0 ? override : minute,
    persistAcrossSessions: true,
  });

  if (log) {
    console.log(`Set ${minute} min periodic autoClick alarm`);
    void setMessage(`Set alarm: ${minute}min.`);
  }
}

export async function fetchFPTPlaceTab() {
  const tabs = await chrome.tabs.query({
    url: 'https://place.fpt.com/',
  });

  if (tabs.length <= 0) {
    const url = 'https://place.fpt.com';
    await setMessage(
      `Please open <span id="open-fpt-place" data-href="${url}" role="link">place.fpt.com</span><br>(won't run unless opened)`,
      true,
    );

    const linkEl = document.querySelector('#open-fpt-place');
    if (linkEl) {
      const openTab = (ev) => {
        ev.preventDefault();
        const targetUrl = linkEl.dataset.href || '';
        if (targetUrl && targetUrl.startsWith('http')) {
          void chrome.tabs.create({ url: targetUrl });
        }
      };
      linkEl.addEventListener('click', openTab);
      linkEl.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          openTab(ev);
        }
      });
    }
    return null;
  }

  return tabs.find((t) => t.active) || tabs.find((t) => !t.discarded) || tabs[0];
}
