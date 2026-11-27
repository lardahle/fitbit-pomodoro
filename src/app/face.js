import clock from 'clock';
import document from 'document';
import { display } from 'display';
import { me } from 'appbit';
import { preferences } from 'user-settings';

// Clock-face layer: live clock on the normal screen, and a minimal
// always-on (AOD) layout that shows only the time and remaining minutes.
export default class Face {
  constructor(globals) {
    this._globals = globals;
    this._active = document.getElementById('activeGroup');
    this._aod = document.getElementById('aodGroup');
    this._clock = document.getElementById('clockText');
    this._aodClock = document.getElementById('aodClock');
    this._aodTimer = document.getElementById('aodTimer');

    clock.granularity = 'minutes';
    clock.ontick = (evt) => this._renderTime(evt.date);
    this._renderTime(new Date());

    if (display.aodAvailable && me.permissions.granted('access_aod')) {
      display.aodAllowed = true;
      display.addEventListener('change', () => this._renderMode());
    }
    this._renderMode();
  }

  get inAod() {
    return display.aodActive;
  }

  _formatTime(date) {
    let h = date.getHours();
    if (preferences.clockDisplay === '12h') h = h % 12 || 12;
    const m = date.getMinutes();
    return `${h}:${m < 10 ? '0' + m : m}`;
  }

  _renderTime(date) {
    const t = this._formatTime(date);
    this._clock.text = t;
    this._aodClock.text = t;
    if (this.inAod) this._renderAodTimer();
  }

  _renderAodTimer() {
    const state = this._globals.state;
    if (state === 'initialize') {
      this._aodTimer.text = '';
      return;
    }
    const mins = Math.max(0, Math.ceil(this._globals.secondsToEnd / 60));
    const paused = state.indexOf('-paused') !== -1;
    const label = state.indexOf('working') === 0 ? 'work' : 'break';
    this._aodTimer.text = paused ? `${label} paused` : `${mins} min ${label}`;
  }

  _renderMode() {
    if (this.inAod) {
      this._active.style.display = 'none';
      this._aod.style.display = 'inline';
      this._renderAodTimer();
    } else {
      this._aod.style.display = 'none';
      this._active.style.display = 'inline';
      this._renderTime(new Date());
    }
  }
}
