export class Time {
  hour = 0;
  minute = 0;
  second = 0;

  constructor(hour = 0, minute = 0, second = 0) {
    this.hour = hour;
    this.minute = minute;
    this.second = second;
  }

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
  }

  isBeforeStart() {
    return this.hour < 8 || (this.hour === 8 && this.minute < 30);
  }

  isOngoing() {
    return ((this.hour >= 8 && this.minute >= 30) || this.hour >= 9) && this.hour < 16;
  }

  isEnded() {
    return this.hour >= 16;
  }

  getStatus() {
    if (this.isBeforeStart()) return 'Starting Soon';
    if (this.isOngoing()) return 'Ongoing';
    if (this.isEnded()) return 'Ended';
  }

  toMinutes() {
    return this.minute + this.hour * 60 + (this.second > 0 ? 1 : 0);
  }

  to(hour = 0, minute = 0, second = 0) {
    this.second = second % 60;
    this.minute = minute % 60;
    this.hour = hour % 24;
    return this;
  }

  toString() {
    return `${padStart(this.hour)}:${padStart(this.minute)}:${padStart(this.second)}`;
  }

  static now() {
    const date = new Date();

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(date);

    const time = Object.fromEntries(
      parts
        .filter(({ type }) => type !== 'literal')
        .map(({ type, value }) => [type, Number(value)]),
    );
    return new Time(time.hour, time.minute, time.second);
  }
}

function padStart(value) {
  return String(value).padStart(2, '0');
}
