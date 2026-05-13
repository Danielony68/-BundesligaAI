let state = {
  quizId: null,
  questions: [],
  currentQuestion: 0,
  answers: [],
  difficulty: 'facile',
  category: 'general',
  count: 5,
  source: 'local'
};

function $(id) {
  return document.getElementById(id);
}

function showScreen(screenId) {
  const screens = [
    'menuScreen',
    'loadingScreen',
    'quizScreen',
    'resultsScreen',
    'errorScreen'
  ];

  screens.forEach((id) => {
    $(id).classList.add('hidden');
  });

  $(screenId).classList.remove('hidden');
}

function showError(message) {
  $('errorMessage').textContent = message;
  showScreen('errorScreen');
}

async function startQuiz(difficulty) {
  state.difficulty = difficulty;
  state.category = $('categorySelect').value;
  state.count = Number($('countSelect').value);

  showScreen('loadingScreen');

  try {
    const response = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        difficulty: state.difficulty,
        category: state.category,
        count: state.count
      })
    });

    const data = await response.json();

    if (!data.success) {
      showError(data.error || 'Impossible de générer le quiz.');
      return;
    }

    state.quizId = data.quizId;
    state.questions = data.questions;
    state.answers = new Array(data.questions.length);
    state.currentQuestion = 0;
    state.source = data.source;

    showScreen('quizScreen');
    renderQuestion();
  } catch (error) {
    console.error(error);
    showError('Erreur de connexion avec le serveur.');
  }
}

function renderQuestion() {
  const question = state.questions[state.currentQuestion];

  $('questionText').textContent = question.text;

  $('questionCounter').textContent =
    `Question ${state.currentQuestion + 1}/${state.questions.length}`;

  $('sourceBadge').textContent =
    state.source === 'ai' ? '🤖 IA' : '📚 Mode local';

  const progress =
    ((state.currentQuestion + 1) / state.questions.length) * 100;

  $('progressBar').style.width = `${progress}%`;

  const container = $('optionsContainer');
  container.innerHTML = '';

  question.options.forEach((option, index) => {
    const selected = state.answers[state.currentQuestion] === index;

    const button = document.createElement('button');
    button.className = selected
      ? 'w-full text-left p-4 rounded-lg border-2 border-red-600 bg-red-600 text-white font-semibold'
      : 'w-full text-left p-4 rounded-lg border-2 border-gray-300 hover:border-red-600 hover:bg-red-50 transition';

    button.textContent = option;

    button.onclick = () => {
      state.answers[state.currentQuestion] = index;
      renderQuestion();
    };

    container.appendChild(button);
  });

  $('previousBtn').disabled = state.currentQuestion === 0;
  $('previousBtn').classList.toggle('opacity-50', state.currentQuestion === 0);

  const hasAnswer = state.answers[state.currentQuestion] !== undefined;
  $('nextBtn').disabled = !hasAnswer;

  if (state.currentQuestion === state.questions.length - 1) {
    $('nextBtn').textContent = 'Voir les résultats →';
  } else {
    $('nextBtn').textContent = 'Suivant →';
  }
}

function nextQuestion() {
  if (state.answers[state.currentQuestion] === undefined) {
    return;
  }

  if (state.currentQuestion < state.questions.length - 1) {
    state.currentQuestion++;
    renderQuestion();
  } else {
    submitQuiz();
  }
}

function previousQuestion() {
  if (state.currentQuestion > 0) {
    state.currentQuestion--;
    renderQuestion();
  }
}

async function submitQuiz() {
  showScreen('loadingScreen');

  try {
    const response = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: state.quizId,
        answers: state.answers
      })
    });

    const data = await response.json();

    if (!data.success) {
      showError(data.error || 'Impossible de corriger le quiz.');
      return;
    }

    saveStats(data);
    renderResults(data);
    showScreen('resultsScreen');
  } catch (error) {
    console.error(error);
    showError('Erreur pendant la correction du quiz.');
  }
}

function renderResults(data) {
  $('scorePercent').textContent = `${data.percentage}%`;
  $('scoreText').textContent = `${data.score}/${data.total}`;

  $('analysisMessage').textContent = data.analysis.message;

  const tipsList = $('tipsList');
  tipsList.innerHTML = '';

  data.analysis.tips.forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    tipsList.appendChild(li);
  });

  const detailsList = $('detailsList');
  detailsList.innerHTML = '';

  data.results.forEach((result, index) => {
    const div = document.createElement('div');

    div.className = result.isCorrect
      ? 'p-4 rounded-lg bg-green-50 border border-green-300'
      : 'p-4 rounded-lg bg-red-50 border border-red-300';

    div.innerHTML = `
      <p class="font-bold mb-2">
        ${index + 1}. ${result.question}
      </p>

      <p>
        Votre réponse :
        <span class="${result.isCorrect ? 'text-green-700' : 'text-red-700'} font-semibold">
          ${result.userAnswerText}
        </span>
      </p>

      <p>
        Bonne réponse :
        <span class="font-semibold">${result.correctAnswerText}</span>
      </p>

      <p class="text-gray-600 mt-2">
        ${result.explanation}
      </p>
    `;

    detailsList.appendChild(div);
  });
}

function saveStats(data) {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');

  history.push({
    date: new Date().toISOString(),
    score: data.score,
    total: data.total,
    percentage: data.percentage,
    difficulty: state.difficulty,
    category: state.category
  });

  localStorage.setItem('quizHistory', JSON.stringify(history));
}

function loadStats() {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');

  if (history.length === 0) {
    $('statsTotal').textContent = '0';
    $('statsAverage').textContent = '0%';
    $('statsBest').textContent = '0%';
    return;
  }

  const total = history.length;

  const average = Math.round(
    history.reduce((sum, item) => sum + item.percentage, 0) / total
  );

  const best = Math.max(...history.map((item) => item.percentage));

  $('statsTotal').textContent = total;
  $('statsAverage').textContent = `${average}%`;
  $('statsBest').textContent = `${best}%`;
}

function returnToMenu() {
  loadStats();
  showScreen('menuScreen');
}

function restartLastQuiz() {
  startQuiz(state.difficulty);
}

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  showScreen('menuScreen');
});