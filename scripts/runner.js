export function clickAcquire() {
  const button = document.querySelector('button[type=button]');

  if (button) {
    button.click();
    console.log('Button clicked');
  } else {
    console.log('Button not found');
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== 'clickButton') {
    return;
  }
});
