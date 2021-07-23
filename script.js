'use-strict';

class Workout {

  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]
      } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calculatePace();
    this._setDescription();
  }

  calculatePace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calculateSpeed();
    this._setDescription();
  }

  calculateSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const formList = document.querySelector('.form-list');
const running = document.querySelector('.worked-running');
const cycling = document.querySelector('.worked-cycling');
const inputDistance = document.querySelector('.Distance');
const inputDuration = document.querySelector('.Duration');
const inputCadence = document.querySelector('.cadenceInput');
const inputElevation = document.querySelector('.elevationInput');
const cadence = document.querySelector('.cadence');
const elevatoin = document.querySelector('.elevation');
const select = document.querySelector('select');
const workoutContainer = document.querySelector('.workouts');
const resetBtn = document.querySelector('.reset');

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._localStorageRetreival();
    select.addEventListener('change', this._changeField);
    form.addEventListener('submit', this._submitForm.bind(this));
    workoutContainer.addEventListener('click', this._moveTo.bind(this));
    resetBtn.addEventListener('click', this.reset);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._getCoords.bind(this),
        () => {
          alert('Please click on allow to continue')
        }
      )
  }

  _getCoords(curLoc) {
    const { latitude, longitude } = curLoc.coords;
    let coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);
    this._localStorageRetreivalMarkers();

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    this.#map.on('click', (clicked) => {
      this.#mapEvent = clicked;
      this._showForm();
      inputDistance.focus();
    })
  }

  _showForm() {
    form.classList.remove('hidden');
  }

  _hideForm() {
    inputElevation.value = inputCadence.value = inputDistance.value = inputDuration.value = '';
    form.classList.add('hidden');
  }

  _changeField() {
    cadence.classList.toggle('hidden');
    elevatoin.classList.toggle('hidden');
  }

  _submitForm(e) {
    e.preventDefault();

    let workout;

    const checkNumber = (...vals) => vals.every(val => Number.isFinite(val));
    const checkNumberPositive = (...vals) => vals.every(val => val > 0);

    const { lat, lng } = this.#mapEvent.latlng;
    const coordinates = [lat, lng];
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const type = select.value;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!checkNumber(distance, duration, cadence) || !checkNumberPositive(distance, duration, cadence))
        return alert('Please enter only positive numbers');
      workout = new Running(coordinates, distance, duration, cadence);
      this._markIt(workout);
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      if (!checkNumber(distance, duration, elevationGain) || !checkNumberPositive(distance, duration, elevationGain))
        return alert('Please enter only positive numbers');
      workout = new Cycling(coordinates, distance, duration, elevationGain);
      this._markIt(workout);
    }

    this._showWorkout(workout);

  }

  _markIt(workout) {
    L.marker(workout.coords).addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 50,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`
      }))
      .setPopupContent(`${workout.type === 'cycling' ? '🚴🏻‍♀️' : '🏃🏻‍♂️'} ${workout.description}`)
      .openPopup();

    this.#workouts.push(workout);
    this._localStorageSetup();
    this._hideForm();
  }

  _showWorkout(workout) {
    let html = ``;
    if (workout.type === 'cycling') {
      html = `
     <li class="worked worked-${workout.type}" data-id="${workout.id}">
     <label>${workout.description}</label>
     <div class="worked-div">
       <div>🚴🏻‍♀️ ${workout.distance}km</div>
       <div>⌚ ${workout.duration}hr</div>
       <div>⚡ ${workout.speed.toFixed(1)}km/hr</div>
       <div>⛰ ${workout.elevationGain}m</div>
     </div>
   </li>
     `;
    }
    if (workout.type === 'running') {
      html = `
      <li class="worked worked-${workout.type}" data-id="${workout.id}">
      <label>${workout.description}</label>
      <div class="worked-div">
        <div>🏃🏻‍♂️ ${workout.distance}km</div>
        <div>⌚ ${workout.duration}5hr</div>
        <div>⚡ ${workout.pace.toFixed(1)}min/km</div>
        <div>🦶 ${workout.cadence}spm</div>
      </div>
    </li>
     `;
    }

    formList.insertAdjacentHTML('afterend', html);
  }

  _moveTo(e) {
    if (!this.#map) return;

    const clicked = e.target.closest('.worked');

    if (!clicked) return;

    const workout = this.#workouts.find(val => val.id === clicked.dataset.id);

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _localStorageSetup() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _localStorageRetreival() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    data.forEach(work => this._showWorkout(work));
  }

  _localStorageRetreivalMarkers() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    data.forEach(work => this._markIt(work));
  }

  reset() {
    const val = confirm('Confirm your deletion of whole data!!');

    if (val) {
      localStorage.removeItem('workouts');
      location.reload();
    }
  }
}

const app = new App();

