const events = ['clickClaimButton', 'forceClaim', 'getCollected', 'getCooldownTime', 'canClick'];

function findClaimButton() {
  return [...document.querySelectorAll('button')].find((el) => {
    return el.innerText.trim().startsWith('Get Number');
  });
}

function isButtonReady(button) {
  if (!button) return false;
  const isCounting = button.innerText.includes('(');
  const isDisabled = button.disabled || button.getAttribute('disabled') !== null || button.getAttribute('aria-disabled') === 'true';
  return !isCounting && !isDisabled;
}

function simulateClick(element) {
  element.focus();
  const eventOptions = { bubbles: true, cancelable: true, view: window };
  element.dispatchEvent(new PointerEvent('pointerdown', eventOptions));
  element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
  element.dispatchEvent(new PointerEvent('pointerup', eventOptions));
  element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
  element.click();
}

async function waitForButtonReady(timeoutMs = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const button = findClaimButton();
    if (isButtonReady(button)) {
      return { ready: true, button };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const button = findClaimButton();
  return { ready: isButtonReady(button), button };
}

async function handleClaim(isForce = false) {
  const { ready, button } = await waitForButtonReady(isForce ? 3000 : 10000);

  if (!button) {
    return { success: false, message: 'Button not found' };
  }

  if (!ready) {
    if (button.innerText.includes('(')) {
      const remaining = button.innerText.trim().split('(')[1].slice(0, -1);
      return {
        success: false,
        remainingTime: remaining,
        message: `Button still on countdown: (${remaining})`,
      };
    }
    return {
      success: false,
      message: 'Button is currently disabled',
    };
  }

  simulateClick(button);

  await new Promise((resolve) => setTimeout(resolve, 500));

  void chrome.runtime.sendMessage({ action: 'resetAlarm' });
  return {
    success: true,
    message: `Claimed number at ${new Date().toLocaleTimeString(undefined, { hour12: false })}`,
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!events.includes(message.action)) return;

  switch (message.action) {
    case 'getCollected': {
      if (message?.isOngoing === true) {
        const text = [...document.querySelectorAll('p')].find((el) => {
          return el.innerText.trim().endsWith('number(s) today');
        });
        if (!text) {
          sendResponse({ success: false, message: 'Count text not found' });
          return;
        }
        sendResponse({ success: true, collected: text.innerText.trim().split(' ')[1] });
      } else if (message?.isOngoing === false) {
        const button = [...document.querySelectorAll('button')].find((el) => {
          return el.innerText.trim().endsWith('number(s) today');
        });
        if (!button) {
          sendResponse({ success: false, message: 'Count button not found' });
          return;
        }
        sendResponse({ success: true, collected: button.innerText.trim().split(' ')[1] });
      }
      return;
    }
    case 'canClick': {
      const button = findClaimButton();
      sendResponse({ success: true, canClick: isButtonReady(button) });
      return;
    }
    case 'getCooldownTime': {
      const button = findClaimButton();
      if (!button) {
        sendResponse({ success: false, message: 'Button not found' });
        return;
      }
      if (button.innerText.includes('(')) {
        sendResponse({ success: true, message: button.innerText.trim().split('(')[1].slice(0, -1) });
      } else {
        sendResponse({ success: true, message: '00:00' });
      }
      return;
    }
    default: {
      handleClaim(message.action === 'forceClaim').then(sendResponse);
      return true;
    }
  }
});
