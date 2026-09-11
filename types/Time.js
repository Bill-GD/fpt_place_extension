import Constants from '../scripts/constants.js';

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

  subtract(hour = 0, minute = 0, second = 0) {
    this.second -= second;
    if (this.second < 0) {
      this.second += 60;
      this.minute--;
    }
    this.minute -= minute;
    if (this.minute < 0) {
      this.minute += 60;
      this.hour--;
    }
    this.hour -= hour;
    if (this.hour < 0) {
      this.hour += 24;
    }
  }

  compare(other) {
    if (!(other instanceof Time)) return null;

    if (this.hour !== other.hour) return this.hour < other.hour ? -1 : 1;
    if (this.minute !== other.minute) return this.minute < other.minute ? -1 : 1;
    if (this.second !== other.second) return this.second < other.second ? -1 : 1;

    return 0;
  }

  isBeforeStart() {
    const { START_HOUR, START_MINUTE, START_SECOND } = Constants;
    return this.compare(new Time(START_HOUR, START_MINUTE, START_SECOND)) < 0;
  }

  isOngoing() {
    const {
      START_HOUR, START_MINUTE, START_SECOND,
      END_HOUR, END_MINUTE, END_SECOND,
    } = Constants;
    return this.compare(new Time(START_HOUR, START_MINUTE, START_SECOND)) >= 0
           && this.compare(new Time(END_HOUR, END_MINUTE, END_SECOND)) < 0;
  }

  isEnded() {
    const { END_HOUR, END_MINUTE, END_SECOND } = Constants;
    return this.compare(new Time(END_HOUR, END_MINUTE, END_SECOND)) >= 0;
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

  static getStart() {
    const { START_HOUR, START_MINUTE, START_SECOND } = Constants;
    return new Time(START_HOUR, START_MINUTE, START_SECOND);
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
