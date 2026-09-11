import { Time } from '../types/Time.js';
import Constants from './constants.js';

export async function fetchCooldownTime() {
  if (!Time.now().isOngoing()) return '';

  const tab = await fetchFPTPlaceTab();
  if (!tab || tab.discarded) return '';

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCooldownTime' });
    if (response?.success === true && response?.message) {
      return String(response.message);
    }
    await setMessage(response?.message ?? 'Failed to fetch cooldown time');
    return '';
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Failed to fetch cooldown time, consider reloading page.');
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

export async function calcNextTime(fetchCooldown = false) {
  const currentTime = Time.now();
  if (!currentTime.isOngoing()) {
    setNextTime(Time.getStart().toString());
    return;
  }

  const tab = await fetchFPTPlaceTab();
  if (!tab || !tab.active || tab.discarded) {
    const { nextTime = '' } = await chrome.storage.local.get('nextTime');
    if (nextTime.includes(':')) setNextTime(nextTime);
    return;
  }

  if (fetchCooldown) {
    const cooldown = await fetchCooldownTime();
    if (cooldown.length <= 0 || !cooldown.includes(':')) {
      const { nextTime = 'N/A' } = await chrome.storage.local.get('nextTime');
      setNextTime(nextTime);
      return;
    }

    const [minStr, secStr] = cooldown.split(':');
    currentTime.add(0, Number(minStr) || 0, Number(secStr) || 0);
  } else {
    currentTime.add(0, Constants.MAX_COOLDOWN_MIN);
  }
  setNextTime(currentTime.isOngoing() ? currentTime.toString() : Time.getStart().toString());
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

async function getCollected() {
  const tab = await fetchFPTPlaceTab();
  if (!tab || tab.discarded) {
    return (await chrome.storage.local.get('collected'))?.collected ?? null;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getCollected',
      isOngoing: Time.now().isOngoing(),
    });
    return response?.collected ?? null;
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Failed to fetch collected count, consider reloading page.');
  }
  return null;
}

export async function updateCollected() {
  const collected = await getCollected();
  if (collected) setCollected(collected);
}

export async function canClaim() {
  if (!Time.now().isOngoing()) return false;

  const tab = await fetchFPTPlaceTab();
  if (!tab) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'canClaim' });
    return response?.canClaim ?? false;
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Failed to determine if claim is available, consider reloading page.');
  }
}

export async function updateMaxCountAndLastClaim() {
  let time = Time.now();
  if (time.isEnded()) return;
  if (time.isBeforeStart()) {
    const { START_HOUR, START_MINUTE, START_SECOND } = Constants;
    time = time.to(START_HOUR, START_MINUTE, START_SECOND);
  }

  const collected = Number((await getCollected() ?? '0/10').split('/')[0]);

  let minute = Constants.MAX_COOLDOWN_MIN;
  const cooldownTime = await fetchCooldownTime();
  if (cooldownTime.length > 0) {
    const [minStr, secStr] = cooldownTime.split(':');
    minute = Number(minStr) || 0;
    if (Number(secStr) > 0) minute++;
  }
  time.add(0, minute);

  let canCollectCount = 1;

  while (time.isOngoing()) {
    time.add(0, Constants.MAX_COOLDOWN_MIN);
    if (time.isOngoing()) canCollectCount++;
  }
  if (time.isEnded()) time.subtract(0, Constants.MAX_COOLDOWN_MIN);

  const maxToday = Math.min(collected + canCollectCount, 10);

  if (typeof document !== 'undefined') {
    const maxCountEl = document.querySelector('#max-count-today');
    if (maxCountEl) {
      maxCountEl.innerText = `${maxToday}/10`;
    }

    const lastClaimTimeEl = document.querySelector('#last-claim-time');
    if (lastClaimTimeEl) {
      lastClaimTimeEl.innerText = `~${time.toString()}`;
    }
  }
}

export async function hasAlarm() {
  const alarm = await chrome.alarms.get('autoClick');
  return !!alarm;
}

export async function setAlarm(log = true, override = 0) {
  let minute = Constants.MAX_COOLDOWN_MIN;

  if (!override || override <= 0) {
    const cooldownTime = await fetchCooldownTime();
    if (cooldownTime.length > 0) {
      const [minStr, secStr] = cooldownTime.split(':');
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
  const url = 'https://place.fpt.com/';
  const tabs = await chrome.tabs.query({ url });

  if (tabs.length <= 0) {
    await setMessage(
      `Please open <span id="open-fpt-place" role="link">place.fpt.com</span><br>(won't run unless opened)`,
      true,
    );

    const linkEl = document.querySelector('#open-fpt-place');
    if (linkEl) {
      const openTab = (ev) => {
        ev.preventDefault();
        void chrome.tabs.create({ url });
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
