chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== 'clickClaimButton') {
    return;
  }

  const button = [...document.querySelectorAll('button')]
    .find(el => {
      console.log(el.innerText);
      return el.innerText.trim() === 'Get Number Now';
    });

  if (button) {
    // button.click();
    console.log('Button clicked');
  } else {
    console.log('Button not found');
  }
});
