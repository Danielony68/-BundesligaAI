require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Vérifier si OpenAI est disponible
const hasOpenAIKey =
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY.startsWith('sk-') &&
  !process.env.OPENAI_API_KEY.includes('votre');

const openai = hasOpenAIKey
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Stockage temporaire des quiz
const quizStore = new Map();

// ------------------------------
// Fonctions utilitaires
// ------------------------------

function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function normalizeQuiz(rawQuiz, count) {
  if (!rawQuiz || !Array.isArray(rawQuiz.questions)) {
    throw new Error('Format du quiz invalide');
  }

  const questions = rawQuiz.questions
    .slice(0, count)
    .map((q, index) => {
      const correct = Number(q.correct);

      if (
        !q.text ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        Number.isNaN(correct) ||
        correct < 0 ||
        correct > 3
      ) {
        return null;
      }

      return {
        id: index + 1,
        text: String(q.text),
        options: q.options.map(String),
        correct,
        explanation: String(q.explanation || 'Explication non disponible.')
      };
    })
    .filter(Boolean);

  if (questions.length < count) {
    throw new Error('Pas assez de questions valides générées');
  }

  return questions;
}

function fallbackQuestions(category = 'general', count = 5) {
  const allQuestions = [
    {
      category: 'clubs',
      text: 'Quelle ville est associée au Bayern Munich ?',
      options: ['Berlin', 'Munich', 'Hambourg', 'Dortmund'],
      correct: 1,
      explanation: 'Le Bayern Munich est basé à Munich, en Bavière.'
    },
    {
      category: 'clubs',
      text: 'Quelles sont les couleurs traditionnelles du Borussia Dortmund ?',
      options: ['Rouge et blanc', 'Bleu et blanc', 'Noir et jaune', 'Vert et blanc'],
      correct: 2,
      explanation: 'Le Borussia Dortmund est célèbre pour ses couleurs noir et jaune.'
    },
    {
      category: 'histoire',
      text: 'En quelle saison la Bundesliga a-t-elle commencé ?',
      options: ['1950-1951', '1963-1964', '1974-1975', '1990-1991'],
      correct: 1,
      explanation: 'La première saison de Bundesliga a eu lieu en 1963-1964.'
    },
    {
      category: 'histoire',
      text: 'Quel club a remporté la première édition de la Bundesliga ?',
      options: ['FC Bayern Munich', 'Borussia Dortmund', 'FC Cologne', 'Hambourg SV'],
      correct: 2,
      explanation: 'Le FC Cologne a remporté la première Bundesliga en 1963-1964.'
    },
    {
      category: 'joueurs',
      text: 'Quel joueur a marqué 41 buts en Bundesliga lors de la saison 2020-2021 ?',
      options: ['Erling Haaland', 'Robert Lewandowski', 'Thomas Müller', 'Timo Werner'],
      correct: 1,
      explanation: 'Robert Lewandowski a marqué 41 buts, battant le record de Gerd Müller.'
    },
    {
      category: 'joueurs',
      text: 'À quel poste jouait principalement Oliver Kahn ?',
      options: ['Défenseur', 'Milieu', 'Gardien de but', 'Attaquant'],
      correct: 2,
      explanation: 'Oliver Kahn était un gardien de but légendaire du Bayern Munich.'
    },
    {
      category: 'clubs',
      text: 'Quel stade est associé au Borussia Dortmund ?',
      options: ['Allianz Arena', 'Signal Iduna Park', 'Olympiastadion', 'Volksparkstadion'],
      correct: 1,
      explanation: 'Le Borussia Dortmund joue au Signal Iduna Park.'
    },
    {
      category: 'clubs',
      text: 'Dans quelle ville se trouve Schalke 04 ?',
      options: ['Gelsenkirchen', 'Leipzig', 'Brême', 'Stuttgart'],
      correct: 0,
      explanation: 'Schalke 04 est basé à Gelsenkirchen.'
    },
    {
      category: 'histoire',
      text: 'Comment appelle-t-on le trophée remis au champion de Bundesliga ?',
      options: ['DFB-Pokal', 'Meisterschale', 'Supercup', 'Goldener Ball'],
      correct: 1,
      explanation: 'Le trophée de champion d’Allemagne est appelé Meisterschale.'
    },
    {
      category: 'general',
      text: 'Quel derby oppose traditionnellement Dortmund et Schalke ?',
      options: ['Der Klassiker', 'Revierderby', 'Nordderby', 'Berlin Derby'],
      correct: 1,
      explanation: 'Le Revierderby oppose Borussia Dortmund et Schalke 04.'
    },
    {
      category: 'clubs',
      text: 'Quel club joue à l’Allianz Arena ?',
      options: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen'],
      correct: 0,
      explanation: 'L’Allianz Arena est le stade du Bayern Munich.'
    },
    {
      category: 'general',
      text: 'Combien de points rapporte une victoire en Bundesliga ?',
      options: ['1 point', '2 points', '3 points', '4 points'],
      correct: 2,
      explanation: 'Une victoire rapporte 3 points.'
    }
  ];

  let pool = allQuestions;

  if (category !== 'general') {
    const filtered = allQuestions.filter((q) => q.category === category);
    if (filtered.length >= count) {
      pool = filtered;
    }
  }

  return shuffle(pool)
    .slice(0, count)
    .map((q, index) => ({
      id: index + 1,
      text: q.text,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation
    }));
}

async function generateQuizWithAI(difficulty, category, count) {
  if (!openai) {
    throw new Error('OpenAI non configuré');
  }

  const prompt = `
Tu es un expert de football allemand et de Bundesliga.

Génère un quiz en français sur la Bundesliga.

Paramètres :
- Nombre de questions : ${count}
- Difficulté : ${difficulty}
- Catégorie : ${category}

Règles :
- Chaque question doit avoir exactement 4 options.
- "correct" doit être l'index de la bonne réponse : 0, 1, 2 ou 3.
- Les questions doivent être factuelles et vérifiables.
- Évite les informations trop récentes ou incertaines.
- Réponds uniquement en JSON valide.

Format obligatoire :
{
  "questions": [
    {
      "text": "Question ici ?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Explication courte."
    }
  ]
}
`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Tu es un expert fiable de la Bundesliga.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const content = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return normalizeQuiz(parsed, count);
}

function fallbackAnalysis(score, total) {
  const percentage = Math.round((score / total) * 100);

  if (percentage >= 80) {
    return {
      message: 'Excellent résultat ! Vous connaissez très bien la Bundesliga.',
      tips: [
        'Essayez maintenant le niveau difficile.',
        'Testez une catégorie plus spécialisée.',
        'Continuez à suivre les statistiques des clubs.'
      ],
      nextLevel: 'difficile'
    };
  }

  if (percentage >= 50) {
    return {
      message: 'Bon résultat ! Vous avez de bonnes bases, mais vous pouvez encore progresser.',
      tips: [
        'Révisez l’histoire des grands clubs allemands.',
        'Apprenez les stades et les rivalités importantes.',
        'Refaites un quiz en niveau moyen.'
      ],
      nextLevel: 'moyen'
    };
  }

  return {
    message: 'Ce n’est pas grave ! C’est une bonne occasion d’apprendre.',
    tips: [
      'Commencez par le niveau facile.',
      'Apprenez les clubs principaux : Bayern, Dortmund, Schalke, Leverkusen.',
      'Regardez les bases de l’histoire de la Bundesliga.'
    ],
    nextLevel: 'facile'
  };
}

async function analyzeResultsWithAI(score, total, results) {
  if (!openai) {
    return fallbackAnalysis(score, total);
  }

  try {
    const percentage = Math.round((score / total) * 100);

    const prompt = `
Un utilisateur a terminé un quiz Bundesliga.

Score : ${score}/${total}
Pourcentage : ${percentage}%

Résultats :
${JSON.stringify(results)}

Donne une analyse courte, motivante et 3 conseils d'amélioration.

Réponds uniquement en JSON :
{
  "message": "Analyse courte",
  "tips": ["Conseil 1", "Conseil 2", "Conseil 3"],
  "nextLevel": "facile|moyen|difficile"
}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      message: parsed.message || fallbackAnalysis(score, total).message,
      tips: Array.isArray(parsed.tips) ? parsed.tips : fallbackAnalysis(score, total).tips,
      nextLevel: parsed.nextLevel || 'moyen'
    };
  } catch (error) {
    console.log('Analyse IA impossible, utilisation du mode local.');
    return fallbackAnalysis(score, total);
  }
}

// ------------------------------
// Routes
// ------------------------------

app.get('/', (req, res) => {
  res.render('index', {
    title: 'Quiz Bundesliga IA'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API fonctionne',
    openai: Boolean(openai)
  });
});

app.post('/api/quiz/generate', async (req, res) => {
  try {
    const difficulty = req.body.difficulty || 'facile';
    const category = req.body.category || 'general';
    const count = Math.min(Math.max(Number(req.body.count) || 5, 3), 10);

    let questions;
    let source = 'ai';

    try {
      questions = await generateQuizWithAI(difficulty, category, count);
    } catch (error) {
      console.log('Mode local utilisé :', error.message);
      questions = fallbackQuestions(category, count);
      source = 'local';
    }

    const quizId = crypto.randomUUID();

    quizStore.set(quizId, {
      questions,
      difficulty,
      category,
      createdAt: Date.now()
    });

    const publicQuestions = questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options
    }));

    res.json({
      success: true,
      quizId,
      questions: publicQuestions,
      source
    });
  } catch (error) {
    console.error('Erreur génération quiz :', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de générer le quiz.'
    });
  }
});

app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { quizId, answers } = req.body;

    const quiz = quizStore.get(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz introuvable ou expiré.'
      });
    }

    let score = 0;

    const results = quiz.questions.map((question, index) => {
      const userAnswer = Number(answers[index]);
      const isCorrect = userAnswer === question.correct;

      if (isCorrect) score++;

      return {
        question: question.text,
        options: question.options,
        userAnswer,
        userAnswerText: question.options[userAnswer] || 'Aucune réponse',
        correctAnswer: question.correct,
        correctAnswerText: question.options[question.correct],
        isCorrect,
        explanation: question.explanation
      };
    });

    const percentage = Math.round((score / quiz.questions.length) * 100);

    const analysis = await analyzeResultsWithAI(
      score,
      quiz.questions.length,
      results
    );

    quizStore.delete(quizId);

    res.json({
      success: true,
      score,
      total: quiz.questions.length,
      percentage,
      results,
      analysis
    });
  } catch (error) {
    console.error('Erreur soumission quiz :', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de corriger le quiz.'
    });
  }
});

// Lancement serveur
app.listen(PORT, () => {
  console.log(`✅ Application lancée : http://localhost:${PORT}`);

  if (openai) {
    console.log('🤖 OpenAI activé');
  } else {
    console.log('⚠️ OpenAI non configuré : mode local activé');
  }
});