let unlockedGame = 1
let completedGames = new Set()
let currentModule = 1
let lessonIndex = 0

let currentGame = 1
let currentSentenceLevel = 1
let unlockedSentenceLevel = 1
let completedSentenceLevels = new Set()
let currentQuestion = 0
let questions = []

let score = 0
let streak = 0
let correctAnswers = 0
let hintCount = 0
let rewardTracker = 0
let carryScore = 0
let carryStreak = 0
let carryHintCount = 0
let gameStartRecords = {
  "1-1": { score: 0, streak: 0, hintCount: 0 }
}

let alreadyAnswered = false
let questionTimerInterval = null
let questionDuration = 15
let questionTimeLeft = 15
let musicMuted = false

let lessonTimerInterval = null
let readTimeLeft = 5
let skipLessonReadTimer = false
let resetStatsOnNextGameStart = false
let activeLessons = null
let activeGuideMessages = null
let lessonStartsGame = true
let playerName = ""
let earnedBadges = new Set()
let badgeProgress = {}
let playerProfiles = []
let activeProfileId = ""
let creatingNewPlayer = false
let allBadgesBonusAwarded = false
let activeGame2Text = null
let badgeRunSnapshot = null
let savedAnswerRuns = []
let currentRunAnswers = []
let learnResponses = {}
let learnResponseSaveTimer = null
let developerAuthorized = false
let developerPreviewMode = false
let developerLastQuestionList = { type: "questions", game: 1 }

const fixedLayout = {
  width: 1280,
  height: 720
}

const DEVELOPER_PASSWORD = "135790"

const QUESTIONS_PER_RUN = 5
const PASSING_ANSWERS = 4
const GAME_1_QUESTIONS_PER_LEVEL = 10
const GAME_1_PASSING_RATE = 0.6
const BADGE_REQUIRED_CORRECT = 3
const ALL_BADGES_BONUS = 100
const BADGE_CAP = 5
const MAX_SAVED_ANSWER_RUNS = 20
const MAX_CLASSROOM_ANSWER_RUNS = 5
const MAX_LEARN_RESPONSES = 20
const MAX_LEARN_RESPONSE_LENGTH = 700

const learnTopicClasses = [
  "learn-topic-game",
  "learn-topic-overview",
  "learn-topic-module1",
  "learn-topic-module2",
  "learn-topic-module3"
]

const playerProfileStorageKey = "figurativeForcePlayerProfile"
const playerProfilesStorageKey = "figurativeForcePlayerProfiles"
const activePlayerStorageKey = "figurativeForceActivePlayer"
const multiplayerClientStorageKey = "figurativeForceClassroomClient"
const classroomRoomStorageKey = "metaphoriaClassroomRoom"
const classroomApiStorageKey = "metaphoriaClassroomApi"
let multiplayerRoomCode = getInitialMultiplayerRoomCode()
let classroomApiBase = getInitialClassroomApiBase()

let multiplayerClientId = ""
let multiplayerConnected = false
let multiplayerEventSource = null
let multiplayerScoreTimer = null
let multiplayerPollTimer = null
let multiplayerHeartbeatTimer = null

const badgeDefinitions = {
  simile: {
    label: "Simile",
    display: "assets/images/simile-badge.png",
    id: "assets/images/c-simile-badge.png"
  },
  metaphor: {
    label: "Metaphor",
    display: "assets/images/metaphor-badge.png",
    id: "assets/images/c-metaphor-badge.png"
  },
  personification: {
    label: "Personification",
    display: "assets/images/personification-badge.png",
    id: "assets/images/c-personification-badge.png"
  },
  hyperbole: {
    label: "Hyperbole",
    display: "assets/images/hyperbole-badge.png",
    id: "assets/images/c-hyperbole-badge.png"
  },
  symbolism: {
    label: "Symbolism",
    display: "assets/images/symbolism-badge.png",
    id: "assets/images/c-symbolism-badge.png"
  }
}

function createEmptyBadgeProgress() {
  return Object.keys(badgeDefinitions).reduce((progress, badgeId) => {
    progress[badgeId] = 0
    return progress
  }, {})
}

function snapshotBadgeState() {
  return {
    earnedBadges: [...earnedBadges],
    badgeProgress: { ...badgeProgress },
    allBadgesBonusAwarded
  }
}

function captureBadgeRunStart() {
  badgeRunSnapshot = snapshotBadgeState()
}

function restoreBadgeRunStart() {
  if (!badgeRunSnapshot) return

  earnedBadges = new Set(badgeRunSnapshot.earnedBadges.filter(badgeId => badgeDefinitions[badgeId]).slice(0, BADGE_CAP))
  badgeProgress = { ...createEmptyBadgeProgress(), ...badgeRunSnapshot.badgeProgress }
  allBadgesBonusAwarded = badgeRunSnapshot.allBadgesBonusAwarded
  updateGameIdCard()
}

function rollbackCurrentRunProgress() {
  restoreBadgeRunStart()
  discardCurrentRunAnswers()

  const startRecord = gameStartRecords[getGameStartKey(currentGame)]
  if (startRecord) {
    score = startRecord.score
    streak = startRecord.streak
    hintCount = startRecord.hintCount
  }

  updateStats()
  savePlayerProfile()
}

function updateFixedLayout() {
  const viewport = window.visualViewport
  const viewportWidth = Math.min(
    viewport?.width || Infinity,
    document.documentElement.clientWidth || Infinity,
    window.innerWidth || Infinity
  )
  const viewportHeight = Math.min(
    viewport?.height || Infinity,
    document.documentElement.clientHeight || Infinity,
    window.innerHeight || Infinity
  )
  const scale = Math.min(viewportWidth / fixedLayout.width, viewportHeight / fixedLayout.height)
  const left = Math.max(0, (viewportWidth - fixedLayout.width * scale) / 2)
  const top = Math.max(0, (viewportHeight - fixedLayout.height * scale) / 2)

  document.documentElement.style.setProperty("--stage-scale", scale.toString())
  document.documentElement.style.setProperty("--fixed-scale", scale.toString())
  document.documentElement.style.setProperty("--fixed-left", `${left}px`)
  document.documentElement.style.setProperty("--fixed-top", `${top}px`)

  window.requestAnimationFrame(() => {
    fitQuestionTextToCard()
    fitGame1ChoicesToBoard()
    fitLessonToScroll()
  })
}

updateFixedLayout()
window.addEventListener("resize", updateFixedLayout)
window.addEventListener("orientationchange", updateFixedLayout)

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateFixedLayout)
}
window.addEventListener("orientationchange", updateFixedLayout)
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateFixedLayout)
  window.visualViewport.addEventListener("scroll", updateFixedLayout)
}

const gameMechanicsPages = {
  1: {
    title: "Sentence Sleuths",
    content: `<div class="game-mechanics-card">
      <h2>Game Mechanics</h2>
      <div class="mechanics-mini-grid">
        <div><strong>Goal</strong><span>Read each sentence and identify the literary device.</span></div>
        <div><strong>Levels</strong><span>Clear Levels 1, 2, and 3 before Text Detectives unlocks.</span></div>
        <div><strong>Scoring</strong><span>Correct answer: +10. Streaks and hints help your run.</span></div>
        <div><strong>Tools</strong><span>Use Hint or 50/50 when you need support.</span></div>
      </div>
      <p class="mechanics-flow-line">Read → Choose → Feedback → Points → Next Level</p>
    </div>`
  },
  2: {
    title: "Text Detectives",
    content: `<div class="game-mechanics-card">
      <h2>Game Mechanics</h2>
      <div class="mechanics-mini-grid">
        <div><strong>Goal</strong><span>Analyze a short literary text and spot the device used.</span></div>
        <div><strong>Questions</strong><span>Identify, understand meaning, and use context clues.</span></div>
        <div><strong>Scoring</strong><span>Correct answers add points and build your streak.</span></div>
        <div><strong>Tools</strong><span>Hints give definitions or examples without giving away the answer.</span></div>
      </div>
      <p class="mechanics-flow-line">Read Text → Study Clue → Choose → Feedback</p>
    </div>`
  },
  3: {
    title: "Expression Lab",
    content: `<div class="game-mechanics-card">
      <h2>Game Mechanics</h2>
      <div class="mechanics-mini-grid">
        <div><strong>Goal</strong><span>Rewrite a literal sentence using the requested figure of speech.</span></div>
        <div><strong>Rules</strong><span>Simile needs like/as. Metaphor is direct. Personification gives human action.</span></div>
        <div><strong>Scoring</strong><span>Correct creative answer: +15.</span></div>
        <div><strong>Tools</strong><span>Use the hint if you need a rule reminder before submitting.</span></div>
      </div>
      <p class="mechanics-flow-line">Read → Rewrite → Submit → Feedback</p>
    </div>`
  }
}

const modules = {
  1: [gameMechanicsPages[1]],
  2: [gameMechanicsPages[2]],
  3: [gameMechanicsPages[3]]
}

function notice(text) {
  return `<p class="lesson-notice"><strong>Notice:</strong> ${text}</p>`
}

function module1Rows(items, className = "") {
  return `<div class="module1-row-list ${className}">${items.map(item => `
    <div class="module1-row">
      <strong>${item.label}</strong>
      <span>${item.text}</span>
    </div>
  `).join("")}</div>`
}

function module1Activity(activityId, directions, items, startNumber = 1, className = "", showCheckButton = true) {
  const safeClassName = String(className || "").replace(/[^a-z0-9_-]/gi, " ").trim()

  return `<div class="lesson-activity ${safeClassName}" data-activity-id="${activityId}">
    ${directions ? `<p class="lesson-activity-directions">${directions}</p>` : ""}
    <div class="lesson-activity-items">
      ${items.map((item, index) => `
        <label class="lesson-activity-row">
          <span class="lesson-activity-prompt"><strong>${startNumber + index}.</strong> ${item.prompt}</span>
          <input type="text" maxlength="24" autocomplete="off" data-activity-response-id="${escapeHtml(item.responseId || `${activityId}-activity-${startNumber + index}`)}" data-activity-title="${escapeHtml(directions || "Learning Activity")}" data-activity-prompt="${escapeHtml(item.prompt)}" data-activity-answer="${escapeHtml(item.answer)}" data-activity-accept="${escapeHtml(item.accept || "")}" aria-label="Answer ${startNumber + index}" oninput="saveLessonActivityResponse('${escapeHtml(activityId)}', ${startNumber + index}, this)" />
          <span class="lesson-activity-result" aria-live="polite"></span>
        </label>
      `).join("")}
    </div>
    ${showCheckButton ? `<button type="button" class="lesson-check-btn" onclick="sparkButton(this); checkLessonActivity('${activityId}')">Check Answers</button>` : ""}
  </div>`
}

function lessonResponse(responseId, title, prompt, placeholder = "Type your answer here.") {
  return `<div class="lesson-response" data-lesson-response="${escapeHtml(responseId)}" data-response-title="${escapeHtml(title)}" data-response-prompt="${escapeHtml(prompt)}">
    <label for="${escapeHtml(responseId)}">${escapeHtml(prompt)}</label>
    <textarea id="${escapeHtml(responseId)}" class="lesson-response-field" maxlength="${MAX_LEARN_RESPONSE_LENGTH}" placeholder="${escapeHtml(placeholder)}" oninput="saveLessonResponse('${escapeHtml(responseId)}', this.value)"></textarea>
  </div>`
}

function lessonAnswerField(responseId, title, prompt, labelHtml = "", placeholder = "Type your answer here.", longAnswer = false) {
  const safeId = escapeHtml(responseId)
  const safePrompt = escapeHtml(prompt)
  const safeTitle = escapeHtml(title)
  const safePlaceholder = escapeHtml(placeholder)
  const field = longAnswer
    ? `<textarea id="${safeId}" class="lesson-response-field lesson-response-field-long" maxlength="${MAX_LEARN_RESPONSE_LENGTH}" placeholder="${safePlaceholder}" oninput="saveLessonResponse('${safeId}', this.value)"></textarea>`
    : `<input id="${safeId}" class="lesson-response-field lesson-response-field-short" type="text" maxlength="${MAX_LEARN_RESPONSE_LENGTH}" placeholder="${safePlaceholder}" oninput="saveLessonResponse('${safeId}', this.value)" />`

  return `<label class="lesson-answer-item" data-lesson-response="${safeId}" data-response-title="${safeTitle}" data-response-prompt="${safePrompt}">
    <span class="lesson-answer-prompt">${labelHtml || safePrompt}</span>
    ${field}
  </label>`
}

function lessonAnswerList(baseId, title, items, className = "") {
  return `<div class="lesson-answer-list ${className}">
    ${items.map((item, index) => {
      const config = typeof item === "string" ? { prompt: item } : item
      return lessonAnswerField(
        config.id || `${baseId}-${index + 1}`,
        config.title || title,
        config.prompt,
        config.html || escapeHtml(config.prompt),
        config.placeholder || "Type your answer here.",
        Boolean(config.long)
      )
    }).join("")}
  </div>`
}

function lessonInlineAnswer(responseId, title, prompt, placeholder = "Answer") {
  const safeId = escapeHtml(responseId)
  const safePrompt = escapeHtml(prompt)

  return `<span class="lesson-inline-answer" data-lesson-response="${safeId}" data-response-title="${escapeHtml(title)}" data-response-prompt="${safePrompt}">
    <input id="${safeId}" class="lesson-response-field lesson-inline-answer-field" type="text" maxlength="80" placeholder="${escapeHtml(placeholder)}" aria-label="${safePrompt}" oninput="saveLessonResponse('${safeId}', this.value)" />
  </span>`
}

const learnModules = {
  overview: [
    {
      title: "Overview",
      content: `<h2>What is a Literary Device?</h2><p>Literary devices enhance writing by adding depth, emphasis, and a richer sensory experience for the reader.</p><p>They are tools and techniques that poets use to enrich meaning, imagery, and impact.</p>`
    },
    {
      title: "Overview",
      content: `<h2>Importance of Literary Devices</h2><ul class="lesson-list"><li>Enhance creativity and artistic quality</li><li>Help readers understand deeper meanings</li><li>Make ideas and emotions more vivid</li><li>Improve the effectiveness of descriptions</li><li>Increase appreciation and interest in literary works</li></ul>`
    },
    {
      title: "Overview",
      content: `<h2>Two Kinds of Literary Devices</h2><p>Literary devices have two aspects:</p><ul class="lesson-list"><li>Literary Elements</li><li>Literary Techniques</li></ul>`
    },
    {
      title: "Literary Elements",
      content: `<h2>Literary Elements</h2><p>Literary elements have an inherent existence in a literary piece.</p><p>They are extensively employed by writers to develop a literary work.</p>`
    },
    {
      title: "Literary Elements",
      content: `<h2>Examples</h2><ul class="lesson-list"><li>Plot</li><li>Setting</li><li>Narrative Structure</li><li>Characters</li><li>Mood</li><li>Theme</li><li>Moral</li></ul>`
    },
    {
      title: "Literary Techniques",
      content: `<h2>Literary Techniques</h2><p>Literary techniques are words, phrases, or structures used to achieve artistic ends and help readers understand literary works better.</p><ul class="lesson-list"><li>Metaphor</li><li>Simile</li><li>Alliteration</li><li>Hyperbole</li><li>Personification</li></ul>`
    },
    {
      title: "Categories",
      content: `<h2>Categories of Literary Devices</h2><ul class="lesson-list"><li>Figurative Language / Figures of Speech</li><li>Sound Devices</li><li>Sensory Devices</li></ul>`
    },
    {
      title: "References",
      content: `<h2>References</h2><ul class="lesson-list"><li>Department of Education. Lesson Exemplar for English Grade 7, Quarter 1: Lesson 4 of 8, SY 2024-2025.</li><li>Figure of Speech - Examples and Definition of Figure of Speech.</li></ul>`
    }
  ],
  module1: [
    {
      title: "Slide 1",
      content: `<h2>Overview</h2><p>This lesson deals with understanding literary devices, their importance, and their classification into literary elements and literary techniques.</p><p>Through explanations, examples, and learning activities, you will explore how literary devices enrich literary texts by making them more meaningful, creative, and engaging.</p>`
    },
    {
      title: "Slide 2",
      content: `<h2>Compare the Sentences</h2><div class="module1-compare-grid"><strong>Without Literary Devices</strong><strong>With Literary Devices</strong><span>The flowers were beautiful.</span><span>The flowers danced gracefully in the gentle breeze.</span><span>The room was quiet.</span><span>The room was as silent as a grave.</span></div>`
    },
    {
      title: "Slide 3",
      content: `<h2>Guide Questions</h2><p>After reading the examples, answer the following:</p><ul class="lesson-list"><li>Which set of sentences is more interesting to read? Why?</li><li>How do literary devices help readers imagine the scene?</li><li>How do these expressions make you feel as a reader?</li></ul>`
    },
    {
      title: "Slide 4",
      content: `<h2>Learning Objectives</h2><p>At the end of this lesson, learners should be able to:</p><ul class="lesson-list"><li><strong>Cognitive:</strong> Identify the meaning, importance, and categories of literary devices used in literary texts.</li><li><strong>Affective:</strong> Appreciate how literary devices make literary texts more engaging, meaningful, and emotionally impactful.</li><li><strong>Psychomotor:</strong> Classify literary devices into literary elements and literary techniques.</li></ul>`
    },
    {
      title: "Slide 5",
      content: `<h2>What are Literary Devices?</h2><p>Literary devices are tools and techniques that writers use to enhance the meaning, style, and impact of their work.</p><p>They help create vivid descriptions, express emotions, emphasize ideas, and engage readers more effectively.</p><p>Writers use literary devices in poems, stories, songs, speeches, and plays to make language creative, meaningful, and memorable.</p>`
    },
    {
      title: "Slide 6",
      content: `<h2>Two Kinds of Literary Devices</h2><p>Literary devices are generally classified into two major categories:</p><ul class="lesson-list"><li>Literary Elements</li><li>Literary Techniques</li></ul><p>Understanding the difference between these categories helps readers analyze literary texts more effectively.</p>`
    },
    {
      title: "Slide 7",
      content: `<h2>Literary Elements</h2><p>Literary elements are the fundamental parts that naturally exist in literary works.</p><p>They are the building blocks of stories, poems, dramas, and other literary texts. Without these elements, a literary work would be incomplete.</p>`
    },
    {
      title: "Slide 8",
      content: `<h2>Common Literary Elements</h2>${module1Rows([{ label: "Plot", text: "The sequence of events in a story." }, { label: "Setting", text: "The time and place where the story happens." }, { label: "Narrative Structure", text: "The way the story is organized and presented." }, { label: "Characters", text: "The people, animals, or beings who take part in the story." }])}`
    },
    {
      title: "Slide 9",
      content: `<h2>More Literary Elements</h2>${module1Rows([{ label: "Mood", text: "The feeling or atmosphere experienced by the reader." }, { label: "Theme", text: "The central message or main idea of the story." }, { label: "Moral", text: "The lesson or value learned from the story." }, { label: "Tone", text: "The author's attitude toward the subject or audience." }])}<p>Literary elements provide the structure that allows stories and poems to develop meaning and coherence.</p>`
    },
    {
      title: "Slide 10",
      content: `<h2>Literary Techniques</h2><p>Literary techniques are specific methods or language choices that writers intentionally use to make their writing more expressive, artistic, and memorable.</p><p>Unlike literary elements, literary techniques are optional. Writers use them to create emphasis, add beauty, or strengthen the impact of their message.</p>`
    },
    {
      title: "Slide 11",
      content: `<h2>Common Literary Techniques</h2>${module1Rows([{ label: "Simile", text: "Compares unlike things using <strong>like</strong> or <strong>as</strong>. Example: Her smile was as bright as the sun." }, { label: "Metaphor", text: "Directly compares unlike things without using <strong>like</strong> or <strong>as</strong>. Example: Time is a thief." }, { label: "Personification", text: "Gives human qualities to non-human things. Example: The wind whispered through the trees." }, { label: "Hyperbole", text: "Uses intentional exaggeration for emphasis. Example: I've told you a million times." }])}`
    },
    {
      title: "Slide 12",
      content: `<h2>More Literary Techniques</h2>${module1Rows([{ label: "Alliteration", text: "Repetition of the same beginning consonant sound. Example: Peter Piper picked peppers." }, { label: "Onomatopoeia", text: "Uses words that imitate sounds. Example: Buzz, splash, boom." }, { label: "Imagery", text: "Uses descriptive language that appeals to the senses. Example: The sweet scent of roses filled the air." }, { label: "Symbolism", text: "Uses an object or idea to represent a deeper meaning. Example: A dove symbolizes peace." }])}<p>Literary techniques help writers express emotions, ideas, and experiences creatively.</p>`
    },
    {
      title: "Slide 13",
      content: `<h2>Why Are Literary Devices Important?</h2><p>Literary devices make reading more enjoyable and meaningful because they help readers connect with a text beyond its literal meaning.</p><p><strong>They help writers:</strong></p><ul class="module1-plain-list"><li>Express ideas creatively</li><li>Create vivid descriptions</li><li>Communicate emotions effectively</li><li>Capture readers' attention</li><li>Strengthen storytelling</li><li>Encourage deeper thinking and interpretation</li><li>Make literary works memorable</li></ul>`
    },
    {
      title: "Slide 14",
      content: `<h2>Activity 1: Let's Recall!</h2>${module1Activity("module1-activity1", "Directions: Read each statement carefully. Type TRUE if the statement is correct and FALSE if it is incorrect.", [{ prompt: "Literary devices help make literary works more interesting and meaningful.", answer: "TRUE", accept: "T", responseId: "module1-activity1-a-activity-1" }, { prompt: "Literary elements and literary techniques are the two categories of literary devices.", answer: "TRUE", accept: "T", responseId: "module1-activity1-a-activity-2" }, { prompt: "Simile is an example of a literary element.", answer: "FALSE", accept: "F", responseId: "module1-activity1-a-activity-3" }, { prompt: "Mood is an example of a literary element.", answer: "TRUE", accept: "T", responseId: "module1-activity1-a-activity-4" }, { prompt: "Literary techniques are used to enhance the artistic quality of a text.", answer: "TRUE", accept: "T", responseId: "module1-activity1-b-activity-1" }, { prompt: "Setting refers to the time and place of a story.", answer: "TRUE", accept: "T", responseId: "module1-activity1-b-activity-2" }, { prompt: "Hyperbole is a literary element.", answer: "FALSE", accept: "F", responseId: "module1-activity1-b-activity-3" }, { prompt: "Writers use literary devices to express ideas and emotions effectively.", answer: "TRUE", accept: "T", responseId: "module1-activity1-b-activity-4" }, { prompt: "Characters are considered literary elements.", answer: "TRUE", accept: "T", responseId: "module1-activity1-b-activity-5" }, { prompt: "Symbolism is a literary technique.", answer: "TRUE", accept: "T", responseId: "module1-activity1-b-activity-6" }], 1, "lesson-activity-merged")}`
    },
    {
      title: "Slide 15",
      content: `<h2>Activity 2: Classify Me!</h2>${module1Activity("module1-activity2", "Directions: Type LE if it is a Literary Element and LT if it is a Literary Technique.", [{ prompt: "Plot", answer: "LE", accept: "LITERARY ELEMENT" }, { prompt: "Simile", answer: "LT", accept: "LITERARY TECHNIQUE" }, { prompt: "Mood", answer: "LE", accept: "LITERARY ELEMENT" }, { prompt: "Metaphor", answer: "LT", accept: "LITERARY TECHNIQUE" }, { prompt: "Theme", answer: "LE", accept: "LITERARY ELEMENT" }, { prompt: "Hyperbole", answer: "LT", accept: "LITERARY TECHNIQUE" }, { prompt: "Setting", answer: "LE", accept: "LITERARY ELEMENT" }, { prompt: "Personification", answer: "LT", accept: "LITERARY TECHNIQUE" }, { prompt: "Tone", answer: "LE", accept: "LITERARY ELEMENT" }, { prompt: "Symbolism", answer: "LT", accept: "LITERARY TECHNIQUE" }])}`
    },
    {
      title: "Slide 16",
      content: `<h2>Activity 3: Why Does It Matter?</h2><p>Directions: Read the short paragraph below and answer the questions.</p><div class="lesson-example">The moon smiled down on the sleepy village while the stars twinkled like tiny diamonds. The cool breeze whispered through the trees, making everyone feel peaceful and safe.</div>${lessonAnswerList("module1-slide17-response", "Slide 16: Activity 3", [{ prompt: "Which literary devices can you identify in the paragraph?", placeholder: "Type the devices you noticed.", long: true }, { prompt: "What do these devices add to the paragraph?", placeholder: "Type what they add.", long: true }], "lesson-answer-list-stacked lesson-answer-list-shortpair")}`
    },
    {
      title: "Slide 17",
      content: `<h2>Reflection Questions</h2>${lessonAnswerList("module1-slide18-response", "Slide 17: Reflection Questions", [{ prompt: "Which literary devices can you identify in the paragraph?", long: true }, { prompt: "How did these literary devices affect your imagination while reading?", long: true }, { prompt: "How would the paragraph change if the literary devices were removed?", long: true }, { prompt: "Why is it important for writers to use literary devices in literary works?", long: true }, { prompt: "How can understanding literary devices help you appreciate poems, stories, and songs?", long: true }], "lesson-answer-list-stacked lesson-answer-list-many")}`
    },
    {
      title: "Slide 18",
      content: `<h2>My Learning Reflection</h2><p>Directions: Reflect on what you have learned in this module. Answer each question in 2-4 complete sentences.</p>${lessonAnswerList("module1-slide19-response", "Slide 18: My Learning Reflection", [{ prompt: "What did I learn from this module?", html: "<strong>What did I learn from this module?</strong> Describe the most important knowledge or skills you gained about literary devices.", placeholder: "Type your answer.", long: true }, { prompt: "What interested me the most? Why?", html: "<strong>What interested me the most? Why?</strong> Explain which literary device, example, or activity you found most interesting.", placeholder: "Type your answer.", long: true }], "lesson-answer-list-stacked lesson-answer-list-reflection")}`
    },
    {
      title: "Slide 19",
      content: `<h2>My Learning Reflection</h2><p>Answer each question in 2-4 complete sentences.</p>${lessonAnswerList("module1-slide20-response", "Slide 19: My Learning Reflection", [{ prompt: "What do I still need to improve or practice?", html: "<strong>What do I still need to improve or practice?</strong> Identify a concept or skill about literary devices that you found challenging and explain how you can improve.", placeholder: "Type your answer.", long: true }, { prompt: "How can I apply what I learned in real life?", html: "<strong>How can I apply what I learned in real life?</strong> Explain how understanding literary devices can help you become a better reader, writer, or speaker.", placeholder: "Type your answer.", long: true }], "lesson-answer-list-stacked lesson-answer-list-reflection")}`
    },
    {
      title: "Slide 20",
      content: `<h2>Module Summary</h2><p>Literary devices are tools and techniques that writers use to make literary texts more meaningful, creative, and engaging.</p>${module1Rows([{ label: "Literary Elements", text: "Fundamental parts of a literary work, such as plot, setting, characters, mood, theme, moral, and tone." }, { label: "Literary Techniques", text: "Methods writers use to make writing more expressive, such as simile, metaphor, personification, hyperbole, alliteration, onomatopoeia, imagery, and symbolism." }])}<p>Understanding literary devices helps readers recognize how writers express ideas, create vivid descriptions, communicate emotions, and strengthen stories and poems.</p>`
    }
  ],
  module2: [
    {
      title: "Slide 1",
      content: `<h2>Overview</h2><p>In your previous lesson, you were introduced to literary devices, their importance, and their classification into literary elements and literary techniques.</p><p>As you continue to learn about literary devices, you will now focus on <strong>figurative language</strong>, one of the most widely used techniques by authors.</p><p>Figurative language allows writers to communicate concepts, emotions, and experiences creatively and imaginatively.</p>`
    },
    {
      title: "Slide 2",
      content: `<h2>Which One Paints a Picture?</h2>${module1Activity("module2-picture-choice", "Read each pair. Type A or B for the sentence that creates a clearer picture.", [{ prompt: "A. The flowers were beautiful. B. The flowers danced in the gentle breeze.", answer: "B" }, { prompt: "A. The boy was very happy. B. The boy's heart was dancing with joy.", answer: "B" }, { prompt: "A. The classroom was very quiet. B. The classroom was as quiet as a library.", answer: "B" }])}`
    },
    {
      title: "Slide 3",
      content: `<h2>Think About It</h2>${lessonAnswerList("module2-slide3-response", "Slide 3: Think About It", [{ prompt: "Which sentences help you create a clearer picture in your mind?", long: true }, { prompt: "What words make these sentences more interesting?", long: true }, { prompt: "Are the sentences meant to be understood exactly as they are written?", long: true }, { prompt: "How do these expressions make the sentences more creative?", long: true }], "lesson-answer-list-stacked lesson-answer-list-four")}`
    },
    {
      title: "Slide 4",
      content: `<h2>Learning Objectives</h2><p>At the end of this module, the learners should be able to:</p><ul class="module1-plain-list"><li><strong>Cognitive:</strong> Identify common types of figurative language used in literary text.</li><li><strong>Affective:</strong> Appreciate the use of figurative language in making literary texts more meaningful and engaging.</li><li><strong>Psychomotor:</strong> Construct simple sentences using different types of figurative language.</li></ul>`
    },
    {
      title: "Slide 5",
      content: `<h2>What is Figurative Language?</h2><p><strong>Figurative language</strong> is the use of words or expressions whose meanings are different from their literal meanings.</p><p>Instead of stating ideas directly, it uses comparisons, exaggeration, or symbols to create vivid images and express ideas in a more interesting way.</p><p>Think of figurative language as adding color, emotion, and creativity to writing. It is different from literal language, which means exactly what the words say.</p>`
    },
    {
      title: "Slide 6",
      content: `<h2>Common Types of Figurative Language</h2><p>In this module, you will learn the following types of figurative language:</p><ul class="lesson-list"><li>Simile</li><li>Metaphor</li><li>Personification</li><li>Hyperbole</li><li>Symbolism</li></ul>`
    },
    {
      title: "Slide 7",
      content: `<h2>Simile: Example 1</h2><p>A <strong>simile</strong> compares two unlike things using the words <strong>like</strong> or <strong>as</strong>. It shows how two different things are alike in one way.</p><div class="lesson-example">"Her smile was as bright as the sun."</div><p>This is a simile because it uses <strong>as</strong> to compare a smile to the sun.</p>${notice("The word as shows that a comparison is being made. The comparison helps readers imagine how bright, happy, and cheerful her smile is.")}`
    },
    {
      title: "Slide 8",
      content: `<h2>Simile: Example 2</h2><div class="lesson-example">"He runs like the wind."</div><p>This is a simile because it uses <strong>like</strong> to compare a person's speed to the wind.</p>${notice("The word like tells us that two unlike things are being compared. The comparison helps readers picture how fast he runs.")}`
    },
    {
      title: "Slide 9",
      content: `<h2>Simile: Example 3</h2><div class="lesson-example">"The news hit him like a ton of bricks."</div><p>This is a simile because it uses <strong>like</strong> to compare the impact of the news to a ton of bricks.</p>${notice("The news did not really hit him with bricks. The sentence tells readers that the news was very shocking and made him feel overwhelmed.")}`
    },
    {
      title: "Slide 10",
      content: `<h2>Metaphor: Example 1</h2><p>A <strong>metaphor</strong> directly compares two unlike things. It states that one thing is another to create a stronger description.</p><div class="lesson-example">"The world is a stage."</div><p>This is a metaphor because it directly compares the world to a stage without using <strong>like</strong> or <strong>as</strong>.</p>${notice("The sentence suggests that people have different roles in life, just as actors have different roles on a stage.")}`
    },
    {
      title: "Slide 11",
      content: `<h2>Metaphor: Example 2</h2><div class="lesson-example">"Time is a thief."</div><p>This is a metaphor because it directly compares time to a thief.</p>${notice("Time is not really a thief because it cannot steal things. The sentence means that time slowly takes away moments, youth, and opportunities.")}`
    },
    {
      title: "Slide 12",
      content: `<h2>Metaphor: Example 3</h2><div class="lesson-example">"She is a beacon of hope."</div><p>This is a metaphor because it directly compares a person to a beacon.</p>${notice("She is not really a beacon. The sentence means that she gives hope and encouragement to other people.")}`
    },
    {
      title: "Slide 13",
      content: `<h2>Personification: Example 1 (Object)</h2><p><strong>Personification</strong> gives human qualities or actions to objects, animals, or ideas.</p><div class="lesson-example">"The wind whispered through the trees."</div><p>This is personification because the wind is given the human ability to whisper.</p>${notice("The wind cannot really whisper because only people can do that. Giving the wind a human action makes the scene feel calm and peaceful.")}`
    },
    {
      title: "Slide 14",
      content: `<h2>Personification: Example 2 (Animal)</h2><div class="lesson-example">"The playful puppy laughed as it chased its tail."</div><p>This is personification because the puppy is described as laughing.</p>${notice("Dogs do not laugh like people. The sentence gives the puppy a human action to make it seem happy and playful.")}`
    },
    {
      title: "Slide 15",
      content: `<h2>Personification: Example 3 (Idea)</h2><div class="lesson-example">"Hope never left her side."</div><p>This is personification because hope is treated like a person.</p>${notice("Hope is an idea, so it cannot stay beside someone. The sentence makes hope seem like a friend who stays with her during difficult times.")}`
    },
    {
      title: "Slide 16",
      content: `<h2>Personification: Example 4 (Object)</h2><div class="lesson-example">"The old clock complained with every tick."</div><p>This is personification because the clock is given the human action of complaining.</p>${notice("A clock cannot really complain. The sentence helps readers imagine its loud, annoying sound and makes the description more interesting.")}`
    },
    {
      title: "Slide 17",
      content: `<h2>Hyperbole: Example 1</h2><p><strong>Hyperbole</strong> is an exaggeration used to make an idea or feeling stronger. It is not meant to be taken literally.</p><div class="lesson-example">"I'm so hungry I could eat a horse."</div><p>This is hyperbole because it exaggerates how hungry the speaker is.</p>${notice("No one can really eat a whole horse. The exaggeration shows that the speaker is extremely hungry.")}`
    },
    {
      title: "Slide 18",
      content: `<h2>Hyperbole: Example 2</h2><div class="lesson-example">"I've told you a million times."</div><p>This is hyperbole because it exaggerates the number of times something was said.</p>${notice("The speaker did not really say it a million times. The exaggeration shows frustration from repeating the same thing.")}`
    },
    {
      title: "Slide 19",
      content: `<h2>Hyperbole: Example 3</h2><div class="lesson-example">"This bag weighs a ton."</div><p>This is hyperbole because it exaggerates the weight of the bag.</p>${notice("The bag does not really weigh a ton. The sentence exaggerates to show that the bag feels very heavy.")}`
    },
    {
      title: "Slide 20",
      content: `<h2>Symbolism: Example 1 (Object)</h2><p><strong>Symbolism</strong> is the use of objects, people, or ideas to represent a deeper meaning.</p><div class="lesson-example">"A white flag symbolizes peace."</div><p>This is symbolism because the white flag represents peace instead of being just a piece of cloth.</p>${notice("A white flag stands for peace and the desire to stop fighting. People understand this meaning even without saying the word peace.")}`
    },
    {
      title: "Slide 21",
      content: `<h2>Symbolism: Example 2 (Person)</h2><div class="lesson-example">"The king became a symbol of courage for his people."</div><p>This is symbolism because the king represents bravery and strong leadership.</p>${notice("The king is more than just a ruler in this sentence. He stands for courage and inspires his people to be brave.")}`
    },
    {
      title: "Slide 22",
      content: `<h2>Symbolism: Example 3 (Idea)</h2><div class="lesson-example">"Light symbolizes hope."</div><p>This is symbolism because light represents a deeper meaning.</p>${notice("Light does not only mean brightness. It can stand for hope, guidance, and a better future.")}`
    },
    {
      title: "Slide 23",
      content: `<h2>Why is Figurative Language Important?</h2><p>Figurative language helps writers express ideas, feelings, and experiences in creative ways. It makes poems, stories, and other literary texts more colorful, meaningful, and enjoyable to read.</p><p><strong>It helps readers:</strong></p><ul class="module1-plain-list"><li>Imagine scenes more clearly</li><li>Understand emotions and ideas more deeply</li><li>Enjoy creative and expressive writing</li><li>Discover meanings beyond the literal words</li><li>Appreciate the beauty of literary works</li></ul>`
    },
    {
      title: "Slide 24",
      content: `<h2>Activity 1: Identify the Figure of Speech</h2>${module1Activity("module2-activity1", "Type Simile, Metaphor, Personification, Hyperbole, or Symbolism.", [{ prompt: "The stars danced in the night sky.", answer: "PERSONIFICATION" }, { prompt: "She is as brave as a lion.", answer: "SIMILE" }, { prompt: "My backpack weighs a ton.", answer: "HYPERBOLE" }, { prompt: "The heart symbolizes love.", answer: "SYMBOLISM" }, { prompt: "Life is a journey.", answer: "METAPHOR" }])}`
    },
    {
      title: "Slide 25",
      content: `<h2>Activity 2: Construct Simple Sentences</h2><p><strong>Directions:</strong> Construct one simple sentence for each type.</p>${lessonAnswerList("module2-slide25-response", "Slide 25: Activity 2", [{ prompt: "Simile", html: "<strong>Simile</strong>", placeholder: "Type one simile.", long: true }, { prompt: "Metaphor", html: "<strong>Metaphor</strong>", placeholder: "Type one metaphor.", long: true }, { prompt: "Personification", html: "<strong>Personification</strong>", placeholder: "Type one personification.", long: true }, { prompt: "Hyperbole", html: "<strong>Hyperbole</strong>", placeholder: "Type one hyperbole.", long: true }, { prompt: "Symbolism", html: "<strong>Symbolism</strong>", placeholder: "Type one symbolism sentence.", long: true }], "lesson-answer-list-stacked lesson-answer-list-many")}`
    },
    {
      title: "Slide 26",
      content: `<h2>Activity 3: My Learning Reflection</h2><p><strong>Directions:</strong> Reflect on what you have learned in this module. Answer each question in 2-4 complete sentences.</p>${lessonAnswerList("module2-slide26-response", "Slide 26: Learning Reflection", [{ prompt: "What did I learn from this module?", html: "<strong>What did I learn from this module?</strong> Describe what you learned about figurative language.", placeholder: "Type your answer.", long: true }, { prompt: "What interested me the most? Why?", html: "<strong>What interested me the most? Why?</strong> Which type of figurative language did you enjoy learning the most?", placeholder: "Type your answer.", long: true }], "lesson-answer-list-stacked lesson-answer-list-reflection")}`
    },
    {
      title: "Slide 27",
      content: `<h2>Activity 3: Continue</h2>${lessonAnswerList("module2-slide27-response", "Slide 27: Learning Reflection", [{ prompt: "What do I still need to improve or practice?", html: "<strong>What do I still need to improve or practice?</strong> Which type of figurative language do you still find difficult? How will you improve?", placeholder: "Type your answer.", long: true }, { prompt: "How can I apply what I learned in real life?", html: "<strong>How can I apply what I learned in real life?</strong> Explain how figurative language can improve your reading, writing, or everyday communication.", placeholder: "Type your answer.", long: true }], "lesson-answer-list-stacked lesson-answer-list-reflection")}`
    },
    {
      title: "Slide 28",
      content: `<h2>Module Summary</h2><p>In this module, you learned that figurative language uses creative expressions to communicate ideas beyond their literal meanings.</p><ul class="module1-plain-list"><li><strong>Simile</strong> compares two unlike things using like or as.</li><li><strong>Metaphor</strong> directly compares two unlike things.</li><li><strong>Personification</strong> gives human qualities to objects, animals, or ideas.</li><li><strong>Hyperbole</strong> uses exaggeration for emphasis.</li><li><strong>Symbolism</strong> uses objects, people, or ideas to represent deeper meanings.</li></ul>`
    },
    {
      title: "Slide 29",
      content: `<h2>References</h2><ul class="lesson-list"><li>https://www.scribd.com/document/708731855/English-7-Q3-M5</li><li>Figurative Language - Examples and Definition</li></ul>`
    }
  ],
  module3: [
    {
      title: "Slide 1",
      content: `<h2>Overview</h2><p>In your previous lesson, you learned about figurative language and how writers use creative expressions to make literary texts more meaningful and engaging.</p><p>Now you will focus on <strong>sound devices</strong>, which use the sounds of words to make poems and other literary texts more interesting and enjoyable.</p><p>You will learn about alliteration, rhyme, and onomatopoeia, then practice using sound devices to create your own poetic lines.</p>`
    },
    {
      title: "Slide 2",
      content: `<h2>Complete the Sound</h2><p><strong>Directions:</strong> Complete each line with a word that makes the sound interesting. Read your answers aloud.</p><ul class="lesson-list module3-prompt-list module3-inline-list"><li>Busy bees ${lessonInlineAnswer("module3-slide2-bees", "Slide 2: Complete the Sound", "Busy bees blank")} around the flowers.</li><li>The moon shines at ${lessonInlineAnswer("module3-slide2-moon", "Slide 2: Complete the Sound", "The moon shines at blank")}.</li><li>The leaves go rustle, rustle, ${lessonInlineAnswer("module3-slide2-leaves", "Slide 2: Complete the Sound", "The leaves go rustle blank")}.</li><li>Silly students ${lessonInlineAnswer("module3-slide2-students", "Slide 2: Complete the Sound", "Silly students blank")} and smile.</li></ul><p><strong>Think About It:</strong> What do you notice about the sounds of the words?</p>`
    },
    {
      title: "Slide 3",
      content: `<h2>Learning Objectives</h2><p>At the end of the module, the learners should be able to:</p><ul class="module1-plain-list"><li><strong>Cognitive:</strong> Recognize common sound devices used in literary text.</li><li><strong>Affective:</strong> Show interest in how sound devices contribute to rhythm and enjoyment by reflecting on their effect in poems.</li><li><strong>Psychomotor:</strong> Construct short poetic lines that correctly apply sound devices.</li></ul>`
    },
    {
      title: "Slide 4",
      content: `<h2>What are Sound Devices?</h2><p><strong>Sound devices</strong> are literary techniques that use the sounds of words to make poems and other literary works more interesting and enjoyable.</p><p>Writers use sound devices to create rhythm, musical effects, and emphasis. These techniques help readers enjoy the sound of words while understanding the meaning of a poem.</p>`
    },
    {
      title: "Slide 5",
      content: `<h2>Three Common Sound Devices</h2><p>In this module, you will learn three common sound devices:</p><ul class="lesson-list"><li>Alliteration</li><li>Rhyme</li><li>Onomatopoeia</li></ul>`
    },
    {
      title: "Slide 6",
      content: `<h2>Alliteration: Example 1</h2><p><strong>Alliteration</strong> is the repetition of the same beginning consonant sound in nearby words.</p><p>It makes sentences and poems sound smooth, catchy, and easy to remember.</p><div class="lesson-example">"Peter Piper picked a peck of pickled peppers."</div><p>This is alliteration because the beginning <strong>/p/</strong> sound is repeated.</p>${notice("The repeated /p/ sound makes the sentence fun to read aloud and creates a pleasant rhythm.")}`
    },
    {
      title: "Slide 7",
      content: `<h2>Alliteration: Example 2</h2><div class="lesson-example">"Sally sells seashells by the seashore."</div><p>This is alliteration because the beginning <strong>/s/</strong> sound is repeated.</p><p><strong>Remember:</strong> Alliteration and tongue twisters are not the same. Alliteration repeats the same beginning consonant sound in nearby words. Tongue twisters are phrases that are difficult to say quickly and often use alliteration.</p>${notice("Not all alliterations are tongue twisters, but many tongue twisters use alliteration.")}`
    },
    {
      title: "Slide 8",
      content: `<h2>Rhyme: Example 1</h2><p><strong>Rhyme</strong> is the repetition of similar ending sounds in two or more words, usually at the end of lines in a poem.</p><p>Rhyming words give poems a musical sound.</p><div class="lesson-example">The sun rises over the land so bright. (A)<br>Lighting the morning with golden light. (A)<br>The farmers work beneath the sky. (B)<br>As birds above go flying by. (B)</div>${notice("The words bright and light rhyme, while sky and by also rhyme. This creates an AABB rhyme pattern.")}`
    },
    {
      title: "Slide 9",
      content: `<h2>Onomatopoeia: Example 1</h2><p><strong>Onomatopoeia</strong> is the use of words that imitate real sounds. These words help readers imagine and hear sounds in a poem or story.</p><div class="lesson-example">"The bees buzzed loudly in the garden."</div><p>This is onomatopoeia because <strong>buzzed</strong> sounds like the noise made by bees.</p>${notice("The word buzzed helps readers imagine the sound of bees and makes the sentence more realistic.")}`
    },
    {
      title: "Slide 10",
      content: `<h2>Onomatopoeia: Example 2</h2><div class="lesson-example">"The bacon sizzled in the pan."</div><p>This is onomatopoeia because <strong>sizzled</strong> sounds like food cooking.</p>${notice("The word sizzled helps readers imagine the crackling sound of bacon and makes the scene more vivid.")}`
    },
    {
      title: "Slide 11",
      content: `<h2>Activity 1: Practice Sound Devices</h2><p><strong>Directions:</strong> Follow the instructions in each item. Write sentences or words that use the given sound device.</p>${lessonAnswerList("module3-slide11-response", "Slide 11: Activity 1", [{ id: "module3-slide11-response-1", prompt: "Write one sentence using alliteration.", html: "<strong>1.</strong> Write one sentence using alliteration.", placeholder: "Type one alliteration sentence.", long: true }, { id: "module3-slide12-response-1", prompt: "Write two words that rhyme with light.", html: "<strong>2.</strong> Write two words that rhyme with <strong>light</strong>.", placeholder: "Type two rhyming words.", long: true }, { id: "module3-slide12-response-2", prompt: "Write one sentence using an onomatopoeic word.", html: "<strong>3.</strong> Write one sentence using an onomatopoeic word.", placeholder: "Type your sentence.", long: true }, { id: "module3-slide12-response-3", prompt: "Identify the sound device and sound word in: The leaves rustled as the wind blew.", html: "<strong>4.</strong> Identify the sound device and sound word in: \"The leaves rustled as the wind blew.\"", placeholder: "Type the device and sound word.", long: true }], "lesson-answer-list-stacked lesson-answer-list-merged-activity")}`
    },
    {
      title: "Slide 12",
      content: `<h2>Activity 2: Nature Sound Verse</h2><p><strong>Directions:</strong> Write a 2-4 line poem about nature using one alliteration, one pair of rhyming words, and one onomatopoeic word.</p>${lessonAnswerList("module3-slide13-response", "Slide 12: Nature Sound Verse", [{ prompt: "Write your 2-4 line nature poem.", placeholder: "Type your poem here.", long: true }], "lesson-answer-list-stacked lesson-answer-list-poem")}`
    },
    {
      title: "Slide 13",
      content: `<h2>Analytic Rubric</h2><div class="module3-rubric-table" role="table" aria-label="Analytic Rubric"><div class="rubric-row rubric-head" role="row"><span>Criteria</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span></div><div class="rubric-row" role="row"><strong>Use of Sound Devices</strong><span>Correctly uses all required sound devices.</span><span>Uses most sound devices correctly.</span><span>Uses some sound devices with minor errors.</span><span>Uses only one sound device or several errors.</span><span>Does not correctly use the required sound devices.</span></div><div class="rubric-row" role="row"><strong>Creativity</strong><span>Poem is highly creative and original.</span><span>Poem is creative.</span><span>Poem shows some creativity.</span><span>Poem has limited creativity.</span><span>Poem lacks creativity.</span></div><div class="rubric-row" role="row"><strong>Clarity</strong><span>Ideas are clear and organized.</span><span>Ideas are mostly clear.</span><span>Ideas are understandable.</span><span>Ideas are somewhat unclear.</span><span>Ideas are difficult to understand.</span></div><div class="rubric-row" role="row"><strong>Grammar and Mechanics</strong><span>No grammar, spelling, or punctuation errors.</span><span>One or two minor errors.</span><span>Some errors that do not affect meaning.</span><span>Frequent errors that affect understanding.</span><span>Many errors that make the poem difficult to understand.</span></div><div class="rubric-row" role="row"><strong>Completeness</strong><span>All instructions are followed.</span><span>One minor requirement is missing.</span><span>Two requirements are missing.</span><span>Several requirements are missing.</span><span>Most requirements are not completed.</span></div></div><p><strong>Total Score:</strong> ____ /25</p>`
    },
    {
      title: "Slide 14",
      content: `<h2>My Learning Reflection</h2><p><strong>Directions:</strong> Reflect on what you have learned in this module. Answer each question in 2-4 complete sentences.</p>${lessonAnswerList("module3-slide15-response", "Slide 14: Learning Reflection", [{ prompt: "What did I learn from this module?", html: "<strong>1. What did I learn from this module?</strong> Describe what you learned about sound devices.", placeholder: "Type your answer.", long: true }, { prompt: "What interested me the most? Why?", html: "<strong>2. What interested me the most? Why?</strong> Which sound device did you enjoy learning the most? Explain why.", placeholder: "Type your answer.", long: true }], "lesson-answer-list-stacked lesson-answer-list-reflection")}`
    },
    {
      title: "Slide 15",
      content: `<h2>My Learning Reflection</h2>${lessonAnswerList("module3-slide16-response", "Slide 15: Learning Reflection", [{ prompt: "What do I still need to improve or practice?", html: "<strong>3. What do I still need to improve or practice?</strong> Which sound device do you still need more practice using? Explain your answer.", placeholder: "Type your answer.", long: true }, { prompt: "How can I apply what I learned in real life?", html: "<strong>4. How can I apply what I learned in real life?</strong> Explain how sound devices can improve poems, songs, or creative writing.", placeholder: "Type your answer.", long: true }], "lesson-answer-list-stacked lesson-answer-list-reflection")}`
    },
    {
      title: "Slide 16",
      content: `<h2>Module Summary</h2><p>In this module, you learned that sound devices make poems more enjoyable by using interesting sounds.</p><ul class="module1-plain-list"><li><strong>Alliteration</strong> repeats the same beginning consonant sound.</li><li><strong>Rhyme</strong> repeats similar ending sounds.</li><li><strong>Onomatopoeia</strong> uses words that imitate real sounds.</li></ul><p>Understanding these sound devices helps you appreciate how poets make their writing rhythmic, expressive, and enjoyable to read aloud.</p>`
    }
  ]
}

const gameTitles = {
  1: "Sentence Sleuths",
  2: "Text Detectives",
  3: "Expression Lab"
}

const developerContentLabels = {
  1: { title: "Game 1 Texts", itemName: "Sentence" },
  2: { title: "Game 2 Poems", itemName: "Poem" },
  3: { title: "Game 3 Prompts", itemName: "Prompt" }
}

const lessonGuideMessages = {
  1: [
    "Before we begin, check the rules for Sentence Sleuths. This tells you how to earn points and unlock the next level.",
    "This is where we learn what figures of speech do. Read the scroll first, then I will help you practice.",
    "Watch for like or as. If they are missing, it may be a direct comparison.",
    "These three are easy to mix up. Look for human action, exaggeration, or a phrase with a hidden meaning."
  ],
  2: [
    "Before Text Detectives starts, read how this game works. The text and clues matter here.",
    "In Game 2, we slow down and explain what the figurative words mean.",
    "Listen to the first sounds and sound words. They are clues for this game.",
    "Irony happens when the result is different from what you expect."
  ],
  3: [
    "Before Expression Lab starts, check the creation rules. Your answer must match the figure of speech.",
    "In Game 3, you will create your own figurative sentences.",
    "Use the rule on the scroll as your guide before typing your answer.",
    "You are ready. Make your sentence clear, creative, and matched to the figure of speech."
  ]
}

const learnGuideMessages = {
  overview: [
    "Start here. Literary devices help writing feel alive and meaningful.",
    "These are the main reasons writers use literary devices.",
    "Remember the two big groups: elements and techniques.",
    "Elements are the building blocks of stories.",
    "Techniques are special language moves writers choose.",
    "Great. You are ready to explore each module."
  ],
  module1: [
    "Start with the overview. This module explains literary devices, elements, and techniques.",
    "Compare the plain sentences with the creative sentences. Notice which ones create stronger images.",
    "Use these questions to think about how language affects imagination and emotion.",
    "These are your learning goals for Module 1.",
    "Literary devices help writers make meaning, style, and impact stronger.",
    "Remember the two big categories: elements and techniques.",
    "Elements are the natural building blocks of a literary work.",
    "These elements help build the story world and its structure.",
    "Mood, theme, moral, and tone help shape meaning and feeling.",
    "Techniques are choices writers use to make language more expressive.",
    "These examples show common techniques you will meet often.",
    "Sound, imagery, and symbolism also help writers create impact.",
    "This slide shows why literary devices matter to both writers and readers.",
    "For this activity, decide whether each statement is true or false. The numbering continues from 1 to 10.",
    "Classify each term as a literary element or literary technique.",
    "Read the paragraph slowly and look for device clues.",
    "Use these questions to explain how the paragraph changes your imagination.",
    "Reflect on what you learned and what interested you most.",
    "Think about what you still need to practice and how you can use this skill.",
    "Review the summary before moving to the next module."
  ],
  module2: [
    "This module focuses on figurative language and how it makes writing more creative.",
    "Choose the sentence that paints the clearer picture, then check your answer.",
    "Use these questions to explain why figurative language feels more vivid.",
    "These are the skills you should build before the end of the module.",
    "Figurative language adds color, emotion, and imagination to writing.",
    "You will focus on simile, metaphor, personification, hyperbole, and symbolism.",
    "A simile uses like or as to compare two unlike things.",
    "Look for the word like in this example.",
    "This example uses like to show a strong feeling.",
    "A metaphor makes a direct comparison without like or as.",
    "This metaphor says time acts like something that steals.",
    "This metaphor describes a person as a source of hope.",
    "Personification gives a non-human thing a human action.",
    "Here, an animal is described with a human action.",
    "Here, an idea is treated like a person.",
    "This object is given a human action to make the description stronger.",
    "Hyperbole uses exaggeration. Do not read it literally.",
    "This exaggeration shows frustration.",
    "This exaggeration makes the bag feel extremely heavy.",
    "Symbolism uses something concrete to stand for a deeper idea.",
    "A person can also become a symbol of an important quality.",
    "Light can represent hope, guidance, and a better future.",
    "Figurative language helps readers imagine, understand, and enjoy writing.",
    "Type each figure of speech, then check your answers.",
    "Create your own examples. Your teacher can view your response.",
    "Reflect on what you learned and what interested you most.",
    "Think about what still needs practice and how you can use this skill.",
    "Review the five types before moving on.",
    "These are the references for this module."
  ],
  module3: [
    "This module focuses on sound devices and how words become musical.",
    "Complete the lines and listen to how the sounds change.",
    "These are the skills you should build before the end of the module.",
    "Sound devices use word sounds to create rhythm and emphasis.",
    "Remember the three focus devices: alliteration, rhyme, and onomatopoeia.",
    "Alliteration repeats beginning consonant sounds.",
    "Tongue twisters often use alliteration, but they are not the same thing.",
    "Rhyme repeats similar ending sounds and can create a pattern.",
    "Onomatopoeia uses words that imitate real sounds.",
    "Sound words make a scene easier to hear in your imagination.",
    "Complete each Activity 1 item: alliteration, rhyme, onomatopoeia, and sound identification.",
    "Write your nature poem using all three sound devices.",
    "Use this rubric to check your poem before submitting.",
    "Reflect on what you learned and what interested you most.",
    "Think about what still needs practice and how you can use sound devices.",
    "Review the three sound devices before moving on."
  ]
}

const questionBank = {
  game1: [
    {
      sentence: "\"His smile is as warm as the summer sun.\"",
      question: "What literary device is used?",
      choices: ["Alliteration", "Imagery", "Metaphor", "Simile"],
      answer: "Simile",
      badgeAnswer: "Simile",
      hint: "Look for comparison words such as like or as.",
      correctFeedback: "Correct! A simile compares two unlike things using like or as. Here, the smile is compared to the warmth of the summer sun.",
      incorrectFeedback: "Try again. The word as signals a comparison. Comparisons using like or as are called similes."
    },
    {
      sentence: "\"The leaves clapped happily during the storm.\"",
      question: "How does the personification affect the mood of the sentence?",
      choices: ["It creates fear.", "It creates sadness.", "It creates confusion.", "It creates a lively and cheerful mood."],
      answer: "It creates a lively and cheerful mood.",
      badgeAnswer: "Personification",
      hint: "Focus on the word happily.",
      correctFeedback: "Correct! Describing the leaves as clapping happily creates an energetic and cheerful atmosphere.",
      incorrectFeedback: "Try again. The word happily suggests joy and excitement, helping create a lively mood."
    },
    {
      sentence: "\"Life is a rollercoaster.\"",
      question: "What does the metaphor suggest?",
      choices: ["Life moves slowly.", "Life is short and boring.", "Life is smooth and calm.", "Life is full of ups and downs."],
      answer: "Life is full of ups and downs.",
      badgeAnswer: "Metaphor",
      hint: "Think about the experience of riding a rollercoaster.",
      correctFeedback: "Great job! A rollercoaster has twists, turns, highs, and lows. The metaphor suggests that life is also full of exciting and challenging experiences.",
      incorrectFeedback: "Not quite. The metaphor compares life to a rollercoaster because both involve unexpected changes, challenges, and exciting moments."
    },
    {
      sentence: "\"My backpack weighs a ton.\"",
      question: "Why did the author use hyperbole?",
      choices: ["To create rhyme.", "To compare two things.", "To provide an exact weight.", "To exaggerate how heavy the backpack feels."],
      answer: "To exaggerate how heavy the backpack feels.",
      badgeAnswer: "Hyperbole",
      hint: "Ask yourself whether the statement is literally true.",
      correctFeedback: "Correct! Hyperbole is an exaggeration used to emphasize an idea. The backpack does not actually weigh a ton, but it feels very heavy.",
      incorrectFeedback: "Not quite. Hyperbole involves exaggeration, not facts. The author exaggerates the weight to emphasize the feeling of heaviness."
    },
    {
      sentence: "Which sentence best uses personification?",
      choices: ["The river is long.", "The flowers are colorful.", "The moon is bright tonight.", "The thunder danced angrily across the sky."],
      answer: "The thunder danced angrily across the sky.",
      badgeAnswer: "Personification",
      hint: "Look for a non-human thing performing a human action.",
      correctFeedback: "Excellent! Thunder cannot literally dance. Giving thunder a human action is an example of personification.",
      incorrectFeedback: "Try again. Personification gives human qualities or actions to non-human objects, animals, or ideas."
    },
    {
      sentence: "Which sentence creates the strongest imagery?",
      choices: ["The dog ran outside.", "The cake tasted good.", "The children played happily.", "The sizzling bacon filled the kitchen with a smoky aroma."],
      answer: "The sizzling bacon filled the kitchen with a smoky aroma.",
      hint: "Look for details that appeal to the senses.",
      correctFeedback: "Great work! This sentence appeals to both hearing and smell, helping readers imagine the scene clearly.",
      incorrectFeedback: "Not quite. Imagery uses sensory details that help readers see, hear, smell, taste, or feel an experience."
    },
    {
      sentence: "\"The flowers danced gently in the morning breeze.\"",
      question: "What literary device is used?",
      choices: ["Hyperbole", "Personification", "Simile", "Symbolism"],
      answer: "Personification",
      badgeAnswer: "Personification",
      hint: "Think about whether a non-human object is being given a human action.",
      correctFeedback: "Excellent! Personification is used because the flowers are described as dancing, which is a human action. This makes the scene more vivid and engaging.",
      incorrectFeedback: "Not quite. Flowers cannot literally dance. Giving human characteristics to non-human things is called personification."
    },
    {
      sentence: "\"The classroom roared like a wild jungle.\"",
      question: "Why did the author use this simile?",
      choices: ["To create rhyme", "To describe silence.", "To describe animals.", "To emphasize how noisy the classroom was."],
      answer: "To emphasize how noisy the classroom was.",
      badgeAnswer: "Simile",
      hint: "Compare the sounds of a classroom and a jungle.",
      correctFeedback: "Excellent! The simile helps readers imagine how loud and chaotic the classroom was by comparing it to a wild jungle.",
      incorrectFeedback: "Not quite. The comparison is used to emphasize the classroom's loud noise, not the animals themselves."
    },
    {
      sentence: "Which literary device would best create a suspenseful mood in a horror story?",
      choices: ["Dark imagery", "Hyperbole", "Personification", "Rhyme"],
      answer: "Dark imagery",
      hint: "Think about which device helps readers picture frightening scenes.",
      correctFeedback: "Correct! Dark imagery uses vivid descriptions that help readers imagine eerie or frightening scenes, creating suspense.",
      incorrectFeedback: "Not quite. Horror stories often rely on dark and vivid descriptions to make readers feel tense and uneasy."
    },
    {
      sentence: "\"The lonely moon watched the quiet town below.\"",
      question: "Why is personification effective in this sentence?",
      choices: ["It creates humor.", "It shortens the sentence.", "It makes the moon seem alive and emotional.", "It gives scientific information about the moon."],
      answer: "It makes the moon seem alive and emotional.",
      badgeAnswer: "Personification",
      hint: "Can the moon really watch something or feel lonely?",
      correctFeedback: "Great job! Personification makes the moon seem alive and capable of emotions, helping readers connect with the scene.",
      incorrectFeedback: "Not quite. The moon is given human qualities such as watching and feeling lonely, which creates stronger imagery and emotion."
    },
    {
      sentence: "\"Buzz! Buzz! went the busy bees.\"",
      question: "What sound device is used?",
      choices: ["Metaphor", "Onomatopoeia", "Simile", "Symbolism"],
      answer: "Onomatopoeia",
      hint: "Look for words that imitate real-life sounds.",
      correctFeedback: "Correct! Onomatopoeia uses words that imitate actual sounds. The word buzz sounds like the noise bees make.",
      incorrectFeedback: "Not quite. Words such as buzz, hiss, bang, and crash imitate sounds. This literary device is called onomatopoeia."
    },
    {
      sentence: "\"Silly snakes slither silently.\"",
      question: "What sound device is used?",
      choices: ["Alliteration", "Hyperbole", "Imagery", "Rhyme"],
      answer: "Alliteration",
      hint: "Notice the repeated beginning sound in several words.",
      correctFeedback: "Excellent! Alliteration is the repetition of the same beginning consonant sound. In this sentence, the s sound is repeated.",
      incorrectFeedback: "Try again. Repeating the same beginning consonant sound in nearby words is called alliteration."
    },
    {
      sentence: "Why do poets use rhyme in poems?",
      choices: ["To confuse readers", "To remove emotions", "To make poems longer", "To create rhythm and musicality"],
      answer: "To create rhythm and musicality",
      hint: "Think about how rhyming words sound when read aloud.",
      correctFeedback: "Great job! Rhyme creates rhythm and musicality, making poems more enjoyable and memorable.",
      incorrectFeedback: "Not quite. Poets often use rhyme to make their poems sound pleasant and rhythmic."
    },
    {
      sentence: "\"Crash!\" went the thunder outside.",
      question: "How does the onomatopoeia improve the sentence?",
      choices: ["It creates symbolism", "It shortens the sentence", "It compares thunder to another object", "It helps readers imagine the sound clearly"],
      answer: "It helps readers imagine the sound clearly",
      hint: "Focus on what the word Crash allows readers to experience.",
      correctFeedback: "Correct! The word Crash helps readers hear and imagine the loud sound of thunder.",
      incorrectFeedback: "Not quite. Onomatopoeia helps readers imagine sounds by using words that imitate them."
    },
    {
      sentence: "Which sentence best uses alliteration?",
      choices: ["The birds flew high in the sky.", "My brother plays basketball.", "The rain poured heavily all night.", "Tiny turtles tiptoed toward the tall tree."],
      answer: "Tiny turtles tiptoed toward the tall tree.",
      hint: "Look for repeated beginning consonant sounds.",
      correctFeedback: "Excellent! The repeated t sound makes this a strong example of alliteration.",
      incorrectFeedback: "Try again. Alliteration occurs when several nearby words begin with the same consonant sound."
    },
    {
      sentence: "Which sentence uses onomatopoeia effectively?",
      choices: ["The cat is fluffy and white.", "The stars shine brightly tonight.", "The baby is sleeping peacefully.", "Bang! The door slammed shut during the storm."],
      answer: "Bang! The door slammed shut during the storm.",
      hint: "Look for a word that imitates a sound.",
      correctFeedback: "Correct! The word Bang imitates the loud sound made by the door.",
      incorrectFeedback: "Not quite. Onomatopoeia uses words that sound like the noises they describe."
    },
    {
      sentence: "\"Peter Piper picked a peck of pickled peppers.\"",
      question: "How does the alliteration affect the sentence?",
      choices: ["It creates sadness.", "It removes rhythm.", "It creates a frightening mood.", "It makes the sentence smoother and more memorable."],
      answer: "It makes the sentence smoother and more memorable.",
      hint: "Think about how repeated sounds affect the flow of the sentence.",
      correctFeedback: "Great work! Alliteration creates rhythm and makes the sentence easier to remember.",
      incorrectFeedback: "Not quite. Repeated beginning sounds help create a smooth flow and memorable wording."
    },
    {
      sentence: "\"Tick-tock, tick-tock,\" echoed the clock in the silent room.",
      question: "How does the sound device help create the mood?",
      choices: ["It creates humor.", "It creates happiness.", "It creates excitement.", "It creates tension and silence."],
      answer: "It creates tension and silence.",
      hint: "Imagine hearing only a clock ticking in a very quiet room.",
      correctFeedback: "Excellent! The ticking sound emphasizes the silence and can create suspense or tension.",
      incorrectFeedback: "Try again. The repeated ticking sound highlights the quiet atmosphere and can make readers feel tense."
    },
    {
      sentence: "Which sound device would best improve a poem meant to sound musical and pleasant?",
      choices: ["Hyperbole", "Imagery", "Rhyme", "Symbolism"],
      answer: "Rhyme",
      hint: "Think about the sound device commonly used in songs and poems.",
      correctFeedback: "Correct! Rhyme helps create rhythm and musicality, making poems pleasant to read aloud.",
      incorrectFeedback: "Not quite. Rhyming words create a musical quality that many poems use."
    },
    {
      sentence: "A poet wants readers to imagine the sounds happening inside a busy market.",
      question: "Which sound device would be most effective?",
      choices: ["Metaphor", "Onomatopoeia", "Simile", "Symbolism"],
      answer: "Onomatopoeia",
      hint: "Which device directly imitates sounds?",
      correctFeedback: "Excellent! Onomatopoeia uses sound words that help readers imagine noises in a scene.",
      incorrectFeedback: "Try again. To help readers hear sounds in their minds, writers often use onomatopoeia."
    },
    {
      sentence: "\"The sweet aroma of freshly baked bread filled the warm kitchen.\"",
      question: "What sensory imagery is used?",
      choices: ["Auditory", "Olfactory", "Tactile", "Visual"],
      answer: "Olfactory",
      hint: "Which sense is used to experience an aroma?",
      correctFeedback: "Correct! Olfactory imagery appeals to the sense of smell. The aroma of bread helps readers imagine its scent.",
      incorrectFeedback: "Not quite. Aroma refers to smell, making this an example of olfactory imagery."
    },
    {
      sentence: "\"The thunder rumbled loudly across the dark sky.\"",
      question: "What sensory imagery is used?",
      choices: ["Auditory", "Gustatory", "Olfactory", "Tactile"],
      answer: "Auditory",
      hint: "Which sense is involved when you hear thunder?",
      correctFeedback: "Excellent! Auditory imagery appeals to the sense of hearing. The word rumbled helps readers imagine the sound of thunder.",
      incorrectFeedback: "Try again. The word rumbled describes a sound, which relates to hearing."
    },
    {
      sentence: "\"The icy wind brushed against my skin.\"",
      question: "What type of sensory imagery is mainly used?",
      choices: ["Visual", "Auditory", "Tactile", "Gustatory"],
      answer: "Tactile",
      hint: "Which sense helps you feel the icy wind?",
      correctFeedback: "Correct! Tactile imagery appeals to the sense of touch. The words icy and brushed against my skin help readers imagine the cold sensation.",
      incorrectFeedback: "Not quite. Focus on the physical sensation described in the sentence. This is tactile imagery."
    },
    {
      sentence: "Sentence A: The garden was beautiful.\nSentence B: Bright roses covered the garden while the soft scent of flowers filled the air.",
      question: "Why is Sentence B more effective in creating imagery?",
      choices: ["It uses fewer words.", "It gives sensory details that help readers imagine the garden.", "It tells readers exactly how to feel.", "It uses difficult vocabulary."],
      answer: "It gives sensory details that help readers imagine the garden.",
      hint: "Look at the specific details readers can see and smell.",
      correctFeedback: "Excellent! Sentence B uses visual and olfactory details, allowing readers to form a clearer mental image.",
      incorrectFeedback: "Try again. Think about which sentence gives readers specific details they can experience through their senses."
    },
    {
      sentence: "Read the sentence: \"The old kitchen smelled like freshly baked bread, while the warm oven made the room cozy.\"",
      question: "Which details contribute most to the imagery?",
      choices: ["old and room", "kitchen and oven", "smelled like freshly baked bread and warm oven", "the and while"],
      answer: "smelled like freshly baked bread and warm oven",
      hint: "Which details appeal directly to the senses?",
      correctFeedback: "Correct! The details appeal to smell and touch, making the kitchen easier for readers to imagine.",
      incorrectFeedback: "Not quite. Look for the details that allow readers to experience the scene through their senses."
    },
    {
      sentence: "A writer wants readers to imagine the sound of a busy market.",
      question: "Which sentence would best achieve this?",
      choices: ["The market was large and colorful.", "The market was crowded with many people.", "Vendors shouted their prices while carts rattled along the busy street.", "The market had many stores and customers."],
      answer: "Vendors shouted their prices while carts rattled along the busy street.",
      hint: "Which sentence contains details that readers can imagine hearing?",
      correctFeedback: "Excellent! Shouted and rattled create strong auditory imagery.",
      incorrectFeedback: "Try again. Look for words that describe sounds readers could hear in a busy market."
    },
    {
      sentence: "A writer wants readers to imagine eating a sour lemon.",
      question: "Which sentence best uses imagery?",
      choices: ["The lemon was yellow and round.", "I held the lemon in my hand.", "The lemon was placed on the table.", "The sharp, sour juice made my mouth pucker."],
      answer: "The sharp, sour juice made my mouth pucker.",
      hint: "Which sentence helps readers imagine the taste?",
      correctFeedback: "Correct! The words sour and made my mouth pucker create strong gustatory imagery.",
      incorrectFeedback: "Not quite. Focus on the sentence that helps readers imagine the taste of the lemon."
    },
    {
      sentence: "Description A: It was raining outside.\nDescription B: Cold raindrops tapped against the window as the fresh smell of wet grass drifted through the room.",
      question: "Which description creates a stronger sensory experience?",
      choices: ["Description A, because it is shorter.", "Description A, because it gives one simple detail.", "Description B, because it appeals to more than one sense.", "Description B, because it uses fewer descriptive words."],
      answer: "Description B, because it appeals to more than one sense.",
      hint: "Think about how many senses each description allows readers to experience.",
      correctFeedback: "Excellent! Description B appeals to hearing, touch, and smell, creating a richer sensory experience.",
      incorrectFeedback: "Try again. Compare the number and quality of sensory details in both descriptions."
    },
    {
      sentence: "A student writes: \"The beach was nice.\"",
      question: "Which revision best improves the sentence through imagery?",
      choices: ["The beach was very nice and beautiful.", "The beach was a place where people went to relax.", "The golden sand felt warm beneath my feet as cool waves splashed against the shore.", "The beach was one of the nicest places I had ever visited."],
      answer: "The golden sand felt warm beneath my feet as cool waves splashed against the shore.",
      hint: "Which revision allows readers to see and feel the beach?",
      correctFeedback: "Great job! The revision uses visual and tactile details to create a vivid mental picture of the beach.",
      incorrectFeedback: "Not quite. Look for the revision that replaces the general word nice with specific sensory details."
    },
    {
      sentence: "Why is imagery important in literary texts?",
      choices: ["It makes every sentence shorter.", "It removes the need for descriptions.", "It helps readers visualize and experience scenes through their senses.", "It tells readers exactly what they should think about a story."],
      answer: "It helps readers visualize and experience scenes through their senses.",
      hint: "Think about how sensory details affect a reader's experience.",
      correctFeedback: "Excellent! Imagery makes literary texts more vivid by helping readers picture, hear, smell, taste, or feel what is being described.",
      incorrectFeedback: "Try again. Think about how imagery helps readers experience a scene more vividly."
    }
  ],

  game2: [
    {
      text: "Why does the sea laugh, Mother, as it glints beneath the sun?",
      question: "What figure of speech is used in the lines?",
      choices: ["Hyperbole", "Metaphor", "Personification", "Simile"],
      answer: "Personification",
      badgeAnswer: "Personification",
      hint: "A non-human object is given a human action or emotion.",
      correctFeedback: "Correct! The sea is described as if it can laugh like a human.",
      incorrectFeedback: "Not quite. The sea is given human characteristics, making it personification."
    },
    {
      text: "As it glints beneath the sun.",
      question: "Which literary device helps readers picture the shining sea?",
      choices: ["Imagery", "Hyperbole", "Rhyme", "Symbolism"],
      answer: "Imagery",
      hint: "This device appeals to the senses and creates vivid mental pictures.",
      correctFeedback: "Excellent! The line appeals to the sense of sight through the sparkling sea.",
      incorrectFeedback: "Not quite. The description helps readers visualize the shining sea, making it imagery."
    },
    {
      text: "Why does the sea sob so, Mother, as it breaks on the rocky shore?",
      question: "Which figurative language is used in these lines?",
      choices: ["Metaphor", "Personification", "Simile", "Symbolism"],
      answer: "Personification",
      badgeAnswer: "Personification",
      hint: "Something non-human is described with a human emotion.",
      correctFeedback: "Correct! The sea is described as if it can sob or cry.",
      incorrectFeedback: "Not quite. The sea is given human emotions, which makes it personification."
    },
    {
      text: "It recalls the sorrows of the world, and weeps forevermore.",
      question: "What literary device is used when the sea is described as if it can remember and weep?",
      choices: ["Hyperbole", "Metaphor", "Personification", "Simile"],
      answer: "Personification",
      badgeAnswer: "Personification",
      hint: "Look for something non-human being given a human ability.",
      correctFeedback: "Correct! The sea is described as if it can remember and weep like a person.",
      incorrectFeedback: "Not quite. The sea is given human abilities, such as remembering and weeping, making it personification."
    },
    {
      text: "The comfort of the deep.",
      question: "Why is symbolism effective in this phrase?",
      choices: ["It creates a humorous effect.", "It exaggerates the depth of the ocean.", "It gives scientific information about the sea.", "It represents peace, rest, and emotional comfort."],
      answer: "It represents peace, rest, and emotional comfort.",
      badgeAnswer: "Symbolism",
      hint: "Symbols often stand for ideas beyond their literal meaning.",
      correctFeedback: "Excellent! The deep sea symbolizes peace, rest, and emotional comfort, adding deeper meaning to the poem.",
      incorrectFeedback: "Not quite. The deep sea represents comfort and peace, making it an example of symbolism."
    },
    {
      text: "Where friendly shines the sun above!",
      question: "Which figure of speech is used in the sentence?",
      choices: ["Hyperbole", "Personification", "Simile", "Symbolism"],
      answer: "Personification",
      badgeAnswer: "Personification",
      hint: "Something non-human is given a human quality.",
      correctFeedback: "Excellent! The sun is described as friendly like a person.",
      incorrectFeedback: "Not quite. The sun is given a human characteristic, making it personification."
    },
    {
      text: "Warm kisses on the lips are playing as we awake to mother's face.",
      question: "Which type of imagery is most clearly used in these lines?",
      choices: ["Auditory imagery", "Tactile imagery", "Gustatory imagery", "Olfactory imagery"],
      answer: "Tactile imagery",
      hint: "Think about the sense involved when describing warmth and physical touch.",
      correctFeedback: "Excellent! The words warm kisses appeal to the sense of touch, creating tactile imagery.",
      incorrectFeedback: "Not quite. The words warm kisses describe a sensation of touch, making it tactile imagery."
    },
    {
      text: "Life is the breeze that sweeps the meadows.",
      question: "Which figure of speech is used in the sentence?",
      choices: ["Metaphor", "Hyperbole", "Personification", "Simile"],
      answer: "Metaphor",
      badgeAnswer: "Metaphor",
      hint: "A direct comparison is made without using like or as.",
      correctFeedback: "Correct! Life is directly compared to a breeze.",
      incorrectFeedback: "Not quite. This is a metaphor because the comparison is direct."
    },
    {
      text: "The eyes are smiling as they gaze.",
      question: "How does the personification affect the meaning of the sentence?",
      choices: ["It creates suspense.", "It explains how eyes work.", "It describes the eyes as physically smiling.", "It emphasizes happiness and affection."],
      answer: "It emphasizes happiness and affection.",
      badgeAnswer: "Personification",
      hint: "Consider what the human action of smiling suggests.",
      correctFeedback: "Correct! Describing the eyes as smiling emphasizes joy, warmth, and affection.",
      incorrectFeedback: "Not quite. The personification helps readers understand the happiness and affection expressed in the scene."
    },
    {
      text: "Death is the breeze for him who has no country, no mother, and no love!",
      question: "What literary device is used when death is directly compared to a breeze?",
      choices: ["Hyperbole", "Metaphor", "Personification", "Simile"],
      answer: "Metaphor",
      badgeAnswer: "Metaphor",
      hint: "Look for a direct comparison without using like or as.",
      correctFeedback: "Correct! Death is directly compared to a breeze, making it a metaphor.",
      incorrectFeedback: "Not quite. The line directly compares death to a breeze without using like or as, making it a metaphor."
    },
    {
      text: "I shall haunt you, O my lost one, as the twilight haunts a grieving bamboo trail.",
      question: "What literary device is used in the lines?",
      choices: ["Hyperbole", "Personification", "Simile", "Symbolism"],
      answer: "Simile",
      badgeAnswer: "Simile",
      hint: "The comparison uses the word as.",
      correctFeedback: "Correct! The speaker compares herself to the twilight using as.",
      incorrectFeedback: "Not quite. The sentence compares two things using the word as, making it a simile."
    },
    {
      text: "And your dreams will linger strangely with the music of a phantom lover's tale.",
      question: "Which literary device helps readers imagine the sound described in the lines?",
      choices: ["Imagery", "Hyperbole", "Symbolism", "Personification"],
      answer: "Imagery",
      hint: "Look for words that appeal to the senses.",
      correctFeedback: "Excellent! The words music and tale appeal to the sense of hearing and create auditory imagery.",
      incorrectFeedback: "Not quite. The reference to music appeals to the sense of hearing, making it an example of imagery."
    },
    {
      text: "With the starlight, and the scent of wild champakas, and the melody of rain.",
      question: "Which sensory device is used in the lines?",
      choices: ["Hyperbole", "Imagery", "Symbolism", "Personification"],
      answer: "Imagery",
      hint: "The lines appeal to more than one sense.",
      correctFeedback: "Correct! The lines create vivid sensory descriptions through sight, smell, and sound.",
      incorrectFeedback: "Not quite. The detailed sensory descriptions create imagery."
    },
    {
      text: "You shall not forget, for I am past forgetting.",
      question: "How does the hyperbole affect the meaning of the statement?",
      choices: ["It gives factual information.", "It creates a humorous effect.", "It explains why the speaker forgets easily.", "It emphasizes the speaker's desire to remain unforgettable."],
      answer: "It emphasizes the speaker's desire to remain unforgettable.",
      badgeAnswer: "Hyperbole",
      hint: "Hyperbole strengthens emotions or important ideas.",
      correctFeedback: "Correct! The exaggeration highlights the speaker's longing to be remembered forever.",
      incorrectFeedback: "Not quite. The statement uses strong exaggeration to emphasize lasting remembrance."
    },
    {
      text: "Dusk will peer into your window, tragic-eyed and still.",
      question: "What effect does personification create in these lines?",
      choices: ["It makes dusk seem alive and watchful.", "It explains how dusk changes during the day.", "It gives factual information about the evening.", "It shows that dusk is a person."],
      answer: "It makes dusk seem alive and watchful.",
      badgeAnswer: "Personification",
      hint: "Think about what happens when human actions are given to dusk.",
      correctFeedback: "Correct! Giving dusk the human actions of peering and having eyes makes it seem alive and watchful.",
      incorrectFeedback: "Not quite. Personification makes dusk seem like a living being by giving it human actions."
    },
    {
      text: "God said, I made a man out of clay.",
      question: "What literary device is used in the lines?",
      choices: ["Personification", "Rhyme", "Simile", "Symbolism"],
      answer: "Symbolism",
      badgeAnswer: "Symbolism",
      hint: "An object represents a deeper meaning or idea.",
      correctFeedback: "Correct! The clay symbolizes the humble origin and creation of humankind.",
      incorrectFeedback: "Not quite. The clay represents humanity's creation, making it symbolism."
    },
    {
      text: "But so bright he, he spun himself to brightest Day.",
      question: "Why did the poet use hyperbole in these lines?",
      choices: ["To create a rhyme pattern", "To compare the man to the sun", "To describe the exact brightness of the man", "To exaggerate the man's greatness and power"],
      answer: "To exaggerate the man's greatness and power",
      badgeAnswer: "Hyperbole",
      hint: "Hyperbole is used to emphasize an idea through exaggeration.",
      correctFeedback: "Excellent! The brightness of the man is exaggerated to show greatness and power.",
      incorrectFeedback: "Not quite. The line uses exaggeration to emphasize the man's extraordinary qualities, making it hyperbole."
    },
    {
      text: "Till he was all shining gold, and oh, he was lovely to behold!",
      question: "Which sensory device is used in the lines?",
      choices: ["Imagery", "Hyperbole", "Personification", "Symbolism"],
      answer: "Imagery",
      hint: "The lines create vivid descriptions that appeal to the senses.",
      correctFeedback: "Correct! The glowing image of shining gold creates strong visual imagery.",
      incorrectFeedback: "Not quite. The detailed visual description appeals to the sense of sight, creating imagery."
    },
    {
      text: "Aimed at me who created him.",
      question: "What does the image of the man aiming a bow at his creator help readers understand?",
      choices: ["The man is physically weak.", "The man has become powerful and independent.", "The man is afraid of his creator.", "The man wants to return to being clay."],
      answer: "The man has become powerful and independent.",
      hint: "Consider what the man's action of aiming the bow suggests about his character.",
      correctFeedback: "Correct! The image of the man aiming a bow at his creator suggests that he has become powerful and independent.",
      incorrectFeedback: "Not quite. The action shows that the man has gained power and confidence to challenge his creator."
    },
    {
      text: "Give thy name! - Sir! Genius.",
      question: "What does the word Genius suggest about the man?",
      choices: ["He sees himself as ordinary.", "He considers himself highly intelligent and exceptional.", "He believes he has no special abilities.", "He wants to become weaker."],
      answer: "He considers himself highly intelligent and exceptional.",
      hint: "Think about what the word genius means.",
      correctFeedback: "Excellent! Calling himself Genius suggests that the man considers himself highly intelligent and exceptional.",
      incorrectFeedback: "Not quite. Genius refers to exceptional intelligence or ability, showing how highly the man views himself."
    },
    {
      text: "Pliant is the bamboo, I am a man of earth.",
      question: "What literary device is used in the lines?",
      choices: ["Hyperbole", "Metaphor", "Personification", "Simile"],
      answer: "Metaphor",
      badgeAnswer: "Metaphor",
      hint: "A direct comparison is made without using like or as.",
      correctFeedback: "Correct! The speaker directly compares himself to the earth.",
      incorrectFeedback: "Not quite. The sentence directly compares man to earth, making it a metaphor."
    },
    {
      text: "They say that from the bamboo, we had our first birth.",
      question: "What does the bamboo symbolize in the poem?",
      choices: ["Wealth and power", "Fear and loneliness", "Nature's destruction", "Human origin and cultural identity"],
      answer: "Human origin and cultural identity",
      badgeAnswer: "Symbolism",
      hint: "A symbol represents a deeper meaning or idea.",
      correctFeedback: "Excellent! The bamboo symbolizes the origin and identity of humanity.",
      incorrectFeedback: "Not quite. The bamboo represents human origin and culture, making it symbolism."
    },
    {
      text: "If the wind passes by, must I stop and try to measure fully my flexibility?",
      question: "Which type of imagery is suggested by the lines?",
      choices: ["Visual imagery", "Auditory imagery", "Tactile imagery", "Gustatory imagery"],
      answer: "Tactile imagery",
      hint: "Think about the physical sensation and movement of bending or flexibility.",
      correctFeedback: "Correct! The idea of flexibility and bending suggests physical sensation and movement, creating tactile imagery.",
      incorrectFeedback: "Not quite. The lines focus on the physical sensation and movement of bending, which suggests tactile imagery."
    },
    {
      text: "I might have been the bamboo, but I will be a man!",
      question: "What idea is emphasized by the contrast between bamboo and man?",
      choices: ["The speaker wants to become a plant.", "The speaker accepts being controlled by nature.", "The speaker emphasizes his determination to remain human.", "The speaker is describing the physical appearance of bamboo."],
      answer: "The speaker emphasizes his determination to remain human.",
      hint: "Focus on the words but I will be a man.",
      correctFeedback: "Excellent! The contrast emphasizes the speaker's determination to remain human and assert his identity.",
      incorrectFeedback: "Not quite. The contrast between bamboo and man emphasizes the speaker's determination to maintain his human identity."
    },
    {
      text: "Bend me then, O Lord, bend me if you can!",
      question: "Why is hyperbole effective in these lines?",
      choices: ["It creates a humorous effect.", "It describes the speaker's appearance.", "It gives factual information about physical strength.", "It emphasizes the speaker's resilience and determination."],
      answer: "It emphasizes the speaker's resilience and determination.",
      badgeAnswer: "Hyperbole",
      hint: "Hyperbole is often used to strengthen an idea or emotion.",
      correctFeedback: "Correct! The speaker exaggerates his strength and resilience to emphasize determination and unwavering faith.",
      incorrectFeedback: "Not quite. The line uses exaggeration to highlight the speaker's determination and inner strength, making it hyperbole."
    }
  ],

  game3: [
    {
      level: 1,
      literal: "The sea is calm tonight.",
      source: "The Sea",
      figure: "Simile",
      hint: "Simile compares two things using like or as. Example: Bright like the sun.",
      correctFeedback: "Great use of a simile! You used like or as to compare the sea clearly.",
      incorrectFeedback: "Your sentence does not use like or as. A simile needs a clear comparison.",
      checkRules: ["Must contain like or as", "Clear comparison present"]
    },
    {
      level: 1,
      literal: "The farmer is strong.",
      source: "Man of Earth",
      figure: "Metaphor",
      hint: "Metaphor directly compares two things without like or as. Example: He is a lion.",
      correctFeedback: "Excellent metaphor! The farmer is directly compared to something strong.",
      incorrectFeedback: "You used like or as, or the comparison was not direct. Metaphors should be direct.",
      checkRules: ["No like or as", "Direct comparison present"]
    },
    {
      level: 1,
      literal: "The wind moved through the forest.",
      source: "The Sea",
      figure: "Personification",
      hint: "Personification gives human actions or traits to non-human things. Example: The moon smiled.",
      correctFeedback: "Wonderful personification! The wind is given a human action or trait.",
      incorrectFeedback: "Your sentence does not give human qualities to a non-human thing.",
      checkRules: ["Non-human subject included", "Human action or emotion present"]
    },
    {
      level: 1,
      literal: "The child smiled happily.",
      source: "Song of Maria Clara",
      figure: "Simile",
      hint: "Use like or as to compare two unlike things.",
      correctFeedback: "Fantastic simile! The smile is compared to something bright or joyful.",
      incorrectFeedback: "The sentence lacks the comparison words like or as.",
      checkRules: ["Uses like or as", "Clear comparison shown"]
    },
    {
      level: 1,
      literal: "The rain fell on the roof.",
      source: "To a Lost One",
      figure: "Personification",
      hint: "Give human actions to non-human things. Example: The stars danced.",
      correctFeedback: "Excellent personification! The rain is described as if it can perform a human action.",
      incorrectFeedback: "Your sentence does not show human actions given to rain.",
      checkRules: ["Non-human object included", "Human action present"]
    },
    {
      level: 2,
      literal: "She waited for her beloved for many years.",
      source: "To a Lost One",
      figure: "Hyperbole",
      hint: "Hyperbole uses exaggeration for emphasis. Example: I cried a river.",
      correctFeedback: "Amazing exaggeration! Your sentence clearly stretches the waiting time for emphasis.",
      incorrectFeedback: "Your sentence does not clearly exaggerate the situation.",
      checkRules: ["Clear exaggeration present"]
    },
    {
      level: 2,
      literal: "The classroom was noisy.",
      source: "Classroom themes in Philippine literature discussions",
      figure: "Metaphor",
      hint: "A metaphor is a direct comparison without like or as.",
      correctFeedback: "Great metaphor! The classroom is directly compared to something noisy.",
      incorrectFeedback: "You used like or as, or the comparison was not direct. Metaphors should be direct.",
      checkRules: ["Direct comparison present", "No like or as"]
    },
    {
      level: 2,
      literal: "The river flowed smoothly.",
      source: "The Sea",
      figure: "Simile",
      hint: "Use like or as in comparing.",
      correctFeedback: "Wonderful simile! The river is compared clearly using like or as.",
      incorrectFeedback: "Your sentence lacks like or as.",
      checkRules: ["Uses comparison word"]
    },
    {
      level: 2,
      literal: "He carried a heavy basket.",
      source: "Man of Earth",
      figure: "Hyperbole",
      hint: "Use exaggeration to emphasize heaviness.",
      correctFeedback: "Fantastic hyperbole! The basket's weight is exaggerated.",
      incorrectFeedback: "The sentence lacks strong exaggeration.",
      checkRules: ["Exaggeration included"]
    },
    {
      level: 2,
      literal: "The fire burned brightly in the night.",
      source: "God Said I Made a Man",
      figure: "Alliteration",
      figureLabel: "Alliteration with Simile",
      requiresSimile: true,
      hint: "Use repeated consonant sounds and include a like or as comparison.",
      correctFeedback: "Fantastic figurative force! Your repeated sound creates alliteration, and your comparison adds a simile.",
      incorrectFeedback: "One required figure of speech is missing. Include alliteration and a like or as comparison.",
      checkRules: ["Alliteration included", "Simile included"]
    },
    {
      level: 3,
      literal: "The storm raged outside.",
      source: "Philippine short story settings during typhoons",
      figure: "Hyperbole",
      hint: "Exaggerate the storm to an impossible or extreme scale to intensify its power.",
      correctFeedback: "Excellent hyperbole! The storm is overstated beyond reality while keeping its original idea.",
      incorrectFeedback: "This is not hyperbole because it stays literal and does not exaggerate beyond reality.",
      checkRules: ["Strong exaggeration beyond realistic description", "Maintains idea of a storm but amplifies intensity", "Clearly non-literal and expressive"]
    },
    {
      level: 3,
      literal: "The fisherman was very tired after sailing.",
      source: "The Sea",
      figure: "Hyperbole",
      hint: "Hyperbole uses strong exaggeration for emphasis. Example: I'm starving to death.",
      correctFeedback: "Amazing exaggeration! Your sentence strongly exaggerates the fisherman's exhaustion.",
      incorrectFeedback: "Your sentence does not clearly exaggerate the situation.",
      checkRules: ["Clear exaggeration present"]
    },
    {
      level: 3,
      literal: "The girl's voice was soft while singing.",
      source: "Song of Maria Clara",
      figure: "Simile",
      hint: "Use like or as to compare two unlike things.",
      correctFeedback: "Wonderful simile! The girl's voice is compared clearly using like or as.",
      incorrectFeedback: "The sentence does not contain like or as.",
      checkRules: ["Uses like or as", "Clear comparison included"]
    },
    {
      level: 3,
      literal: "The mother gave comfort to her child.",
      source: "The Sea",
      figure: "Metaphor",
      hint: "A metaphor directly compares two things without like or as. Example: Life is a journey.",
      correctFeedback: "Excellent metaphor! The mother is directly compared to something comforting.",
      incorrectFeedback: "You used like or as, or the comparison was not direct. Metaphors should be direct.",
      checkRules: ["Direct comparison present", "No like or as"]
    },
    {
      level: 3,
      literal: "The leaves moved during the storm.",
      source: "Storm setting",
      figure: "Personification",
      hint: "Personification gives human emotions or actions to non-human things. Example: The angry clouds cried.",
      correctFeedback: "Fantastic personification! The leaves are given a human action or emotion.",
      incorrectFeedback: "The sentence does not give human traits or emotions to the leaves.",
      checkRules: ["Human action included"]
    }
  ]
}

const game2LiteraryTexts = [
  {
    title: "The Sea",
    author: "Natividad Marquez",
    text: "Why does the sea laugh, Mother,\nAs it glints beneath the sun?\nIt is thinking of the joys, my child,\nThat it wishes every one.\nWhy does the sea sob so, Mother,\nAs it breaks on the rocky shore?\nIt recalls the sorrows of the world,\nAnd weeps forevermore.\nWhy is the sea so peaceful, Mother,\nAs if it were fast asleep?\nIt would give our tired hearts, dearest child,\nThe comfort of the deep.",
    questions: questionBank.game2.slice(0, 5)
  },
  {
    title: "Song of Maria Clara",
    author: "Dr. Jose P. Rizal",
    text: "Sweet the hours in the native country,\nwhere friendly shines the sun above!\nLife is the breeze that sweeps the meadows;\ntranquil is death; most tender, love.\nWarm kisses on the lips are playing\nas we awake to mother's face:\nthe arms are seeking to embrace her,\nthe eyes are smiling as they gaze.\nHow sweet to die for the native country,\nwhere friendly shines the sun above!\nDeath is the breeze for him who has\nno country, no mother, and no love!",
    questions: questionBank.game2.slice(5, 10)
  },
  {
    title: "To a Lost One",
    author: "Angela Manalang Gloria",
    text: "I shall haunt you, O my lost one, as the twilight\nHaunts a grieving bamboo trail,\nAnd your dreams will linger strangely with the music\nOf a phantom lover's tale.\nYou shall not forget, for I am past forgetting.\nI shall come to you again\nWith the starlight, and the scent of wild champakas,\nAnd the melody of rain.\nYou shall not forget. Dusk will peer into your\nWindow, tragic-eyed and still,\nAnd unbidden startle you into remembrance\nWith its hand upon the sill.",
    questions: questionBank.game2.slice(10, 15)
  },
  {
    title: "God Said \"I Made a Man\"",
    author: "Jose Garcia Villa",
    text: "God said, \"I made a man\nOut of clay-\"\nBut so bright he, he spun\nHimself to brightest Day\nTill he was all shining gold,\nAnd oh,\nHe was lovely to behold!\nBut in his hands held he a bow\nAimed at me who created\nHim. And I said,\nWouldst murder me\nWho am thy Fountainhead!\nThen spoke he the man of gold:\nI will not\nMurder thee! I do but\nMeasure thee. Hold\nThy peace. And this I did.\nBut I was curious\nOf this so regal head.\nGive thy name! - Sir! Genius.",
    questions: questionBank.game2.slice(15, 20)
  },
  {
    title: "Man of Earth",
    author: "Amador T. Daguio",
    text: "Pliant is the bamboo,\nI am a man of earth.\nThey say that from the bamboo,\nWe had our first birth.\nAm I of the body,\nOr of the green leaf?\nDo I have to whisper,\nMy every sin and grief?\nIf the wind passes by,\nMust I stop and try\nto measure fully\nmy flexibility?\nI might have been the bamboo,\nbut I will be a man!\nBend me then, O Lord,\nBend me if you can!",
    questions: questionBank.game2.slice(20, 25)
  }
]

const sentenceSleuthFeedback = []

questionBank.game1.forEach((question, index) => {
  const feedback = sentenceSleuthFeedback[index]
  if (!feedback) return

  if (!question.correctFeedback) question.correctFeedback = feedback[0]
  if (!question.incorrectFeedback) question.incorrectFeedback = feedback[1]
})

const sentenceSleuthLevels = [
  { level: 1, name: "Level 1: Figurative Language", questions: questionBank.game1.slice(0, 10) },
  { level: 2, name: "Level 2: Sound Devices", questions: questionBank.game1.slice(10, 20) },
  { level: 3, name: "Level 3: Imagery", questions: questionBank.game1.slice(20, 30) }
]

function hideAllScreens() {
  document.querySelectorAll(".screen").forEach(screen => screen.classList.add("hidden"))
  setGameIdVisibility(false)
}

function normalizePlayerName(name) {
  return (name || "").replace(/\s+/g, " ").trim().slice(0, 16)
}

function normalizeRoomCode(value) {
  const clean = String(value || "CLASS")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16)

  return clean || "CLASS"
}

function getInitialMultiplayerRoomCode() {
  const urlCode = normalizeRoomCode(new URLSearchParams(window.location.search).get("room") || "")

  if (urlCode !== "CLASS" || new URLSearchParams(window.location.search).has("room")) {
    try {
      localStorage.setItem(classroomRoomStorageKey, urlCode)
    } catch {
      // Ignore storage limits. The URL room still works.
    }
    return urlCode
  }

  try {
    return normalizeRoomCode(localStorage.getItem(classroomRoomStorageKey) || "CLASS")
  } catch {
    return "CLASS"
  }
}

function createClassroomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "ROOM"

  for (let i = 0; i < 4; i++) {
    code += letters[Math.floor(Math.random() * letters.length)]
  }

  return code
}

function normalizeClassroomApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "")
}

function getInitialClassroomApiBase() {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = normalizeClassroomApiBase(params.get("api") || "")

  if (fromUrl) {
    try {
      localStorage.setItem(classroomApiStorageKey, fromUrl)
    } catch {
      // API still works for this page load.
    }
    return fromUrl
  }

  const fromConfig = normalizeClassroomApiBase(window.METAPHORIA_API_BASE || "")
  if (fromConfig) return fromConfig

  try {
    const saved = normalizeClassroomApiBase(localStorage.getItem(classroomApiStorageKey) || "")
    if (saved) return saved
  } catch {
    // Ignore storage limits.
  }

  if (window.location.hostname.includes("netlify.app")) {
    return "/.netlify/functions/classroom"
  }

  return ""
}

function isNetlifyFunctionApi() {
  return /\/\.netlify\/functions\/classroom$/i.test(classroomApiBase)
}

function getClassroomApiUrl(path, query = "") {
  if (!classroomApiBase) return `${path}${query}`
  if (isNetlifyFunctionApi()) return `${classroomApiBase}${query}`
  return `${classroomApiBase}${path}${query}`
}

function getClassroomRoomApiUrl() {
  return getClassroomApiUrl("/api/room", `?room=${encodeURIComponent(multiplayerRoomCode)}`)
}

function getClassroomScoreApiUrl() {
  return getClassroomApiUrl("/api/score")
}

function getClassroomEventsApiUrl() {
  if (isNetlifyFunctionApi()) return ""
  return getClassroomApiUrl("/api/events", `?room=${encodeURIComponent(multiplayerRoomCode)}&clientId=${encodeURIComponent(getMultiplayerClientId())}`)
}

function shouldShareApiParam() {
  return Boolean(classroomApiBase && !isNetlifyFunctionApi())
}

function appendClassroomParams(url, includeApi = true) {
  url.searchParams.set("room", multiplayerRoomCode)

  if (includeApi && shouldShareApiParam()) {
    url.searchParams.set("api", classroomApiBase)
  }

  return url
}

function getStudentClassroomUrl() {
  return appendClassroomParams(new URL("/index.html", window.location.origin)).href
}

function getTeacherScoreboardUrl() {
  return appendClassroomParams(new URL("/teacher-scoreboard.html", window.location.origin)).href
}

function resetMultiplayerConnection() {
  if (multiplayerEventSource) {
    multiplayerEventSource.close()
    multiplayerEventSource = null
  }

  clearInterval(multiplayerPollTimer)
  clearInterval(multiplayerHeartbeatTimer)
  clearTimeout(multiplayerScoreTimer)
  multiplayerPollTimer = null
  multiplayerHeartbeatTimer = null
  multiplayerScoreTimer = null
  multiplayerConnected = false
}

function setClassroomRoomCode(code, syncNow = true) {
  multiplayerRoomCode = normalizeRoomCode(code)

  try {
    localStorage.setItem(classroomRoomStorageKey, multiplayerRoomCode)
  } catch {
    // Room still works from the current URL.
  }

  if (window.history?.replaceState) {
    const url = new URL(window.location.href)
    url.searchParams.set("room", multiplayerRoomCode)
    window.history.replaceState(null, "", url)
  }

  updateClassroomLobby()

  if (syncNow) {
    resetMultiplayerConnection()
    initMultiplayer()
    syncMultiplayerScore("room")
  }
}

function updateClassroomLobby() {
  const roomCode = document.getElementById("classroomRoomCode")
  const roomInput = document.getElementById("classroomRoomInput")
  const studentLink = document.getElementById("classroomStudentLink")

  if (roomCode) roomCode.innerText = multiplayerRoomCode
  if (roomInput) roomInput.value = multiplayerRoomCode
  if (studentLink) studentLink.innerText = getStudentClassroomUrl()
}

function showClassroomLobby() {
  playMusic()
  hideAllScreens()
  updateClassroomLobby()
  document.getElementById("classroomLobby").classList.remove("hidden")
  setGameIdVisibility(false)
}

function createClassroomRoom() {
  setClassroomRoomCode(createClassroomCode())
  showPopup("Room Created", `Share code ${multiplayerRoomCode} or copy the student link. Open the teacher scoreboard to monitor scores.`)
}

function applyClassroomRoomFromInput() {
  const input = document.getElementById("classroomRoomInput")
  setClassroomRoomCode(input?.value || "CLASS")
  showPopup("Room Ready", `This device is now using room ${multiplayerRoomCode}.`)
}

function openTeacherScoreboard() {
  updateClassroomLobby()
  const opened = window.open(getTeacherScoreboardUrl(), "_blank")

  if (!opened) {
    window.location.href = getTeacherScoreboardUrl()
  }
}

function copyStudentClassroomLink() {
  const link = getStudentClassroomUrl()
  updateClassroomLobby()

  navigator.clipboard?.writeText(link)
    .then(() => showPopup("Student Link Copied", `Room code: ${multiplayerRoomCode}`))
    .catch(() => showPopup("Student Link", link))
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]))
}

function formatQuestionPrompt(question) {
  return [question.sentence, question.question]
    .filter(Boolean)
    .map(part => escapeHtml(part).replace(/\n/g, "<br>"))
    .join("<br><br>")
}

function fitQuestionTextToCard() {
  const card = document.querySelector("#playMode .question-card")
  const text = document.getElementById("questionText")
  if (!card || !text) return

  text.style.removeProperty("font-size")
  text.style.removeProperty("line-height")

  if (![1, 2, 3].includes(currentGame)) return

  let fontSize = parseFloat(window.getComputedStyle(card).fontSize) || 20
  const minRatio = currentGame === 2 ? 0.56 : currentGame === 3 ? 0.58 : 0.62
  const minSize = Math.max(9, fontSize * minRatio)
  text.style.setProperty("font-size", `${fontSize}px`, "important")
  text.style.setProperty("line-height", currentGame === 2 ? "1.14" : currentGame === 3 ? "1.12" : "1.13", "important")

  for (let step = 0; step < 18 && fontSize > minSize; step++) {
    if (text.scrollHeight <= card.clientHeight && text.scrollWidth <= card.clientWidth) break
    fontSize -= 1
    text.style.setProperty("font-size", `${fontSize}px`, "important")
  }
}

function fitGame1ChoicesToBoard() {
  if (currentGame !== 1 && currentGame !== 2) return

  const selector = currentGame === 1
    ? "#playMode.game1-bg #choices"
    : "#playMode.game2-bg:not(.reading-text-mode) #choices"
  const choices = document.querySelector(selector)
  if (!choices) return

  const buttons = [...choices.querySelectorAll("button")]
  if (!buttons.length) return

  choices.style.gap = ""
  buttons.forEach(button => {
    button.style.removeProperty("font-size")
    button.style.removeProperty("line-height")
    button.style.removeProperty("padding-top")
    button.style.removeProperty("padding-bottom")
  })

  buttons.forEach(button => {
    let fontSize = parseFloat(window.getComputedStyle(button).fontSize) || 13
    const minSize = fontSize * (currentGame === 2 ? 0.58 : 0.68)
    let verticalPadding = parseFloat(window.getComputedStyle(button).paddingTop) || 4

    for (let step = 0; step < (currentGame === 2 ? 18 : 12) && fontSize > minSize; step++) {
      if (button.scrollHeight <= button.clientHeight && button.scrollWidth <= button.clientWidth) break
      fontSize -= 0.8
      verticalPadding = Math.max(1, verticalPadding - 0.25)
      button.style.setProperty("font-size", `${fontSize}px`, "important")
      button.style.setProperty("line-height", currentGame === 2 ? "1.02" : "1.04", "important")
      button.style.setProperty("padding-top", `${verticalPadding}px`, "important")
      button.style.setProperty("padding-bottom", `${verticalPadding}px`, "important")
    }
  })
}

function getChoiceLengthClass(choice) {
  const length = String(choice || "").length
  if (length > 78) return "choice-xl"
  if (length > 54) return "choice-long"
  return ""
}

function createProfileId() {
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDefaultGameStartRecords() {
  return {
    "1-1": { score: 0, streak: 0, hintCount: 0 }
  }
}

function resetPlayerProgress() {
  unlockedGame = 1
  completedGames = new Set()
  currentModule = 1
  lessonIndex = 0
  currentGame = 1
  currentSentenceLevel = 1
  unlockedSentenceLevel = 1
  completedSentenceLevels = new Set()
  currentQuestion = 0
  questions = []
  score = 0
  streak = 0
  correctAnswers = 0
  hintCount = 0
  rewardTracker = 0
  carryScore = 0
  carryStreak = 0
  carryHintCount = 0
  gameStartRecords = getDefaultGameStartRecords()
  earnedBadges = new Set()
  badgeProgress = createEmptyBadgeProgress()
  allBadgesBonusAwarded = false
  badgeRunSnapshot = null
  savedAnswerRuns = []
  currentRunAnswers = []
  clearTimeout(learnResponseSaveTimer)
  learnResponseSaveTimer = null
  learnResponses = {}
}

function createDefaultPlayerProfile(name) {
  return {
    id: createProfileId(),
    name: normalizePlayerName(name) || "Player",
    badges: [],
    badgeProgress: createEmptyBadgeProgress(),
    unlockedGame: 1,
    completedGames: [],
    unlockedSentenceLevel: 1,
    completedSentenceLevels: [],
    currentSentenceLevel: 1,
    carryScore: 0,
    carryStreak: 0,
    carryHintCount: 0,
    gameStartRecords: getDefaultGameStartRecords(),
    topScore: 0,
    lastScore: 0,
    answerRuns: [],
    learnResponses: [],
    allBadgesBonusAwarded: false
  }
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function sanitizeAnswerText(value, maxLength = 280, fallback = "") {
  const clean = String(value || fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return clean.slice(0, maxLength)
}

function sanitizeSavedAnswerRuns(runs) {
  if (!Array.isArray(runs)) return []

  return runs
    .slice(0, MAX_SAVED_ANSWER_RUNS)
    .map((run, runIndex) => {
      const safeRun = run && typeof run === "object" ? run : {}
      const answers = Array.isArray(safeRun.answers) ? safeRun.answers : []
      const gameNumber = clampNumber(safeRun.game, 1, 3, 1)
      const answerLimit = getQuestionLimitForGame(gameNumber)

      return {
        id: sanitizeAnswerText(safeRun.id, 80, `answers-${Date.now()}-${runIndex}`),
        title: sanitizeAnswerText(safeRun.title, 80, "Completed Game"),
        game: gameNumber,
        level: safeRun.level === null || safeRun.level === undefined
          ? null
          : clampNumber(safeRun.level, 1, 3, 1),
        completedAt: Math.max(0, Number(safeRun.completedAt) || Date.now()),
        score: Math.max(0, Number(safeRun.score) || 0),
        correctAnswers: Math.max(0, Number(safeRun.correctAnswers) || 0),
        totalQuestions: Math.max(0, Number(safeRun.totalQuestions) || answers.length),
        answers: answers.slice(0, answerLimit).map((answer, index) => {
          const safeAnswer = answer && typeof answer === "object" ? answer : {}

          return {
            number: clampNumber(safeAnswer.number, 1, 99, index + 1),
            question: sanitizeAnswerText(safeAnswer.question, 360, "Question"),
            playerAnswer: sanitizeAnswerText(safeAnswer.playerAnswer, 160, "No answer"),
            correctAnswer: sanitizeAnswerText(safeAnswer.correctAnswer, 160, "N/A"),
            isCorrect: Boolean(safeAnswer.isCorrect)
          }
        })
      }
    })
    .filter(run => run.answers.length > 0)
}

function sanitizeLearnResponses(responses) {
  const list = Array.isArray(responses)
    ? responses
    : Object.values(responses || {})

  return list
    .slice(0, MAX_LEARN_RESPONSES)
    .map((response, index) => {
      const safeResponse = response && typeof response === "object" ? response : {}
      const answer = sanitizeAnswerText(safeResponse.answer, MAX_LEARN_RESPONSE_LENGTH)

      return {
        id: sanitizeAnswerText(safeResponse.id, 80, `learn-response-${index}`),
        title: sanitizeAnswerText(safeResponse.title, 80, "Learning Response"),
        prompt: sanitizeAnswerText(safeResponse.prompt, 160, "Student response"),
        answer,
        updatedAt: Math.max(0, Number(safeResponse.updatedAt) || Date.now())
      }
    })
    .filter(response => response.id && response.answer)
}

function createLearnResponseMap(responses) {
  return Object.fromEntries(
    sanitizeLearnResponses(responses).map(response => [response.id, response])
  )
}

function getLearnResponsesForPayload() {
  return sanitizeLearnResponses(Object.values(learnResponses))
}

function getGameAnswersForPayload() {
  return sanitizeSavedAnswerRuns(savedAnswerRuns).slice(0, MAX_CLASSROOM_ANSWER_RUNS)
}

function sanitizePlayerProfile(profile) {
  const safe = profile && typeof profile === "object" ? profile : {}
  const cleanBadges = Array.isArray(safe.badges)
    ? safe.badges.filter(badgeId => Boolean(badgeDefinitions[badgeId]))
    : []
  const cleanUniqueBadges = [...new Set(cleanBadges)].slice(0, BADGE_CAP)
  const cleanBadgeProgress = createEmptyBadgeProgress()

  if (safe.badgeProgress && typeof safe.badgeProgress === "object") {
    Object.keys(cleanBadgeProgress).forEach(badgeId => {
      const storedCount = Number(safe.badgeProgress[badgeId]) || 0
      cleanBadgeProgress[badgeId] = Math.min(BADGE_REQUIRED_CORRECT, Math.max(0, storedCount))
    })
  }

  cleanUniqueBadges.forEach(badgeId => {
    cleanBadgeProgress[badgeId] = BADGE_REQUIRED_CORRECT
  })

  const cleanCompletedGames = Array.isArray(safe.completedGames)
    ? safe.completedGames.map(Number).filter(game => game >= 1 && game <= 3)
    : []
  const cleanCompletedLevels = Array.isArray(safe.completedSentenceLevels)
    ? safe.completedSentenceLevels.map(Number).filter(level => level >= 1 && level <= 3)
    : []

  return {
    id: typeof safe.id === "string" && safe.id ? safe.id : createProfileId(),
    name: normalizePlayerName(safe.name) || "Player",
    badges: cleanUniqueBadges,
    badgeProgress: cleanBadgeProgress,
    unlockedGame: clampNumber(safe.unlockedGame, 1, 3, 1),
    completedGames: [...new Set(cleanCompletedGames)],
    unlockedSentenceLevel: clampNumber(safe.unlockedSentenceLevel, 1, 3, 1),
    completedSentenceLevels: [...new Set(cleanCompletedLevels)],
    currentSentenceLevel: clampNumber(safe.currentSentenceLevel, 1, 3, 1),
    carryScore: Math.max(0, Number(safe.carryScore) || 0),
    carryStreak: Math.max(0, Number(safe.carryStreak) || 0),
    carryHintCount: Math.max(0, Number(safe.carryHintCount) || 0),
    gameStartRecords: safe.gameStartRecords && typeof safe.gameStartRecords === "object"
      ? safe.gameStartRecords
      : getDefaultGameStartRecords(),
    topScore: Math.max(0, Number(safe.topScore) || 0),
    lastScore: Math.max(0, Number(safe.lastScore) || 0),
    answerRuns: sanitizeSavedAnswerRuns(safe.answerRuns),
    learnResponses: sanitizeLearnResponses(safe.learnResponses),
    allBadgesBonusAwarded: Boolean(safe.allBadgesBonusAwarded) && cleanUniqueBadges.length >= BADGE_CAP
  }
}

function loadStoredProfiles() {
  try {
    const storedProfiles = JSON.parse(localStorage.getItem(playerProfilesStorageKey) || "[]")
    playerProfiles = Array.isArray(storedProfiles)
      ? storedProfiles.map(sanitizePlayerProfile)
      : []

    if (!playerProfiles.length) {
      const legacyProfile = JSON.parse(localStorage.getItem(playerProfileStorageKey) || "{}")
      if (legacyProfile && legacyProfile.name) {
        playerProfiles = [sanitizePlayerProfile(legacyProfile)]
      }
    }
  } catch {
    playerProfiles = []
  }
}

function writeStoredProfiles() {
  try {
    localStorage.setItem(playerProfilesStorageKey, JSON.stringify(playerProfiles))
    if (activeProfileId) localStorage.setItem(activePlayerStorageKey, activeProfileId)
  } catch {
    // Keep in-memory profiles if browser storage is unavailable.
  }
}

function repairDeveloperBypassProfiles() {
  let changed = false
  const bypassProfileIds = new Set(
    playerProfiles
      .filter(profile =>
        profile.name === "Developer"
        && profile.unlockedGame >= 3
        && Array.isArray(profile.completedSentenceLevels)
        && profile.completedSentenceLevels.length >= 3
      )
      .map(profile => profile.id)
  )

  if (bypassProfileIds.size) {
    playerProfiles = playerProfiles.filter(profile => !bypassProfileIds.has(profile.id))
    changed = true
  }

  playerProfiles = playerProfiles.map(profile => {
    const completed = new Set(profile.completedGames || [])
    const repaired = { ...profile }

    if (repaired.unlockedGame > 1 && !completed.has(1)) {
      repaired.unlockedGame = 1
      repaired.unlockedSentenceLevel = 1
      repaired.completedSentenceLevels = []
      repaired.currentSentenceLevel = 1
      changed = true
    } else if (repaired.unlockedGame > 2 && !completed.has(2)) {
      repaired.unlockedGame = 2
      repaired.unlockedSentenceLevel = 3
      repaired.completedSentenceLevels = [1, 2, 3]
      changed = true
    }

    return repaired
  })

  if (!changed) return

  try {
    const activeId = localStorage.getItem(activePlayerStorageKey) || ""
    if (bypassProfileIds.has(activeId)) {
      localStorage.removeItem(activePlayerStorageKey)
      activeProfileId = ""
    }
    localStorage.setItem(playerProfilesStorageKey, JSON.stringify(playerProfiles))
  } catch {
    activeProfileId = bypassProfileIds.has(activeProfileId) ? "" : activeProfileId
  }
}

function getMultiplayerClientId() {
  if (multiplayerClientId) return multiplayerClientId

  try {
    multiplayerClientId = localStorage.getItem(multiplayerClientStorageKey) || ""

    if (!multiplayerClientId) {
      multiplayerClientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem(multiplayerClientStorageKey, multiplayerClientId)
    }
  } catch {
    multiplayerClientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  return multiplayerClientId
}

function canUseMultiplayer() {
  return window.location.protocol === "http:" || window.location.protocol === "https:"
}

function setLiveScoreStatus(message) {
  const status = document.getElementById("liveScoreStatus")
  if (status) status.innerText = message
}

function setLiveScoreVisibility(show) {
  const board = document.getElementById("liveScoreBoard")
  if (!board) return

  board.classList.toggle("hidden", !show)

  if (show && board.dataset.opened !== "true") {
    board.classList.remove("collapsed")
    board.dataset.opened = "true"
  }
}

function toggleLiveScoreBoard() {
  const board = document.getElementById("liveScoreBoard")
  if (!board) return

  board.classList.toggle("collapsed")
}

function getPlayerLiveStatus() {
  if (!document.getElementById("playMode")?.classList.contains("hidden")) {
    return currentGame === 1
      ? `Playing Level ${currentSentenceLevel}`
      : "Playing"
  }

  if (!document.getElementById("learnMode")?.classList.contains("hidden")) return "Learning"
  if (!document.getElementById("moduleMap")?.classList.contains("hidden")) return "Choosing game"
  if (!document.getElementById("learnBlank")?.classList.contains("hidden")) return "Choosing lesson"
  if (!document.getElementById("fullscreenGuide")?.classList.contains("hidden")) return "Fullscreen guide"
  if (!document.getElementById("chooseMode")?.classList.contains("hidden")) return "Choosing mode"
  if (!document.getElementById("profileHub")?.classList.contains("hidden")) return "Profile"

  return "Lobby"
}

function getMultiplayerPayload() {
  return {
    roomCode: multiplayerRoomCode,
    clientId: getMultiplayerClientId(),
    name: playerName || "Player",
    score,
    streak,
    hints: hintCount,
    badges: earnedBadges.size,
    game: gameTitles[currentGame] || "Lobby",
    level: currentGame === 1 ? `Level ${currentSentenceLevel}` : "",
    status: getPlayerLiveStatus(),
    gameAnswers: getGameAnswersForPayload(),
    learnAnswers: getLearnResponsesForPayload()
  }
}

function createScoreRows(items = [], emptyText = "Waiting for scores", highlight = () => false) {
  if (!items.length) {
    return `<li><span class="live-score-rank">-</span><span class="live-score-name">${escapeHtml(emptyText)}</span><strong class="live-score-points">0</strong></li>`
  }

  return items.map((player, index) => {
    const isMe = highlight(player) ? " is-me" : ""
    const detail = [player.game, player.level].filter(Boolean).join(" ")
    return `
      <li class="${isMe.trim()}">
        <span class="live-score-rank">${index + 1}</span>
        <span class="live-score-name" title="${escapeHtml(detail || player.status || "")}">${escapeHtml(player.name || "Player")}</span>
        <strong class="live-score-points">${Number(player.score) || 0}</strong>
      </li>
    `
  }).join("")
}

function renderLiveScores(data = {}) {
  const liveList = document.getElementById("liveScoreList")
  const topList = document.getElementById("topScoreList")
  const room = document.getElementById("liveRoomCode")
  if (!liveList || !topList) return

  if (room) room.innerText = `Room ${multiplayerRoomCode}`

  const players = Array.isArray(data)
    ? data
    : Array.isArray(data.players)
      ? data.players
      : []
  const leaders = !Array.isArray(data) && Array.isArray(data.leaders)
    ? data.leaders
    : players
  const safePlayers = players.slice(0, 10)
  const safeLeaders = leaders.slice(0, 10)
  const myName = normalizePlayerName(playerName).toLowerCase()

  liveList.innerHTML = createScoreRows(
    safePlayers,
    "No live players",
    player => player.clientId === multiplayerClientId
  )

  topList.innerHTML = createScoreRows(
    safeLeaders,
    "Earn score first",
    player => normalizePlayerName(player.name).toLowerCase() === myName
  )

  const count = !Array.isArray(data) && Number.isFinite(Number(data.playerCount))
    ? Number(data.playerCount)
    : players.length
  const topScore = safeLeaders[0]?.score || 0
  setLiveScoreStatus(multiplayerConnected
    ? `${count} live | Beat ${topScore}`
    : "Classroom server offline")
}

function fetchRoomSnapshot() {
  return fetch(getClassroomRoomApiUrl(), { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Classroom server is not available.")
      return response.json()
    })
}

function refreshMultiplayerScores() {
  if (!canUseMultiplayer()) return

  fetchRoomSnapshot()
    .then(data => {
      multiplayerConnected = true
      renderLiveScores(data)
      setLiveScoreVisibility(true)
    })
    .catch(() => {
      multiplayerConnected = false
      setLiveScoreVisibility(true)
      setLiveScoreStatus("Open the classroom server link to sync scores.")
    })
}

function startMultiplayerPolling() {
  if (multiplayerPollTimer || !canUseMultiplayer()) return

  multiplayerPollTimer = setInterval(refreshMultiplayerScores, 5000)
}

function startMultiplayerHeartbeat() {
  if (multiplayerHeartbeatTimer || !canUseMultiplayer()) return

  multiplayerHeartbeatTimer = setInterval(() => {
    if (playerName) syncMultiplayerScore("heartbeat")
  }, 3000)
}

function openMultiplayerEvents() {
  const eventsUrl = getClassroomEventsApiUrl()
  if (!window.EventSource || multiplayerEventSource || !eventsUrl) return

  multiplayerEventSource = new EventSource(eventsUrl)

  multiplayerEventSource.addEventListener("scoreboard", event => {
    try {
      const data = JSON.parse(event.data)
      multiplayerConnected = true
      renderLiveScores(data)
      setLiveScoreVisibility(true)
    } catch {
      setLiveScoreStatus("Live scores are reconnecting.")
    }
  })

  multiplayerEventSource.onerror = () => {
    multiplayerConnected = false
    setLiveScoreStatus("Live scores are reconnecting.")
    startMultiplayerPolling()
  }
}

function syncMultiplayerScore(reason = "update") {
  if (!canUseMultiplayer() || !playerName) return

  clearTimeout(multiplayerScoreTimer)
  multiplayerScoreTimer = setTimeout(() => {
    fetch(getClassroomScoreApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getMultiplayerPayload())
    })
      .then(response => {
        if (!response.ok) throw new Error("Score sync failed.")
        return response.json()
      })
      .then(data => {
        multiplayerConnected = true
        renderLiveScores(data)
        setLiveScoreVisibility(true)
      })
      .catch(() => {
        multiplayerConnected = false
        setLiveScoreStatus("Run the classroom server to sync scores.")
      })
  }, reason === "stats" ? 120 : 0)
}

function initMultiplayer() {
  const room = document.getElementById("liveRoomCode")
  if (room) room.innerText = `Room ${multiplayerRoomCode}`

  if (!canUseMultiplayer()) {
    setLiveScoreVisibility(false)
    return
  }

  getMultiplayerClientId()
  setLiveScoreStatus("Connecting to classroom...")

  setLiveScoreVisibility(true)

  fetchRoomSnapshot()
    .then(data => {
      multiplayerConnected = true
      renderLiveScores(data)
      setLiveScoreVisibility(true)
      openMultiplayerEvents()
      startMultiplayerPolling()
      startMultiplayerHeartbeat()
      syncMultiplayerScore("join")
    })
    .catch(() => {
      multiplayerConnected = false
      renderLiveScores({ players: [], leaders: [], playerCount: 0 })
      setLiveScoreVisibility(true)
      setLiveScoreStatus("Open the classroom server link to sync scores.")
      startMultiplayerPolling()
      startMultiplayerHeartbeat()
    })
}

function getHighestStoredScore() {
  const recordScores = Object.values(gameStartRecords || {}).map(record => Number(record?.score) || 0)
  return Math.max(0, score || 0, carryScore || 0, ...recordScores)
}

function serializeCurrentProfile(existingProfile = {}) {
  const topScore = Math.max(Number(existingProfile.topScore) || 0, getHighestStoredScore())

  return sanitizePlayerProfile({
    ...existingProfile,
    id: activeProfileId || existingProfile.id || createProfileId(),
    name: playerName,
    badges: [...earnedBadges],
    badgeProgress,
    unlockedGame,
    completedGames: [...completedGames],
    unlockedSentenceLevel,
    completedSentenceLevels: [...completedSentenceLevels],
    currentSentenceLevel,
    carryScore,
    carryStreak,
    carryHintCount,
    gameStartRecords,
    topScore,
    lastScore: score,
    answerRuns: savedAnswerRuns,
    learnResponses: getLearnResponsesForPayload(),
    allBadgesBonusAwarded
  })
}

function applyPlayerProfile(profile) {
  const cleanProfile = sanitizePlayerProfile(profile)

  resetPlayerProgress()
  activeProfileId = cleanProfile.id
  playerName = cleanProfile.name
  earnedBadges = new Set(cleanProfile.badges)
  badgeProgress = { ...createEmptyBadgeProgress(), ...cleanProfile.badgeProgress }
  unlockedGame = cleanProfile.unlockedGame
  completedGames = new Set(cleanProfile.completedGames)
  unlockedSentenceLevel = cleanProfile.unlockedSentenceLevel
  completedSentenceLevels = new Set(cleanProfile.completedSentenceLevels)
  currentSentenceLevel = cleanProfile.currentSentenceLevel
  carryScore = cleanProfile.carryScore
  carryStreak = cleanProfile.carryStreak
  carryHintCount = cleanProfile.carryHintCount
  gameStartRecords = cleanProfile.gameStartRecords || getDefaultGameStartRecords()
  score = cleanProfile.lastScore || 0
  savedAnswerRuns = cleanProfile.answerRuns || []
  learnResponses = createLearnResponseMap(cleanProfile.learnResponses)
  currentRunAnswers = []
  allBadgesBonusAwarded = cleanProfile.allBadgesBonusAwarded

  updateGameIdCard()
  syncMultiplayerScore("profile")
}

function savePlayerProfile() {
  if (!playerName) return

  const existingIndex = playerProfiles.findIndex(profile => profile.id === activeProfileId)
  const existingProfile = existingIndex >= 0 ? playerProfiles[existingIndex] : {}
  const savedProfile = serializeCurrentProfile(existingProfile)

  activeProfileId = savedProfile.id

  if (existingIndex >= 0) {
    playerProfiles[existingIndex] = savedProfile
  } else {
    playerProfiles.push(savedProfile)
  }

  writeStoredProfiles()
  syncMultiplayerScore("profile")
}

function loadPlayerProfile() {
  loadStoredProfiles()
  repairDeveloperBypassProfiles()

  try {
    activeProfileId = localStorage.getItem(activePlayerStorageKey) || ""
  } catch {
    activeProfileId = ""
  }

  const activeProfile = playerProfiles.find(profile => profile.id === activeProfileId)
  if (activeProfile) {
    applyPlayerProfile(activeProfile)
  } else {
    activeProfileId = ""
    playerName = ""
    resetPlayerProgress()
  }
}

function updateGameIdCard() {
  const nameEl = document.getElementById("gameIdName")
  if (nameEl) nameEl.innerText = playerName || "Player"

  const card = document.getElementById("gameIdCard")
  if (card) card.classList.toggle("all-badges-active", earnedBadges.size >= BADGE_CAP)

  const earnedBadgeIds = [...earnedBadges].filter(badgeId => badgeDefinitions[badgeId]).slice(0, BADGE_CAP)

  document.querySelectorAll(".game-id-badge-slot img").forEach((img, index) => {
    const badge = badgeDefinitions[earnedBadgeIds[index]]

    if (badge) {
      img.src = badge.id
      img.alt = `${badge.label} badge`
      img.classList.add("earned")
    } else {
      img.removeAttribute("src")
      img.alt = ""
      img.classList.remove("earned")
    }
  })
}

function setGameIdVisibility(show) {
  const card = document.getElementById("gameIdCard")
  if (!card) return

  updateGameIdCard()
  card.classList.toggle("hidden", !show || !playerName)
}

function showWelcome() {
  hideAllScreens()
  document.getElementById("welcomeScreen").classList.remove("hidden")
}

function showProfileHub() {
  playMusic()
  if (playerName) savePlayerProfile()
  loadStoredProfiles()
  hideAllScreens()
  renderProfileHub()
  document.getElementById("profileHub").classList.remove("hidden")
}

function renderProfileHub() {
  const profileList = document.getElementById("profileList")
  const leaderboardList = document.getElementById("leaderboardList")
  if (!profileList || !leaderboardList) return

  if (!playerProfiles.length) {
    profileList.innerHTML = `<p class="profile-empty">No saved players yet.</p>`
  } else {
    profileList.innerHTML = playerProfiles.map(profile => {
      const badgeCount = profile.badges.length
      const answerRunCount = sanitizeSavedAnswerRuns(profile.answerRuns).length
      const activeClass = profile.id === activeProfileId ? " active" : ""
      return `
        <button type="button" class="profile-save-card${activeClass}" onclick="continuePlayer('${profile.id}')">
          <span class="profile-save-name">${escapeHtml(profile.name)}</span>
          <span class="profile-save-meta">Best ${profile.topScore} | Badges ${badgeCount}/5 | Answers ${answerRunCount}</span>
        </button>
      `
    }).join("")
  }

  const leaders = [...playerProfiles]
    .sort((a, b) => (b.topScore || 0) - (a.topScore || 0))
    .slice(0, 10)

  leaderboardList.innerHTML = leaders.length
    ? leaders.map(profile => `
        <li>
          <span>${escapeHtml(profile.name)}</span>
          <strong>${profile.topScore || 0}</strong>
        </li>
      `).join("")
    : `<li class="leaderboard-empty">Scores appear after a game.</li>`
}

function formatSavedAnswerDate(timestamp) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })
}

function renderSavedAnswers(runs) {
  const safeRuns = sanitizeSavedAnswerRuns(runs)

  if (!safeRuns.length) {
    return `<p class="saved-answers-empty">No finished-game answers saved yet. Passed rounds will appear here automatically.</p>`
  }

  return `
    <div class="saved-answer-runs">
      ${safeRuns.map(run => `
        <section class="saved-answer-run">
          <h3>${escapeHtml(run.title)}</h3>
          <p class="saved-answer-meta">
            ${run.correctAnswers}/${run.totalQuestions} correct | Score ${run.score}${run.completedAt ? ` | ${escapeHtml(formatSavedAnswerDate(run.completedAt))}` : ""}
          </p>
          <ol class="saved-answer-list">
            ${run.answers.map(answer => `
              <li class="${answer.isCorrect ? "saved-correct" : "saved-wrong"}">
                <span class="saved-answer-number">${answer.number}</span>
                <div>
                  <strong>${escapeHtml(answer.question)}</strong>
                  <span>Your answer: ${escapeHtml(answer.playerAnswer)}</span>
                  <span>Correct answer: ${escapeHtml(answer.correctAnswer)}</span>
                </div>
              </li>
            `).join("")}
          </ol>
        </section>
      `).join("")}
    </div>
  `
}

function showSavedAnswers(profileId = activeProfileId) {
  if (playerName) savePlayerProfile()
  loadStoredProfiles()

  const profile = playerProfiles.find(savedProfile => savedProfile.id === profileId)
    || playerProfiles.find(savedProfile => savedProfile.id === activeProfileId)
    || null

  const popupBox = document.getElementById("popupBox")
  popupBox.classList.remove("mechanics-popup")
  popupBox.classList.add("answers-popup")
  document.getElementById("popupTitle").innerText = profile
    ? `${profile.name}'s Saved Answers`
    : "Saved Answers"
  document.getElementById("popupMessage").innerHTML = renderSavedAnswers(profile?.answerRuns || savedAnswerRuns)
  document.getElementById("popupPanel").classList.remove("hidden")
}

function continuePlayer(profileId) {
  const profile = playerProfiles.find(savedProfile => savedProfile.id === profileId)
  if (!profile) return

  applyPlayerProfile(profile)
  writeStoredProfiles()
  showFullscreenGuide()
  syncMultiplayerScore("profile")
}

function showPlayerSetup(newPlayer = false) {
  playMusic()
  creatingNewPlayer = Boolean(newPlayer)
  hideAllScreens()
  const input = document.getElementById("playerNameInput")
  document.getElementById("playerSetup").classList.remove("hidden")

  if (input) {
    input.value = creatingNewPlayer ? "" : playerName
    input.focus()
  }
}

function submitPlayerName() {
  const input = document.getElementById("playerNameInput")
  const name = normalizePlayerName(input?.value || "")

  if (!name) {
    showPopup("Name Required", "Please enter your player name before choosing a mode.")
    return
  }

  if (!creatingNewPlayer) {
    const existingProfile = playerProfiles.find(profile => profile.name.toLowerCase() === name.toLowerCase())
    if (existingProfile) {
      continuePlayer(existingProfile.id)
      return
    }
  }

  resetPlayerProgress()
  activeProfileId = createProfileId()
  playerName = name
  creatingNewPlayer = false
  savePlayerProfile()
  updateGameIdCard()
  showFullscreenGuide()
  syncMultiplayerScore("profile")
}

function showFullscreenGuide() {
  if (!playerName) {
    showPlayerSetup()
    return
  }

  playMusic()
  hideAllScreens()
  document.getElementById("fullscreenGuide").classList.remove("hidden")
  setGameIdVisibility(true)
  syncMultiplayerScore("screen")
}

function showChooseMode() {
  if (!playerName) {
    showPlayerSetup()
    return
  }

  playMusic()
  hideAllScreens()
  document.getElementById("chooseMode").classList.remove("hidden")
  setGameIdVisibility(true)
  syncMultiplayerScore("screen")
}

function showLearnBlank() {
  clearInterval(lessonTimerInterval)
  hideAllScreens()
  document.getElementById("learnBlank").classList.remove("hidden")
  setGameIdVisibility(true)
  syncMultiplayerScore("screen")
}

function showModuleMap() {
  playMusic()
  hideAllScreens()
  document.getElementById("moduleMap").classList.remove("hidden")
  setGameIdVisibility(true)
  updateModuleLocks()
  syncMultiplayerScore("screen")
}

function showDeveloperCheckPanel() {
  if (developerAuthorized) {
    openDeveloperCheckPanel()
    return
  }

  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")

  popupBox.classList.remove("mechanics-popup", "answers-popup", "developer-review-popup")
  popupBox.classList.add("developer-popup", "developer-password-popup")
  document.getElementById("popupTitle").innerText = "Developer Password"
  popupMessage.innerHTML = `
    <div class="developer-password-form">
      <input id="developerPasswordInput" type="password" maxlength="12" inputmode="numeric" autocomplete="off" placeholder="Enter password" aria-label="Developer password" onkeydown="if (event.key === 'Enter') submitDeveloperPassword()">
      <p id="developerPasswordError" class="developer-password-error" aria-live="polite"></p>
      <button type="button" onclick="submitDeveloperPassword()">Open Developer Check</button>
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
  requestAnimationFrame(() => document.getElementById("developerPasswordInput")?.focus())
}

function submitDeveloperPassword() {
  const input = document.getElementById("developerPasswordInput")
  const error = document.getElementById("developerPasswordError")

  if ((input?.value || "") !== DEVELOPER_PASSWORD) {
    if (error) error.innerText = "Incorrect password."
    if (input) {
      input.value = ""
      input.focus()
    }
    return
  }

  developerAuthorized = true
  openDeveloperCheckPanel()
}

function openDeveloperCheckPanel() {
  if (!developerAuthorized) {
    showDeveloperCheckPanel()
    return
  }

  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")

  popupBox.classList.remove("mechanics-popup", "answers-popup", "developer-password-popup", "developer-review-popup")
  popupBox.classList.add("developer-popup")
  document.getElementById("popupTitle").innerText = "Developer Check"
  popupMessage.innerHTML = `
    <div class="developer-check-grid">
      <button type="button" onclick="developerOpenQuestionList(1)">Check Game 1 Questions</button>
      <button type="button" onclick="developerOpenQuestionList(2)">Check Game 2 Questions</button>
      <button type="button" onclick="developerOpenQuestionList(3)">Check Game 3 Questions</button>
      <button type="button" onclick="developerOpenContentList(1)">Check Game 1 Texts</button>
      <button type="button" onclick="developerOpenContentList(2)">Check Game 2 Poems</button>
      <button type="button" onclick="developerOpenContentList(3)">Check Game 3 Prompts</button>
      <button type="button" onclick="developerOpenInstructionList()">Check Game Instructions</button>
      <button type="button" onclick="exitDeveloperMode()">Exit Dev Mode</button>
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
}

function exitDeveloperMode() {
  developerAuthorized = false
  developerPreviewMode = false
  clearInterval(questionTimerInterval)
  hideAllScreens()
  setGameIdVisibility(false)
  closePopup()
  showChooseMode()
}

function getDeveloperQuestionEntries(gameNumber) {
  if (gameNumber === 1) {
    return sentenceSleuthLevels.flatMap(level =>
      level.questions.map((question, index) => ({
        game: 1,
        level: level.level,
        index,
        label: `Level ${level.level} Q${index + 1}`,
        answer: question.answer || question.figure || "",
        question
      }))
    )
  }

  if (gameNumber === 2) {
    return questionBank.game2.map((question, index) => {
      const textGroup = game2LiteraryTexts[Math.floor(index / 5)] || game2LiteraryTexts[0]
      return {
        game: 2,
        level: null,
        index,
        textIndex: Math.floor(index / 5),
        label: `${textGroup.title} Q${(index % 5) + 1}`,
        answer: question.answer || "",
        question
      }
    })
  }

  return questionBank.game3.map((question, index) => ({
    game: 3,
    level: null,
    index,
    label: `Level ${question.level || Math.floor(index / 5) + 1} Q${(index % 5) + 1}`,
    answer: question.figureLabel || question.figure || "",
    question
  }))
}

function developerOpenQuestionList(gameNumber = 1) {
  if (!developerAuthorized) {
    showDeveloperCheckPanel()
    return
  }

  developerLastQuestionList = { type: "questions", game: gameNumber }

  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")
  const entries = getDeveloperQuestionEntries(gameNumber)
  const title = gameTitles[gameNumber] || `Game ${gameNumber}`

  popupBox.classList.remove("mechanics-popup", "answers-popup", "developer-review-popup")
  popupBox.classList.add("developer-popup")
  document.getElementById("popupTitle").innerText = `Check ${title}`
  popupMessage.innerHTML = `
    <div class="developer-question-tools">
      <button type="button" onclick="openDeveloperCheckPanel()">Back</button>
    </div>
    <div class="developer-question-list">
      ${entries.map(entry => `
        <button type="button" onclick="developerPreviewQuestion(${entry.game}, ${entry.level || 0}, ${entry.index})">
          <strong>${escapeHtml(entry.label)}</strong>
          <span>${escapeHtml(entry.answer)}</span>
        </button>
      `).join("")}
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
}

function getDeveloperContentEntries(gameNumber) {
  if (gameNumber === 1) {
    return sentenceSleuthLevels.flatMap(level =>
      level.questions.map((question, index) => ({
        game: 1,
        level: level.level,
        index,
        label: `Level ${level.level} Q${index + 1}`,
        title: question.sentence || question.text || question.question || "Sentence Sleuths Text",
        subtitle: question.question || "",
        body: question.sentence || question.text || "",
        answer: question.answer || question.figure || "",
        hint: question.hint || ""
      }))
    )
  }

  if (gameNumber === 2) {
    return game2LiteraryTexts.map((text, index) => ({
      game: 2,
      index,
      label: `Poem ${index + 1}`,
      title: text.title,
      subtitle: text.author,
      body: text.text,
      answer: `${text.questions?.length || 0} linked questions`,
      hint: ""
    }))
  }

  return questionBank.game3.map((question, index) => ({
    game: 3,
    index,
    label: `Level ${question.level || Math.floor(index / 5) + 1} Prompt ${(index % 5) + 1}`,
    title: `Rewrite using ${question.figureLabel || question.figure}`,
    subtitle: question.source ? `Inspired by ${question.source}` : question.literal,
    body: question.literal,
    answer: question.figureLabel || question.figure || "",
    hint: question.hint || "",
    checkRules: question.checkRules || []
  }))
}

function developerOpenContentList(gameNumber = 2) {
  if (!developerAuthorized) {
    showDeveloperCheckPanel()
    return
  }

  developerLastQuestionList = { type: "content", game: gameNumber }

  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")
  const labels = developerContentLabels[gameNumber] || developerContentLabels[2]
  const entries = getDeveloperContentEntries(gameNumber)

  popupBox.classList.remove("mechanics-popup", "answers-popup", "developer-password-popup")
  popupBox.classList.add("developer-popup", "developer-review-popup")
  document.getElementById("popupTitle").innerText = `Check ${labels.title}`
  popupMessage.innerHTML = `
    <div class="developer-question-tools">
      <button type="button" onclick="openDeveloperCheckPanel()">Back</button>
    </div>
    <div class="developer-poem-list developer-content-list">
      ${entries.map((entry, index) => `
        <button type="button" onclick="developerPreviewContent(${gameNumber}, ${index})">
          <strong>${escapeHtml(entry.label)}: ${escapeHtml(entry.title)}</strong>
          <span>${escapeHtml(entry.subtitle || entry.answer)}</span>
        </button>
      `).join("")}
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
}

function developerOpenPoemList() {
  developerOpenContentList(2)
}

function developerPreviewContent(gameNumber = 2, contentIndex = 0) {
  if (!developerAuthorized) {
    showDeveloperCheckPanel()
    return
  }

  if (gameNumber === 2) {
    developerPreviewPoem(contentIndex)
    return
  }

  const entries = getDeveloperContentEntries(gameNumber)
  const entry = entries[Math.max(0, Math.min(entries.length - 1, contentIndex))] || entries[0]
  if (!entry) return

  developerLastQuestionList = { type: "content", game: gameNumber }

  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")
  const previewArgs = gameNumber === 1
    ? `${entry.game}, ${entry.level || 0}, ${entry.index}`
    : `${entry.game}, 0, ${entry.index}`

  popupBox.classList.remove("mechanics-popup", "answers-popup", "developer-password-popup")
  popupBox.classList.add("developer-popup", "developer-review-popup")
  document.getElementById("popupTitle").innerText = `${developerContentLabels[gameNumber].itemName} Preview`
  popupMessage.innerHTML = `
    <div class="developer-question-tools">
      <button type="button" onclick="developerOpenContentList(${gameNumber})">Back</button>
      <button type="button" onclick="developerPreviewQuestion(${previewArgs})">Preview Board</button>
    </div>
    <div class="developer-content-preview">
      <strong>${escapeHtml(entry.label)}</strong>
      <h3>${escapeHtml(entry.title)}</h3>
      ${entry.subtitle ? `<p class="developer-content-subtitle">${escapeHtml(entry.subtitle)}</p>` : ""}
      ${entry.body ? `<p>${escapeHtml(entry.body).replace(/\n/g, "<br>")}</p>` : ""}
      ${entry.answer ? `<p><b>Answer:</b> ${escapeHtml(entry.answer)}</p>` : ""}
      ${entry.hint ? `<p><b>Hint:</b> ${escapeHtml(entry.hint)}</p>` : ""}
      ${entry.checkRules?.length ? `<p><b>Checks:</b><br>${entry.checkRules.map(rule => `- ${escapeHtml(rule)}`).join("<br>")}</p>` : ""}
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
}

function developerPreviewPoem(textIndex = 0) {
  if (!developerAuthorized) {
    showDeveloperCheckPanel()
    return
  }

  closePopup()
  developerPreviewMode = true
  developerLastQuestionList = { type: "content", game: 2 }
  currentGame = 2
  currentQuestion = 0
  questions = []
  alreadyAnswered = true
  activeGame2Text = game2LiteraryTexts[Math.max(0, Math.min(game2LiteraryTexts.length - 1, textIndex))] || game2LiteraryTexts[0]
  questionDuration = 15

  const playMode = document.getElementById("playMode")
  playMode.classList.remove("game1-bg", "game2-bg", "game3-bg", "practice-replay", "reading-text-mode")
  playMode.classList.add("game2-bg", "practice-replay")

  hideAllScreens()
  playMode.classList.remove("hidden")
  setGameIdVisibility(false)
  showGame2ReadingPage()
}

function developerReturnToContentList() {
  developerPreviewMode = false
  clearInterval(questionTimerInterval)
  hideAllScreens()
  setGameIdVisibility(false)
  developerOpenContentList(developerLastQuestionList.game || 2)
}

function developerReturnToPoemList() {
  developerReturnToContentList()
}

function developerOpenInstructionList() {
  if (!developerAuthorized) {
    showDeveloperCheckPanel()
    return
  }

  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")

  popupBox.classList.remove("mechanics-popup", "answers-popup", "developer-password-popup", "developer-review-popup")
  popupBox.classList.add("developer-popup")
  document.getElementById("popupTitle").innerText = "Check Game Instructions"
  popupMessage.innerHTML = `
    <div class="developer-question-tools">
      <button type="button" onclick="openDeveloperCheckPanel()">Back</button>
    </div>
    <div class="developer-check-grid">
      <button type="button" onclick="developerPreviewInstructions(1)">Sentence Sleuths Instructions</button>
      <button type="button" onclick="developerPreviewInstructions(2)">Text Detectives Instructions</button>
      <button type="button" onclick="developerPreviewInstructions(3)">Expression Lab Instructions</button>
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
}

function developerPreviewInstructions(gameNumber = 1) {
  if (!developerAuthorized) {
    showDeveloperCheckPanel()
    return
  }

  const page = gameMechanicsPages[gameNumber] || gameMechanicsPages[1]
  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")

  popupBox.classList.remove("mechanics-popup", "answers-popup", "developer-password-popup")
  popupBox.classList.add("developer-popup", "developer-review-popup")
  document.getElementById("popupTitle").innerText = `${page.title} Instructions`
  popupMessage.innerHTML = `
    <div class="developer-question-tools">
      <button type="button" onclick="developerOpenInstructionList()">Back</button>
      <button type="button" onclick="openDeveloperCheckPanel()">Developer Menu</button>
    </div>
    <div class="developer-instruction-preview">
      ${page.content}
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
}

function developerPreviewQuestion(gameNumber, sentenceLevel = 0, questionIndex = 0) {
  if (!developerAuthorized) {
    showDeveloperCheckPanel()
    return
  }

  closePopup()

  developerPreviewMode = true
  currentGame = gameNumber
  currentQuestion = 0
  correctAnswers = 0
  alreadyAnswered = false
  resetCurrentRunAnswers()

  const playMode = document.getElementById("playMode")
  playMode.classList.remove("game1-bg", "game2-bg", "game3-bg", "practice-replay", "reading-text-mode")
  playMode.classList.add("practice-replay")

  if (gameNumber === 1) {
    currentSentenceLevel = sentenceLevel || 1
    const level = getSentenceSleuthLevel(currentSentenceLevel)
    questions = [level.questions[questionIndex] || level.questions[0]]
    questionDuration = 15
    playMode.classList.add("game1-bg")
  } else if (gameNumber === 2) {
    const safeIndex = Math.max(0, Math.min(questionBank.game2.length - 1, questionIndex))
    activeGame2Text = game2LiteraryTexts[Math.floor(safeIndex / 5)] || game2LiteraryTexts[0]
    questions = [questionBank.game2[safeIndex]]
    questionDuration = 15
    playMode.classList.add("game2-bg")
  } else {
    const safeIndex = Math.max(0, Math.min(questionBank.game3.length - 1, questionIndex))
    questions = [questionBank.game3[safeIndex]]
    questionDuration = 60
    playMode.classList.add("game3-bg")
  }

  hideAllScreens()
  playMode.classList.remove("hidden")
  setGameIdVisibility(false)
  document.getElementById("score").innerText = score
  document.getElementById("streak").innerText = streak
  document.getElementById("hintCount").innerText = hintCount
  loadQuestion()
}

function startModule(moduleNumber, skipReadTimer = false, resetGameStats = false) {
  if (moduleNumber > unlockedGame) {
    lockedMessage(moduleNumber)
    return
  }

  currentModule = moduleNumber
  lessonIndex = 0
  activeLessons = modules[moduleNumber]
  activeGuideMessages = lessonGuideMessages[moduleNumber] || []
  lessonStartsGame = true
  skipLessonReadTimer = skipReadTimer || completedGames.has(moduleNumber)
  resetStatsOnNextGameStart = resetGameStats

  hideAllScreens()
  setLearnTopicClass("game")
  document.getElementById("learnMode").classList.remove("hidden")
  showLesson()
}

function startLearnTopic(topicKey) {
  const lessons = learnModules[topicKey]
  if (!lessons) return

  playMusic()
  activeLessons = lessons
  activeGuideMessages = learnGuideMessages[topicKey] || []
  lessonStartsGame = false
  lessonIndex = 0
  skipLessonReadTimer = false
  resetStatsOnNextGameStart = false

  hideAllScreens()
  setLearnTopicClass(topicKey)
  document.getElementById("learnMode").classList.remove("hidden")
  showLesson()
}

function setLearnTopicClass(topicKey) {
  const learnMode = document.getElementById("learnMode")
  if (!learnMode) return

  learnMode.classList.remove(...learnTopicClasses)
  learnMode.classList.add(`learn-topic-${topicKey}`)
}

function getActiveLessons() {
  return activeLessons || modules[currentModule] || []
}

function getLessonHeaderAndBody(lesson) {
  const fallbackTitle = lesson?.title || "Lesson"
  const content = lesson?.content || ""

  if (!/^slide\s+\d+$/i.test(fallbackTitle)) {
    return { title: fallbackTitle, body: content }
  }

  const wrapper = document.createElement("div")
  wrapper.innerHTML = content
  const heading = wrapper.querySelector("h2")
  const headingText = heading?.textContent?.replace(/\s+/g, " ").trim()

  if (!headingText) return { title: fallbackTitle, body: content }

  heading.remove()
  return {
    title: headingText,
    body: wrapper.innerHTML.trim()
  }
}

function showLesson() {
  const lessons = getActiveLessons()
  const lesson = lessons[lessonIndex]
  if (!lesson) return
  const renderedLesson = getLessonHeaderAndBody(lesson)

  document.getElementById("lessonTitle").innerText = renderedLesson.title
  document.getElementById("lessonPage").innerText = `${lessonIndex + 1}/${lessons.length}`
  document.getElementById("lessonContent").innerHTML = renderedLesson.body
  restoreLessonResponses()
  ensureLessonReadabilityStyles()
  updateLessonLayoutClass(lesson)
  updateLessonGuide()
  requestAnimationFrame(fitLessonToScroll)
  window.setTimeout(fitLessonToScroll, 120)

  startReadTimer()
}

function ensureLessonReadabilityStyles() {
  if (document.getElementById("lessonReadabilityStyles")) return

  const style = document.createElement("style")
  style.id = "lessonReadabilityStyles"
  style.textContent = `
#learnMode.lesson-balanced:not(.lesson-overflow-fit) #lessonContent {
  font-size: var(--lesson-dynamic-font-size, max(calc(23px * var(--fixed-scale)), 14px)) !important;
  line-height: 1.2 !important;
}

#learnMode.lesson-readable-column #lessonContent {
  left: calc(58px * var(--fixed-scale)) !important;
  right: calc(58px * var(--fixed-scale)) !important;
  padding-left: calc(24px * var(--fixed-scale)) !important;
  padding-right: calc(24px * var(--fixed-scale)) !important;
  padding-bottom: calc(44px * var(--fixed-scale)) !important;
  font-size: var(--lesson-dynamic-font-size, max(calc(24px * var(--fixed-scale)), 14px)) !important;
  line-height: 1.2 !important;
}

#learnMode.lesson-readable-column #lessonContent p {
  margin-bottom: calc(12px * var(--fixed-scale)) !important;
}

#learnMode.lesson-two-column-list #lessonContent {
  justify-content: center !important;
  padding-bottom: calc(48px * var(--fixed-scale)) !important;
  font-size: var(--lesson-dynamic-font-size, max(calc(24px * var(--fixed-scale)), 14px)) !important;
  line-height: 1.18 !important;
}

#learnMode.lesson-two-column-list .module1-plain-list,
#learnMode.lesson-two-column-list .lesson-list {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  column-gap: calc(62px * var(--fixed-scale)) !important;
  row-gap: calc(10px * var(--fixed-scale)) !important;
  width: 94% !important;
  margin: calc(10px * var(--fixed-scale)) auto calc(12px * var(--fixed-scale)) !important;
  padding-left: calc(24px * var(--fixed-scale)) !important;
}

#learnMode.lesson-two-column-list .module1-plain-list li,
#learnMode.lesson-two-column-list .lesson-list li {
  margin: 0 !important;
  font-size: 1em !important;
  line-height: 1.18 !important;
  break-inside: avoid !important;
}

#learnMode.lesson-compact-activity #lessonContent {
  justify-content: center !important;
  padding-bottom: calc(50px * var(--fixed-scale)) !important;
  font-size: var(--lesson-dynamic-font-size, max(calc(19px * var(--fixed-scale)), 12px)) !important;
  line-height: 1.12 !important;
}

#learnMode.lesson-compact-activity #lessonContent h2 {
  margin-bottom: calc(8px * var(--fixed-scale)) !important;
  font-size: max(calc(28px * var(--fixed-scale)), 16px) !important;
}

#learnMode.lesson-compact-activity .lesson-activity {
  gap: calc(9px * var(--fixed-scale)) !important;
  margin-top: calc(4px * var(--fixed-scale)) !important;
}

#learnMode.lesson-compact-activity .lesson-activity-directions {
  margin-bottom: calc(8px * var(--fixed-scale)) !important;
  font-size: max(calc(18px * var(--fixed-scale)), 11.5px) !important;
  line-height: 1.12 !important;
}

#learnMode.lesson-compact-activity .lesson-activity-items {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: calc(8px * var(--fixed-scale)) calc(14px * var(--fixed-scale)) !important;
}

#learnMode.lesson-compact-activity .lesson-activity-row {
  grid-template-columns: minmax(0, 1fr) calc(70px * var(--fixed-scale)) calc(74px * var(--fixed-scale)) !important;
  min-height: calc(40px * var(--fixed-scale)) !important;
  padding: calc(5px * var(--fixed-scale)) calc(6px * var(--fixed-scale)) !important;
  gap: calc(6px * var(--fixed-scale)) !important;
}

#learnMode.lesson-compact-activity .lesson-activity-prompt {
  font-size: max(calc(14.5px * var(--fixed-scale)), 10px) !important;
  line-height: 1.08 !important;
}

#learnMode.lesson-compact-activity .lesson-activity input {
  height: max(calc(27px * var(--fixed-scale)), 20px) !important;
  font-size: max(calc(14px * var(--fixed-scale)), 10px) !important;
}

#learnMode.lesson-compact-activity .lesson-activity-result {
  font-size: max(calc(12px * var(--fixed-scale)), 8.8px) !important;
}

#learnMode.lesson-compact-activity .lesson-check-btn {
  min-height: max(calc(32px * var(--fixed-scale)), 22px) !important;
  margin-top: calc(4px * var(--fixed-scale)) !important;
  font-size: max(calc(17px * var(--fixed-scale)), 11px) !important;
}

#learnMode.lesson-reflection-page:not(.learn-topic-game) #lessonContent {
  bottom: calc(116px * var(--fixed-scale)) !important;
  justify-content: flex-start !important;
  padding-top: calc(4px * var(--fixed-scale)) !important;
  padding-bottom: calc(18px * var(--fixed-scale)) !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  scrollbar-width: none !important;
  font-size: var(--lesson-dynamic-font-size, max(calc(20px * var(--fixed-scale)), 12px)) !important;
  line-height: 1.12 !important;
}

#learnMode.lesson-reflection-page #lessonContent::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}

#learnMode.lesson-reflection-page:not(.learn-topic-game) #lessonContent h2 {
  margin-bottom: calc(6px * var(--fixed-scale)) !important;
  font-size: max(calc(27px * var(--fixed-scale)), 15.5px) !important;
}

#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-stacked,
#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-many,
#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-reflection,
#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-poem,
#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-merged-activity {
  gap: calc(8px * var(--fixed-scale)) !important;
  margin-top: calc(4px * var(--fixed-scale)) !important;
  margin-bottom: calc(10px * var(--fixed-scale)) !important;
}

#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-item,
#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-stacked .lesson-answer-item {
  grid-template-columns: 1fr !important;
  gap: calc(4px * var(--fixed-scale)) !important;
  padding-top: calc(2px * var(--fixed-scale)) !important;
  padding-bottom: calc(2px * var(--fixed-scale)) !important;
}

#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-prompt {
  font-size: max(calc(16px * var(--fixed-scale)), 10.5px) !important;
  line-height: 1.08 !important;
}

#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-response-field-long,
#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-stacked .lesson-response-field-long,
#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-many .lesson-response-field-long,
#learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-reflection .lesson-response-field-long {
  height: max(calc(70px * var(--fixed-scale)), 42px) !important;
  min-height: max(calc(70px * var(--fixed-scale)), 42px) !important;
  font-size: max(calc(15.5px * var(--fixed-scale)), 11px) !important;
  line-height: 1.15 !important;
}

#learnMode.learn-topic-module1.lesson-slide-17.lesson-reflection-page .lesson-response-field-long,
#learnMode.learn-topic-module2.lesson-slide-25.lesson-reflection-page .lesson-response-field-long {
  height: max(calc(44px * var(--fixed-scale)), 30px) !important;
  min-height: max(calc(44px * var(--fixed-scale)), 30px) !important;
}

#learnMode.lesson-rubric-page:not(.lesson-overflow-extra) #lessonContent {
  justify-content: center !important;
  padding-top: calc(4px * var(--fixed-scale)) !important;
  padding-bottom: calc(48px * var(--fixed-scale)) !important;
  overflow: hidden !important;
  font-size: var(--lesson-dynamic-font-size, max(calc(18.5px * var(--fixed-scale)), 11px)) !important;
  line-height: 1.08 !important;
}

#learnMode.lesson-rubric-page:not(.lesson-overflow-extra) #lessonContent h2 {
  margin-bottom: calc(8px * var(--fixed-scale)) !important;
  font-size: max(calc(27px * var(--fixed-scale)), 16px) !important;
}

#learnMode.lesson-rubric-page:not(.lesson-overflow-extra) .module3-rubric-table {
  width: 96% !important;
  margin: calc(8px * var(--fixed-scale)) auto calc(12px * var(--fixed-scale)) !important;
  font-size: max(calc(13px * var(--fixed-scale)), 9.6px) !important;
  line-height: 1.07 !important;
}

#learnMode.lesson-rubric-page:not(.lesson-overflow-extra) .rubric-row > span,
#learnMode.lesson-rubric-page:not(.lesson-overflow-extra) .rubric-row > strong {
  padding: calc(4px * var(--fixed-scale)) calc(5px * var(--fixed-scale)) !important;
  line-height: 1.07 !important;
}

#learnMode.lesson-rubric-page:not(.lesson-overflow-extra) #lessonContent p {
  width: 96% !important;
  margin: calc(10px * var(--fixed-scale)) auto 0 !important;
  font-size: max(calc(24px * var(--fixed-scale)), 13px) !important;
  line-height: 1.1 !important;
}

@media (orientation: landscape) and (max-height: 560px) {
  #learnMode.lesson-readable-column #lessonContent,
  #learnMode.lesson-two-column-list #lessonContent {
    padding-bottom: calc(24px * var(--fixed-scale)) !important;
    font-size: var(--lesson-dynamic-font-size, max(calc(23px * var(--fixed-scale)), 13.5px)) !important;
  }

  #learnMode.lesson-compact-activity #lessonContent {
    padding-bottom: calc(28px * var(--fixed-scale)) !important;
    font-size: var(--lesson-dynamic-font-size, max(calc(19px * var(--fixed-scale)), 12px)) !important;
  }

  #learnMode.lesson-compact-activity .lesson-activity-row {
    min-height: calc(32px * var(--fixed-scale)) !important;
    padding-top: calc(3px * var(--fixed-scale)) !important;
    padding-bottom: calc(3px * var(--fixed-scale)) !important;
  }

  #learnMode.lesson-reflection-page:not(.learn-topic-game) #lessonContent {
    bottom: calc(104px * var(--fixed-scale)) !important;
    padding-bottom: calc(14px * var(--fixed-scale)) !important;
  }

  #learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-response-field-long,
  #learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-stacked .lesson-response-field-long,
  #learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-many .lesson-response-field-long,
  #learnMode.lesson-reflection-page:not(.learn-topic-game) .lesson-answer-list-reflection .lesson-response-field-long {
    height: max(calc(56px * var(--fixed-scale)), 34px) !important;
    min-height: max(calc(56px * var(--fixed-scale)), 34px) !important;
  }

  #learnMode.learn-topic-module1.lesson-slide-17.lesson-reflection-page .lesson-response-field-long,
  #learnMode.learn-topic-module2.lesson-slide-25.lesson-reflection-page .lesson-response-field-long {
    height: max(calc(36px * var(--fixed-scale)), 25px) !important;
    min-height: max(calc(36px * var(--fixed-scale)), 25px) !important;
  }

  #learnMode.lesson-rubric-page:not(.lesson-overflow-extra) #lessonContent {
    padding-bottom: calc(26px * var(--fixed-scale)) !important;
    font-size: var(--lesson-dynamic-font-size, max(calc(16.5px * var(--fixed-scale)), 10px)) !important;
  }

  #learnMode.lesson-rubric-page:not(.lesson-overflow-extra) .module3-rubric-table {
    font-size: max(calc(11.8px * var(--fixed-scale)), 8.8px) !important;
  }
}
`
  style.textContent += `
/* Final high-specificity Learn readability pass. */
#learnMode#learnMode.lesson-readable-column #lessonContent,
#learnMode#learnMode.lesson-two-column-list #lessonContent {
  font-size: max(calc(24px * var(--fixed-scale)), 14px) !important;
  line-height: 1.2 !important;
}

#learnMode#learnMode.lesson-two-column-list .module1-plain-list,
#learnMode#learnMode.lesson-two-column-list .lesson-list {
  row-gap: calc(12px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-two-column-list .module1-plain-list li,
#learnMode#learnMode.lesson-two-column-list .lesson-list li,
#learnMode#learnMode.lesson-readable-column .module1-plain-list li,
#learnMode#learnMode.lesson-readable-column .lesson-list li {
  font-size: max(calc(21px * var(--fixed-scale)), 12.5px) !important;
  line-height: 1.18 !important;
}

#learnMode#learnMode.lesson-compact-activity #lessonContent {
  justify-content: center !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  scrollbar-width: none !important;
  font-size: max(calc(20px * var(--fixed-scale)), 12.5px) !important;
  line-height: 1.12 !important;
}

#learnMode#learnMode.lesson-compact-activity #lessonContent::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-directions {
  font-size: max(calc(18.5px * var(--fixed-scale)), 12px) !important;
  line-height: 1.12 !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-row {
  min-height: max(calc(38px * var(--fixed-scale)), 27px) !important;
  padding: calc(4px * var(--fixed-scale)) calc(5px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-prompt {
  font-size: max(calc(16px * var(--fixed-scale)), 10.5px) !important;
  line-height: 1.08 !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity input {
  height: max(calc(27px * var(--fixed-scale)), 20px) !important;
  font-size: max(calc(14px * var(--fixed-scale)), 10.5px) !important;
}

#learnMode#learnMode.lesson-reflection-page #lessonContent {
  overflow-y: auto !important;
  font-size: max(calc(20.5px * var(--fixed-scale)), 12.2px) !important;
}

#learnMode#learnMode.lesson-reflection-page .lesson-answer-prompt {
  font-size: max(calc(16.5px * var(--fixed-scale)), 11px) !important;
  line-height: 1.08 !important;
}

#learnMode#learnMode.lesson-reflection-page .lesson-response-field-long {
  height: max(calc(64px * var(--fixed-scale)), 38px) !important;
  min-height: max(calc(64px * var(--fixed-scale)), 38px) !important;
  font-size: max(calc(15.5px * var(--fixed-scale)), 11px) !important;
}

#learnMode#learnMode.learn-topic-module1.lesson-slide-17.lesson-reflection-page .lesson-response-field-long,
#learnMode#learnMode.learn-topic-module2.lesson-slide-25.lesson-reflection-page .lesson-response-field-long {
  height: max(calc(42px * var(--fixed-scale)), 31px) !important;
  min-height: max(calc(42px * var(--fixed-scale)), 31px) !important;
}

#learnMode#learnMode.lesson-rubric-page #lessonContent {
  justify-content: center !important;
  font-size: max(calc(19px * var(--fixed-scale)), 12px) !important;
  line-height: 1.08 !important;
}

#learnMode#learnMode.lesson-rubric-page .module3-rubric-table {
  width: 96% !important;
  font-size: max(calc(13px * var(--fixed-scale)), 9.8px) !important;
  line-height: 1.07 !important;
}

#learnMode#learnMode.lesson-rubric-page .rubric-row > span,
#learnMode#learnMode.lesson-rubric-page .rubric-row > strong {
  padding: calc(4px * var(--fixed-scale)) calc(5px * var(--fixed-scale)) !important;
  line-height: 1.07 !important;
}
`
  style.textContent += `
/* Final content-window clearance pass. */
#learnMode#learnMode.lesson-reflection-page #lessonContent {
  bottom: calc(94px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-rubric-page #lessonContent {
  bottom: calc(72px * var(--fixed-scale)) !important;
  padding-bottom: calc(30px * var(--fixed-scale)) !important;
}
`
  style.textContent += `
/* Final activity width and height pass. */
#learnMode#learnMode.lesson-compact-activity #lessonContent {
  bottom: calc(52px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-row {
  grid-template-columns: minmax(0, 1fr) max(calc(70px * var(--fixed-scale)), 54px) !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-prompt {
  font-size: max(calc(17px * var(--fixed-scale)), 11px) !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-result {
  display: none !important;
  grid-column: 1 / -1 !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-result.is-correct,
#learnMode#learnMode.lesson-compact-activity .lesson-activity-result.is-wrong {
  display: block !important;
}
`
  style.textContent += `
/* Final one-pile activities and parchment fill pass. */
#learnMode#learnMode.lesson-compact-activity #lessonContent {
  bottom: calc(50px * var(--fixed-scale)) !important;
  justify-content: center !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-items {
  grid-template-columns: 1fr !important;
  width: min(100%, calc(660px * var(--fixed-scale))) !important;
  margin-left: auto !important;
  margin-right: auto !important;
  gap: calc(8px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-compact-activity .lesson-activity-row {
  grid-template-columns: minmax(0, 1fr) max(calc(76px * var(--fixed-scale)), 56px) !important;
}

#learnMode#learnMode.lesson-short-activity .lesson-activity-items {
  gap: calc(10px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-short-activity .lesson-activity-row {
  min-height: max(calc(52px * var(--fixed-scale)), 36px) !important;
  padding: calc(6px * var(--fixed-scale)) calc(8px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-short-activity .lesson-activity-prompt {
  font-size: max(calc(18.5px * var(--fixed-scale)), 12.5px) !important;
  line-height: 1.1 !important;
}

#learnMode#learnMode.lesson-long-activity #lessonContent {
  justify-content: flex-start !important;
  overflow-y: auto !important;
}

#learnMode#learnMode.lesson-long-activity .lesson-activity-items {
  width: 100% !important;
  gap: calc(6px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-long-activity .lesson-activity-row {
  min-height: max(calc(38px * var(--fixed-scale)), 28px) !important;
  padding: calc(4px * var(--fixed-scale)) calc(6px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-long-activity .lesson-activity-prompt {
  font-size: max(calc(15.5px * var(--fixed-scale)), 10.5px) !important;
  line-height: 1.08 !important;
}

#learnMode#learnMode.lesson-readable-column #lessonContent {
  bottom: calc(76px * var(--fixed-scale)) !important;
  justify-content: center !important;
  padding-bottom: calc(48px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-readable-column #lessonContent p,
#learnMode#learnMode.lesson-readable-column .lesson-notice,
#learnMode#learnMode.learn-topic-module1.lesson-slide-20 #lessonContent p {
  text-align: left !important;
  text-align-last: left !important;
}

#learnMode#learnMode.lesson-readable-column #lessonContent p,
#learnMode#learnMode.lesson-readable-column .lesson-notice {
  margin-bottom: calc(13px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.learn-topic-module1.lesson-slide-20 #lessonContent {
  bottom: calc(76px * var(--fixed-scale)) !important;
  justify-content: center !important;
  gap: calc(11px * var(--fixed-scale)) !important;
  padding-bottom: calc(48px * var(--fixed-scale)) !important;
  font-size: max(calc(23.5px * var(--fixed-scale)), 14px) !important;
  line-height: 1.18 !important;
}

#learnMode#learnMode.learn-topic-module1.lesson-slide-20 .module1-row-list {
  gap: calc(13px * var(--fixed-scale)) !important;
  margin-top: calc(10px * var(--fixed-scale)) !important;
  margin-bottom: calc(12px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.learn-topic-module1.lesson-slide-20 .module1-row {
  align-items: center !important;
  min-height: max(calc(72px * var(--fixed-scale)), 48px) !important;
  padding-top: calc(8px * var(--fixed-scale)) !important;
  padding-bottom: calc(8px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.learn-topic-module1.lesson-slide-20 .module1-row strong {
  font-size: max(calc(21px * var(--fixed-scale)), 13px) !important;
  line-height: 1.08 !important;
}

#learnMode#learnMode.learn-topic-module1.lesson-slide-20 .module1-row span {
  font-size: max(calc(21px * var(--fixed-scale)), 13px) !important;
  line-height: 1.08 !important;
  text-align: left !important;
  text-align-last: left !important;
}
`
  style.textContent += `
/* Final short-page fill pass. */
#learnMode#learnMode.lesson-tiny-activity .lesson-activity {
  gap: calc(12px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-tiny-activity .lesson-activity-items {
  gap: calc(14px * var(--fixed-scale)) !important;
  width: min(100%, calc(675px * var(--fixed-scale))) !important;
}

#learnMode#learnMode.lesson-tiny-activity .lesson-activity-row {
  min-height: max(calc(92px * var(--fixed-scale)), 58px) !important;
  padding: calc(8px * var(--fixed-scale)) calc(10px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.lesson-tiny-activity .lesson-activity-prompt {
  font-size: max(calc(20px * var(--fixed-scale)), 13px) !important;
  line-height: 1.12 !important;
}

#learnMode#learnMode.learn-topic-module2.lesson-slide-5 #lessonContent,
#learnMode#learnMode.learn-topic-module3.lesson-slide-8 #lessonContent {
  font-size: max(calc(27px * var(--fixed-scale)), 16px) !important;
  line-height: 1.2 !important;
}

#learnMode#learnMode.learn-topic-module2.lesson-slide-5 #lessonContent p,
#learnMode#learnMode.learn-topic-module3.lesson-slide-8 #lessonContent p {
  margin-bottom: calc(16px * var(--fixed-scale)) !important;
}

#learnMode#learnMode.learn-topic-module3.lesson-slide-8 .lesson-example {
  margin-top: calc(12px * var(--fixed-scale)) !important;
  margin-bottom: calc(14px * var(--fixed-scale)) !important;
  line-height: 1.14 !important;
}
`
  style.textContent += `
/* Final long-activity clean-scroll pass. */
#learnMode#learnMode.lesson-long-activity #lessonContent {
  bottom: calc(58px * var(--fixed-scale)) !important;
  padding-bottom: calc(14px * var(--fixed-scale)) !important;
}
`
  document.head.appendChild(style)
}
function resetLessonFit(learnMode, content) {
  learnMode.style.removeProperty("--lesson-dynamic-font-size")
  learnMode.style.removeProperty("--lesson-dynamic-gap")
  learnMode.style.removeProperty("--lesson-dynamic-top-offset")
  content.querySelectorAll(".lesson-response-field-long").forEach(field => {
    field.style.removeProperty("height")
  })
}

function updateLessonLayoutClass(lesson) {
  const learnMode = document.getElementById("learnMode")
  if (!learnMode || !lesson) return

  const content = lesson.content || ""
  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const listCount = (content.match(/<li\b/g) || []).length
  const blockCount = (content.match(/<(p|li|div|h2)\b/g) || []).length
  const hasResponse = /lesson-answer-list|lesson-activity|lesson-response-field|lesson-inline-answer|lessonInlineAnswer/.test(content)
  const hasActivity = /lesson-activity/.test(content)
  const activityItemCount = (content.match(/lesson-activity-row/g) || []).length
  const hasReflectionFields = /lesson-answer-list-many|lesson-answer-list-reflection|lesson-answer-list-poem|lesson-answer-list-merged-activity/.test(content)
  const hasLargeTable = /module3-rubric-table/.test(content)
  const hasPlainList = /module1-plain-list|lesson-list/.test(content)
  const hasStructuredLayout = /module1-row-list|module1-compare-grid|module3-rubric-table|lesson-mini-grid|lesson-two-kinds|lesson-options|lesson-activity/.test(content)
  const isBulleted = listCount > 0
  const isLong = hasLargeTable || plainText.length > 820 || blockCount >= 22 || (hasResponse && plainText.length > 1050)
  const isDense = hasResponse || plainText.length > 430 || listCount >= 6 || blockCount >= 9 || hasLargeTable
  const isShort = !hasResponse && plainText.length < 420 && blockCount <= 5
  const isBalanced = !hasResponse && !hasLargeTable && plainText.length < 900 && blockCount <= 13
  const isFormBalanced = hasResponse && !hasLargeTable && plainText.length < 1100 && blockCount <= 28
  const usesTwoColumnList = !hasResponse && hasPlainList && listCount >= 6 && plainText.length < 900
  const usesReadableColumn = isBalanced && !hasStructuredLayout

  learnMode.classList.toggle("lesson-long", isLong)
  learnMode.classList.toggle("lesson-dense", isDense)
  learnMode.classList.toggle("lesson-bulleted", isBulleted)
  learnMode.classList.toggle("lesson-short", !isLong && isShort)
  learnMode.classList.toggle("lesson-balanced", !isLong && isBalanced)
  learnMode.classList.toggle("lesson-form-balanced", !isLong && isFormBalanced)
  learnMode.classList.toggle("lesson-readable-column", !isLong && usesReadableColumn)
  learnMode.classList.toggle("lesson-structured", hasStructuredLayout)
  learnMode.classList.toggle("lesson-two-column-list", !isLong && usesTwoColumnList)
  learnMode.classList.toggle("lesson-compact-activity", !isLong && hasActivity)
  learnMode.classList.toggle("lesson-short-activity", !isLong && hasActivity && activityItemCount <= 5)
  learnMode.classList.toggle("lesson-tiny-activity", !isLong && hasActivity && activityItemCount <= 3)
  learnMode.classList.toggle("lesson-long-activity", !isLong && hasActivity && activityItemCount > 5)
  learnMode.classList.toggle("lesson-reflection-page", !isLong && hasReflectionFields)
  learnMode.classList.toggle("lesson-rubric-page", hasLargeTable)
  learnMode.classList.remove("lesson-overflow-fit", "lesson-overflow-extra")
  ;[...learnMode.classList]
    .filter(className => className.startsWith("lesson-slide-"))
    .forEach(className => learnMode.classList.remove(className))
  learnMode.classList.add(`lesson-slide-${lessonIndex + 1}`)
}

function getLessonContentMetrics(content) {
  const contentRect = content.getBoundingClientRect()
  const visibleChildren = [...content.children].filter(child => {
    const style = window.getComputedStyle(child)
    return style.display !== "none" && style.visibility !== "hidden"
  })

  if (!visibleChildren.length) {
    return {
      available: content.clientHeight,
      used: Math.min(content.scrollHeight, content.clientHeight),
      overflowing: false
    }
  }

  const childRects = visibleChildren.map(child => child.getBoundingClientRect())
  const top = Math.min(...childRects.map(rect => rect.top))
  const bottom = Math.max(...childRects.map(rect => rect.bottom))
  const used = Math.max(0, bottom - top)
  const overflowing = content.scrollHeight > content.clientHeight + 2 ||
    top < contentRect.top - 2 ||
    bottom > contentRect.bottom + 2

  return {
    available: contentRect.height,
    used,
    overflowing
  }
}

function fitLessonToScroll(attempt = 0) {
  const learnMode = document.getElementById("learnMode")
  const content = document.getElementById("lessonContent")
  if (!learnMode || !content || learnMode.classList.contains("hidden")) return

  if (attempt === 0) {
    resetLessonFit(learnMode, content)
    learnMode.classList.remove("lesson-overflow-fit", "lesson-overflow-extra")
  }

  const metrics = getLessonContentMetrics(content)
  const hasOverflow = metrics.overflowing
  learnMode.classList.toggle("lesson-overflow-fit", hasOverflow)

  if (hasOverflow) {
    if (attempt > 0) {
      resetLessonFit(learnMode, content)
      learnMode.classList.add("lesson-overflow-fit")
    }

    requestAnimationFrame(() => {
      const stillOverflowing = getLessonContentMetrics(content).overflowing
      learnMode.classList.toggle("lesson-overflow-extra", stillOverflowing)
    })
    return
  }

  learnMode.classList.remove("lesson-overflow-extra")

  if (attempt >= 2) return

  const unused = metrics.available - metrics.used
  if (unused < Math.max(36, metrics.available * 0.11)) return

  const computed = window.getComputedStyle(content)
  const currentFontSize = parseFloat(computed.fontSize) || 18
  const isLong = learnMode.classList.contains("lesson-long")
  const isDense = learnMode.classList.contains("lesson-dense")
  const isBalanced = learnMode.classList.contains("lesson-balanced")
  const isFormBalanced = learnMode.classList.contains("lesson-form-balanced")
  const isReflectionPage = learnMode.classList.contains("lesson-reflection-page")
  const isRubricPage = learnMode.classList.contains("lesson-rubric-page")
  const maxIncrease = isRubricPage ? 1.8 : isLong ? 1.2 : isReflectionPage ? 2.2 : isDense ? 3.2 : 5
  const maxScale = isRubricPage ? 1.08 : isLong ? 1.04 : isReflectionPage ? 1.08 : isDense ? 1.12 : 1.18
  const targetFill = content.querySelector(".lesson-answer-list, .lesson-activity")
    ? isReflectionPage ? 0.88 : 0.84
    : isRubricPage
      ? 0.76
    : isBalanced
      ? 0.82
      : 0.86
  const desiredScale = Math.sqrt((metrics.available * targetFill) / Math.max(metrics.used, 1))
  const scale = Math.min(maxScale, desiredScale)

  if (attempt === 0 && scale > 1.015) {
    const nextFontSize = Math.min(currentFontSize * scale, currentFontSize + maxIncrease)
    learnMode.style.setProperty("--lesson-dynamic-font-size", `${nextFontSize.toFixed(2)}px`)
    requestAnimationFrame(() => fitLessonToScroll(attempt + 1))
    return
  }

  const longFields = [...content.querySelectorAll(".lesson-response-field-long")]
  const visibleChildren = [...content.children].filter(child => {
    const style = window.getComputedStyle(child)
    return style.display !== "none" && style.visibility !== "hidden"
  })

  let adjustedSpacing = false

  if (unused > 44) {
    const topOffset = isBalanced || isFormBalanced
      ? 0
      : Math.min(isRubricPage ? 6 : isLong ? 8 : isDense ? 14 : 28, Math.max(0, unused * 0.1))
    const gapCap = isRubricPage ? 12 : isLong ? 8 : isReflectionPage ? 14 : isFormBalanced ? 22 : isBalanced ? 34 : isDense ? 14 : 18
    const gapFactor = isRubricPage ? 0.1 : isBalanced ? 0.14 : isFormBalanced ? 0.1 : 0.06
    const gap = visibleChildren.length > 1
      ? Math.min(gapCap, Math.max(0, unused * gapFactor))
      : 0

    learnMode.style.setProperty("--lesson-dynamic-top-offset", `${topOffset.toFixed(1)}px`)
    learnMode.style.setProperty("--lesson-dynamic-gap", `${gap.toFixed(1)}px`)
    adjustedSpacing = true
  }

  if (longFields.length && unused > 28) {
    const growBy = Math.min(isReflectionPage ? 90 : isFormBalanced ? 68 : 40, Math.max(10, (unused * (isReflectionPage ? 0.72 : 0.56)) / longFields.length))
    longFields.forEach(field => {
      const height = parseFloat(window.getComputedStyle(field).height) || field.clientHeight
      field.style.setProperty("height", `${height + growBy}px`, "important")
    })
    requestAnimationFrame(() => fitLessonToScroll(attempt + 1))
  } else if (adjustedSpacing) {
    requestAnimationFrame(() => fitLessonToScroll(attempt + 1))
  } else {
    learnMode.classList.remove("lesson-overflow-extra")
  }
}

function findLessonResponseWrapper(responseId) {
  return [...document.querySelectorAll("[data-lesson-response]")]
    .find(wrapper => wrapper.dataset.lessonResponse === responseId) || null
}

function restoreLessonResponses() {
  document.querySelectorAll(".lesson-response-field").forEach(field => {
    const wrapper = field.closest("[data-lesson-response]")
    const responseId = wrapper?.dataset.lessonResponse || field.id
    field.value = learnResponses[responseId]?.answer || ""
  })

  document.querySelectorAll("[data-activity-response-id]").forEach(field => {
    const responseId = field.dataset.activityResponseId
    field.value = learnResponses[responseId]?.answer || ""
  })
}

function saveLessonResponse(responseId, value) {
  const wrapper = findLessonResponseWrapper(responseId)
  const answer = sanitizeAnswerText(value, MAX_LEARN_RESPONSE_LENGTH)

  if (answer) {
    learnResponses[responseId] = {
      id: responseId,
      title: sanitizeAnswerText(wrapper?.dataset.responseTitle, 80, "Learning Response"),
      prompt: sanitizeAnswerText(wrapper?.dataset.responsePrompt, 160, "Student response"),
      answer,
      updatedAt: Date.now()
    }
  } else {
    delete learnResponses[responseId]
  }

  clearTimeout(learnResponseSaveTimer)
  learnResponseSaveTimer = setTimeout(() => {
    if (playerName) {
      savePlayerProfile()
    } else {
      syncMultiplayerScore("learn-answer")
    }
  }, 350)
}

function saveLessonActivityResponse(activityId, itemNumber, input) {
  const responseId = input?.dataset.activityResponseId || `${activityId}-activity-${itemNumber}`
  const answer = sanitizeAnswerText(input?.value, MAX_LEARN_RESPONSE_LENGTH)

  if (answer) {
    learnResponses[responseId] = {
      id: responseId,
      title: sanitizeAnswerText(input?.dataset.activityTitle, 80, "Learning Activity"),
      prompt: sanitizeAnswerText(input?.dataset.activityPrompt, 160, `Activity item ${itemNumber}`),
      answer,
      updatedAt: Date.now()
    }
  } else {
    delete learnResponses[responseId]
  }

  clearTimeout(learnResponseSaveTimer)
  learnResponseSaveTimer = setTimeout(() => {
    if (playerName) {
      savePlayerProfile()
    } else {
      syncMultiplayerScore("learn-activity-answer")
    }
  }, 350)
}

function normalizeLessonActivityValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
}

function checkLessonActivity(activityId) {
  const activity = document.querySelector(`[data-activity-id="${activityId}"]`)
  if (!activity) return

  activity.querySelectorAll("[data-activity-answer]").forEach(input => {
    const expected = normalizeLessonActivityValue(input.dataset.activityAnswer)
    const accepted = (input.dataset.activityAccept || "")
      .split("|")
      .map(normalizeLessonActivityValue)
      .filter(Boolean)
    const value = normalizeLessonActivityValue(input.value)
    const row = input.closest(".lesson-activity-row")
    const result = row?.querySelector(".lesson-activity-result")
    const isCorrect = value && [expected, ...accepted].includes(value)

    row?.classList.toggle("is-correct", Boolean(isCorrect))
    row?.classList.toggle("is-wrong", Boolean(value && !isCorrect))

    if (!result) return

    if (!value) {
      result.innerText = "Type an answer"
      result.className = "lesson-activity-result is-wrong"
      return
    }

    result.innerText = isCorrect ? "Correct" : `Correct: ${expected}`
    result.className = `lesson-activity-result ${isCorrect ? "is-correct" : "is-wrong"}`
  })

  requestAnimationFrame(fitLessonToScroll)
}

function updateLessonGuide() {
  const guide = document.getElementById("lessonGuide")
  const bubble = document.getElementById("lessonGuideBubble")
  const lessons = getActiveLessons()
  const messages = activeGuideMessages || lessonGuideMessages[currentModule] || []

  if (guide) {
    const isHappy = lessonIndex === lessons.length - 1
    guide.src = isHappy
      ? "assets/images/guide-happy.png"
      : "assets/images/guide-default.png"
    guide.classList.toggle("guide-happy-facing", isHappy)
  }

  if (bubble) {
    bubble.innerText = messages[lessonIndex] || "Read this tutorial, then I will guide you in the game."
  }
}

function startReadTimer() {
  clearInterval(lessonTimerInterval)
  document.getElementById("readTimer").innerText = ""
  document.getElementById("nextLessonBtn").disabled = false
}

function nextLesson() {
  lessonIndex++

  const lessons = getActiveLessons()
  if (lessonIndex >= lessons.length) {
    skipLessonReadTimer = false
    if (lessonStartsGame) {
      startGame(currentModule, resetStatsOnNextGameStart)
    } else {
      activeLessons = null
      activeGuideMessages = null
      showLearnBlank()
    }
    resetStatsOnNextGameStart = false
    return
  }

  showLesson()
}

function backLesson() {
  if (lessonIndex > 0) {
    lessonIndex--
    showLesson()
  } else {
    skipLessonReadTimer = false
    if (lessonStartsGame) {
      activeLessons = null
      activeGuideMessages = null
      showModuleMap()
    } else {
      activeLessons = null
      activeGuideMessages = null
      showLearnBlank()
    }
  }
}

function resetCarryStats() {
  carryScore = 0
  carryStreak = 0
  carryHintCount = 0
}

function getGameStartKey(gameNumber, sentenceLevel = currentSentenceLevel) {
  return gameNumber === 1 ? `1-${sentenceLevel}` : `${gameNumber}`
}

function getGameStartRecord(gameNumber, resetCarriedStats = false) {
  const startKey = getGameStartKey(gameNumber)

  if (resetCarriedStats) {
    gameStartRecords[startKey] = { score: 0, streak: 0, hintCount: 0 }
  }

  if (!gameStartRecords[startKey]) {
    gameStartRecords[startKey] = {
      score: carryScore,
      streak: carryStreak,
      hintCount: carryHintCount
    }
  }

  return gameStartRecords[startKey]
}

function getSentenceSleuthLevel(levelNumber = currentSentenceLevel) {
  return sentenceSleuthLevels.find(level => level.level === levelNumber) || sentenceSleuthLevels[0]
}

function getQuestionLimitForGame(gameNumber = currentGame) {
  return gameNumber === 1 ? GAME_1_QUESTIONS_PER_LEVEL : QUESTIONS_PER_RUN
}

function getPassingAnswersForGame(gameNumber = currentGame, totalQuestions = getQuestionLimitForGame(gameNumber)) {
  return gameNumber === 1 ? Math.ceil(totalQuestions * GAME_1_PASSING_RATE) : PASSING_ANSWERS
}

function getCurrentRunTitle() {
  if (currentGame === 1) return `${gameTitles[1]} Level ${currentSentenceLevel}`
  return gameTitles[currentGame] || `Game ${currentGame}`
}

function getQuestionLogPrompt(question) {
  if (!question) return "Question"

  if (currentGame === 3) {
    return `Rewrite using ${question.figureLabel || question.figure}: ${question.literal}`
  }

  if (question.text) {
    return `${question.text} ${question.question || ""}`
  }

  return [question.sentence, question.question].filter(Boolean).join(" ")
}

function resetCurrentRunAnswers() {
  currentRunAnswers = []
}

function discardCurrentRunAnswers() {
  currentRunAnswers = []
}

function recordCurrentRunAnswer(question, playerAnswer, correctAnswer, isCorrect) {
  currentRunAnswers.push({
    number: currentQuestion + 1,
    question: getQuestionLogPrompt(question),
    playerAnswer: String(playerAnswer || "").trim() || "No answer",
    correctAnswer: String(correctAnswer || "").trim() || "N/A",
    isCorrect: Boolean(isCorrect)
  })
}

function commitCurrentRunAnswers() {
  if (!currentRunAnswers.length) return

  const run = {
    id: `answers-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: getCurrentRunTitle(),
    game: currentGame,
    level: currentGame === 1 ? currentSentenceLevel : null,
    completedAt: Date.now(),
    score,
    correctAnswers,
    totalQuestions: questions.length,
    answers: currentRunAnswers
  }

  savedAnswerRuns = sanitizeSavedAnswerRuns([run, ...savedAnswerRuns])
  currentRunAnswers = []
}

function startGame(gameNumber, resetCarriedStats = false, sentenceLevel = 1) {
  if (resetCarriedStats) resetCarryStats()
  if (gameNumber === 1) currentSentenceLevel = sentenceLevel
  const startRecord = getGameStartRecord(gameNumber, resetCarriedStats)

  currentGame = gameNumber
  currentQuestion = 0
  score = startRecord.score
  correctAnswers = 0
  streak = startRecord.streak
  hintCount = startRecord.hintCount
  rewardTracker = 0
  alreadyAnswered = false
  resetCurrentRunAnswers()

  const playMode = document.getElementById("playMode")
  playMode.classList.remove("game1-bg", "game2-bg", "game3-bg", "practice-replay")
  playMode.classList.remove("reading-text-mode")
  activeGame2Text = null

  if (completedGames.has(gameNumber)) {
    playMode.classList.add("practice-replay")
  }

  if (currentGame === 1) {
    const activeSentenceLevel = getSentenceSleuthLevel()
    questions = shuffle(activeSentenceLevel.questions).slice(0, getQuestionLimitForGame(1))
    questionDuration = 15
    playMode.classList.add("game1-bg")
  } else if (currentGame === 2) {
    activeGame2Text = shuffle(game2LiteraryTexts)[0]
    questions = shuffle(activeGame2Text.questions).slice(0, QUESTIONS_PER_RUN)
    questionDuration = 15
    playMode.classList.add("game2-bg")
  } else {
    questions = shuffle(questionBank.game3).slice(0, QUESTIONS_PER_RUN)
    questionDuration = 60
    playMode.classList.add("game3-bg")
  }

  updateStats()
  captureBadgeRunStart()

  hideAllScreens()
  playMode.classList.remove("hidden")
  setGameIdVisibility(true)
  syncMultiplayerScore("screen")

  if (currentGame === 2) {
    showGame2ReadingPage()
  } else {
    loadQuestion()
  }
}

function setGuideState(image, message) {
  const guide = document.getElementById("gameGuide")
  const bubble = document.getElementById("guideBubble")

  if (guide && image) {
    guide.src = image
    guide.classList.toggle("guide-happy-facing", image.includes("guide-happy"))
  }
  if (bubble && message) bubble.innerText = message
}

function setFeedback(type = "", word = "", detail = "", showNext = false) {
  const feedback = document.getElementById("feedback")
  if (!feedback) return

  feedback.className = showNext ? `${type} feedback-has-next` : type
  feedback.innerHTML = ""

  if (!word) return

  const wordEl = document.createElement("strong")
  wordEl.className = "feedback-word"
  wordEl.innerText = word
  feedback.appendChild(wordEl)

  if (detail) {
    const detailEl = document.createElement("span")
    detailEl.className = "feedback-detail"
    detailEl.innerText = detail
    feedback.appendChild(detailEl)
  }

  if (showNext) {
    const nextButton = document.createElement("button")
    nextButton.type = "button"
    nextButton.className = "image-btn next-image-btn feedback-next-btn"
    nextButton.setAttribute("aria-label", "Next question")
    nextButton.title = "Next"
    nextButton.addEventListener("click", () => {
      sparkButton(nextButton)
      nextButton.disabled = true
      nextQuestion()
    })
    feedback.appendChild(nextButton)
  }
}

function getGuidePrompt(question) {
  if (currentGame === 1) {
    return `${getSentenceSleuthLevel().name}: Read the sentence on the board. Choose the figure of speech it shows.`
  }

  if (currentGame === 2) {
    return "Read the text carefully. I will help you spot the figure of speech or sound device."
  }

  return `Create your own ${question.figureLabel || question.figure}. Type an answer that follows the clue.`
}

function formatLiteraryText(text) {
  return escapeHtml(text)
    .split(/\n+/)
    .map(line => `<span>${line}</span>`)
    .join("")
}

function fitLiteraryReadingToCard() {
  const card = document.querySelector("#playMode.game2-bg.reading-text-mode .question-card")
  const reading = document.querySelector("#playMode.game2-bg.reading-text-mode .literary-reading")
  const poem = reading?.querySelector("p")
  const title = reading?.querySelector("strong")
  const author = reading?.querySelector("em")
  if (!card || !reading || !poem) return

  reading.style.removeProperty("gap")
  poem.style.removeProperty("font-size")
  poem.style.removeProperty("line-height")
  if (title) {
    title.style.removeProperty("font-size")
  }
  if (author) {
    author.style.removeProperty("font-size")
  }

  let poemSize = parseFloat(window.getComputedStyle(poem).fontSize) || 17
  let titleSize = title ? parseFloat(window.getComputedStyle(title).fontSize) || 22 : 22
  let authorSize = author ? parseFloat(window.getComputedStyle(author).fontSize) || 13 : 13
  let gapSize = parseFloat(window.getComputedStyle(reading).gap) || 3
  const minPoemSize = Math.max(7, poemSize * 0.46)

  for (let step = 0; step < 36 && poemSize > minPoemSize; step++) {
    if (reading.scrollHeight <= card.clientHeight && reading.scrollWidth <= card.clientWidth) break
    poemSize -= 0.45
    titleSize = Math.max(titleSize - 0.35, 13)
    authorSize = Math.max(authorSize - 0.22, 9)
    gapSize = Math.max(0, gapSize - 0.12)
    reading.style.setProperty("gap", `${gapSize}px`, "important")
    poem.style.setProperty("font-size", `${poemSize}px`, "important")
    poem.style.setProperty("line-height", "1.08", "important")
    if (title) title.style.setProperty("font-size", `${titleSize}px`, "important")
    if (author) author.style.setProperty("font-size", `${authorSize}px`, "important")
  }
}

function showGame2ReadingPage() {
  const playMode = document.getElementById("playMode")
  const text = activeGame2Text || game2LiteraryTexts[0]

  alreadyAnswered = true
  clearInterval(questionTimerInterval)
  questionTimeLeft = questionDuration
  updateTimerBar(false)
  playMode.classList.add("reading-text-mode")
  setFeedback()
  document.getElementById("hintText").innerText = ""
  document.getElementById("gameTitle").innerText = gameTitles[2]
  document.getElementById("questionText").innerHTML = `
    <div class="literary-reading">
      <strong>${escapeHtml(text.title)}</strong>
      <em>${escapeHtml(text.author)}</em>
      <p>${formatLiteraryText(text.text)}</p>
    </div>
  `
  document.getElementById("choices").innerHTML = developerPreviewMode && developerLastQuestionList.type === "content" && developerLastQuestionList.game === 2
    ? `<button class="start-text-questions-btn" onclick="sparkButton(this); developerReturnToContentList()">Back to Poems</button>`
    : `<button class="start-text-questions-btn" onclick="sparkButton(this); beginGame2Questions()">Start Questions</button>`
  setGuideState("assets/images/guide-default.png", "Read the literary text first. The next questions will all come from this text.")
  requestAnimationFrame(fitLiteraryReadingToCard)
}

function beginGame2Questions() {
  document.getElementById("playMode").classList.remove("reading-text-mode")
  currentQuestion = 0
  loadQuestion()
}

function loadQuestion() {
  alreadyAnswered = false
  clearInterval(questionTimerInterval)
  document.getElementById("playMode").classList.remove("reading-text-mode")
  const fiftyButton = document.querySelector(".fifty-image-btn")
  if (fiftyButton) {
    delete fiftyButton.dataset.used
  }
  updateFiftyButtonAvailability()

  const q = questions[currentQuestion]
  setGuideState("assets/images/guide-default.png", getGuidePrompt(q))

  document.getElementById("hintText").innerText = ""
  setFeedback()
  document.getElementById("gameTitle").innerText = currentGame === 1
    ? `${gameTitles[currentGame]}\u00A0Level\u00A0${currentSentenceLevel}`
    : gameTitles[currentGame]

  if (currentGame === 3) {
    document.getElementById("questionText").innerHTML =
      `<span class="rewrite-title">Rewrite using <b>${q.figureLabel || q.figure}</b></span><span class="literal-line">Sentence: ${q.literal}</span>`

    document.getElementById("choices").innerHTML = `
      <input id="playerAnswer" class="answer-input" placeholder="Type your answer here">
      <button onclick="sparkButton(this); checkCreative()">Submit</button>
    `
  } else {
    if (q.text) {
      document.getElementById("questionText").innerHTML =
        `<b>Text:</b><br>${q.text}<br><br>${q.question}`
    } else {
      document.getElementById("questionText").innerHTML = formatQuestionPrompt(q)
    }

    let html = ""
    q.choices.forEach(choice => {
      const choiceClass = getChoiceLengthClass(choice)
      html += `<button type="button" class="${choiceClass}" data-answer="${escapeHtml(choice)}" onclick="sparkButton(this); checkAnswer(this.dataset.answer)">${escapeHtml(choice)}</button>`
    })
    document.getElementById("choices").innerHTML = html
  }

  fitQuestionTextToCard()
  fitGame1ChoicesToBoard()
  startQuestionTimer()
}

function checkAnswer(choice) {
  if (alreadyAnswered) return
  alreadyAnswered = true
  clearInterval(questionTimerInterval)

  const q = questions[currentQuestion]
  const correct = q.answer
  const isCorrect = choice === correct
  if (!developerPreviewMode) {
    recordCurrentRunAnswer(q, choice, correct, isCorrect)
  }

  if (isCorrect) {
    let awardDelay = 0
    if (!developerPreviewMode) {
      score += 10
      streak++
      correctAnswers++
      rewardHint()
      awardDelay = awardBadgeForAnswer(q.badgeAnswer || correct)
    }
    setFeedback("correct", "Correct!", q.correctFeedback || "Nice work.", developerPreviewMode)
    setGuideState("assets/images/guide-happy.png", q.correctFeedback || "Correct! Nice work. Get ready for the next question.")
    updateStats()
    disableChoices()
    if (!developerPreviewMode) setTimeout(nextQuestion, awardDelay || 1500)
  } else {
    if (!developerPreviewMode) streak = 0
    const correction = q.incorrectFeedback || `Correct answer: ${correct}`
    setFeedback("wrong", "Wrong!", correction, true)
    setGuideState("assets/images/guide-default.png", correction)
    updateStats()
    disableChoices()
  }
}

function getCreativeWords(answer) {
  return String(answer || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

function getPromptKeywords(question) {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "am", "was", "were", "very", "for", "after", "through",
    "on", "in", "to", "of", "during", "tonight", "and", "while", "using", "with"
  ])

  return getCreativeWords(question?.literal || "")
    .map(word => word.replace(/'(s)?$/, ""))
    .filter(word => word.length >= 3 && !stopWords.has(word))
}

function hasPromptConnection(question, words) {
  const answerWords = new Set(words)
  const pronouns = ["he", "she", "it", "they", "his", "her", "its", "their", "him", "them", "i"]
  const promptKeywords = getPromptKeywords(question)

  return promptKeywords.some(word => answerWords.has(word))
    || pronouns.some(word => answerWords.has(word))
}

function hasValidSimileStructure(words, question = null) {
  const promptKeywords = new Set(getPromptKeywords(question))

  return words.some((word, index) => {
    if (word !== "like" && word !== "as") return false

    const hasBefore = words.slice(0, index).some(part => part !== "like" && part !== "as")
    const hasAfter = words.slice(index + 1).some(part =>
      part !== "like"
      && part !== "as"
      && !["a", "an", "the"].includes(part)
      && !promptKeywords.has(part)
    )
    return hasBefore && hasAfter
  })
}

function hasDirectMetaphorStructure(words, question = null) {
  const linkingWords = new Set(["is", "are", "am", "was", "were", "becomes", "become", "became"])
  const promptKeywords = new Set(getPromptKeywords(question))
  const linkIndex = words.findIndex(word => linkingWords.has(word))
  if (linkIndex < 1) return false

  const afterLink = words.slice(linkIndex + 1).filter(word => !["a", "an", "the"].includes(word))
  return afterLink.some(word => word.length >= 3 && !promptKeywords.has(word))
}

function hasAlliterationPair(words) {
  const contentWords = words.filter(word => word.length >= 3 && !["the", "and", "like", "as"].includes(word))
  return contentWords.some((word, index) => contentWords[index + 1] && word[0] === contentWords[index + 1][0])
}

function validateCreativeAnswer(question, rawAnswer) {
  const answer = String(rawAnswer || "").trim()
  const words = getCreativeWords(answer)
  const usesLikeOrAs = words.includes("like") || words.includes("as")
  const enoughWords = words.length >= 3
  const hasConnection = hasPromptConnection(question, words)
  const emptyFigureWords = new Set(["like", "as", "simile", "metaphor", "personification", "hyperbole", "alliteration"])

  if (!answer) {
    return { correct: false, reason: "Please type your answer first." }
  }

  if (!enoughWords || words.every(word => emptyFigureWords.has(word))) {
    return { correct: false, reason: "Please write a complete answer, not just one clue word." }
  }

  if (!hasConnection) {
    return { correct: false, reason: "Keep the original idea from the sentence while rewriting it." }
  }

  if (question.figure === "Simile") {
    if (words.length < 4 || !hasValidSimileStructure(words, question)) {
      return { correct: false, reason: "Use like or as with words before and after it to make a real comparison." }
    }
    return { correct: true }
  }

  if (question.figure === "Metaphor") {
    if (usesLikeOrAs) {
      return { correct: false, reason: "A metaphor should be direct, so do not use like or as." }
    }
    if (words.length < 4 || !hasDirectMetaphorStructure(words, question)) {
      return { correct: false, reason: "Make a direct comparison, such as 'The farmer is a sturdy tree.'" }
    }
    return { correct: true }
  }

  if (question.figure === "Personification") {
    const humanActionWords = [
      "whisper", "whispers", "whispered", "dance", "dances", "danced", "sing", "sings", "sang",
      "talk", "talks", "talked", "cry", "cries", "cried", "laugh", "laughs", "laughed",
      "smile", "smiles", "smiled", "hug", "hugs", "hugged", "call", "calls", "called",
      "scream", "screams", "screamed", "sleep", "sleeps", "slept", "sob", "sobs", "sobbed",
      "weep", "weeps", "wept", "welcome", "welcomes", "welcomed", "angry", "happy", "sad",
      "lonely", "friendly", "tired", "stubborn", "grumble", "grumbles", "grumbled",
      "run", "runs", "ran", "walk", "walks", "walked", "chase", "chases", "chased",
      "creep", "creeps", "crept", "shout", "shouts", "shouted", "fear", "fears", "feared",
      "beg", "begs", "begged", "comfort", "comforts", "comforted"
    ]
    const hasHumanAction = humanActionWords.some(word => words.includes(word))
    return hasHumanAction
      ? { correct: true }
      : { correct: false, reason: "Give the non-human thing a human action or feeling." }
  }

  if (question.figure === "Hyperbole") {
    const exaggerationWords = [
      "million", "billion", "trillion", "thousand", "hundred", "forever", "tons", "always",
      "never", "entire", "whole", "endless", "infinite", "mountain",
      "ocean", "world", "planet", "universe", "moon", "starving", "dying", "exploded",
      "biggest", "smallest", "heaviest", "river", "sky", "earth", "death", "lifetime",
      "lifetimes", "giant", "impossible"
    ]
    const hasBigNumber = (answer.match(/\b\d+\b/g) || []).some(numberText => Number(numberText) >= 100)
    const hasExaggeration = hasBigNumber || exaggerationWords.some(word => words.includes(word))
    return hasExaggeration
      ? { correct: true }
      : { correct: false, reason: "Add clear exaggeration so the sentence becomes stronger than real life." }
  }

  if (question.figure === "Alliteration") {
    const hasAlliteration = hasAlliterationPair(words)
    if (!hasAlliteration) {
      return { correct: false, reason: "Use nearby words that start with the same sound." }
    }

    if (question.requiresSimile && (words.length < 5 || !hasValidSimileStructure(words, question))) {
      return { correct: false, reason: "This item needs alliteration and a like or as comparison." }
    }

    return { correct: true }
  }

  return { correct: false, reason: "Please follow the figure of speech in the prompt." }
}

function checkCreative() {
  if (alreadyAnswered) return
  alreadyAnswered = true
  clearInterval(questionTimerInterval)

  const q = questions[currentQuestion]
  const rawAnswer = document.getElementById("playerAnswer").value
  const validation = validateCreativeAnswer(q, rawAnswer)
  const correct = validation.correct

  if (!developerPreviewMode) {
    recordCurrentRunAnswer(q, rawAnswer, q.figureLabel || q.figure, correct)
  }

  if (correct) {
    let awardDelay = 0
    if (!developerPreviewMode) {
      score += 15
      correctAnswers++
      rewardHint()
      awardDelay = awardBadgeForAnswer(q.figure)
    }
    setFeedback("correct", "Correct!", q.correctFeedback || "Good creative answer!", developerPreviewMode)
    setGuideState("assets/images/guide-happy.png", q.correctFeedback || "Great creative answer! You followed the figure of speech.")
    updateStats()
    disableChoices()
    if (!developerPreviewMode) setTimeout(nextQuestion, awardDelay || 1500)
    return
  } else {
    const correction = validation.reason
      ? `${validation.reason} ${q.incorrectFeedback || ""}`.trim()
      : q.incorrectFeedback || `Try again next time. Remember: ${q.hint}`
    setFeedback("wrong", "Wrong!", correction, true)
    setGuideState("assets/images/guide-default.png", correction)
  }

  updateStats()
  disableChoices()
}

function nextQuestion() {
  clearInterval(questionTimerInterval)
  currentQuestion++

  if (currentQuestion >= questions.length) {
    finishGame()
    return
  }

  loadQuestion()
}

function finishGame() {
  clearInterval(questionTimerInterval)

  if (developerPreviewMode) {
    developerPreviewMode = false
    openDeveloperCheckQuestionReturn()
    return
  }

  setGuideState("assets/images/guide-cheer.png", "You finished the game. Let's see your result!")

  const requiredCorrectAnswers = getPassingAnswersForGame(currentGame, questions.length)

  if (correctAnswers >= requiredCorrectAnswers) {
    commitCurrentRunAnswers()
    carryScore = score
    carryStreak = streak
    carryHintCount = hintCount

    if (currentGame === 1 && currentSentenceLevel < sentenceSleuthLevels.length) {
      completedSentenceLevels.add(currentSentenceLevel)
      unlockedSentenceLevel = Math.max(unlockedSentenceLevel, currentSentenceLevel + 1)
      savePlayerProfile()
      showSentenceLevelSuccessBoard(currentSentenceLevel, currentSentenceLevel + 1)
      return
    }

    if (currentGame === 1) {
      completedSentenceLevels.add(currentSentenceLevel)
      unlockedSentenceLevel = sentenceSleuthLevels.length
    }

    completedGames.add(currentGame)

    if (currentGame < 3) {
      unlockedGame = Math.max(unlockedGame, currentGame + 1)
      savePlayerProfile()
      showSuccessBoard(currentGame, currentGame + 1)
    } else {
      savePlayerProfile()
      showSuccessBoard(currentGame)
    }
  } else {
    rollbackCurrentRunProgress()
    showPopup("Try Again", `You got ${correctAnswers}/${questions.length}. You need ${requiredCorrectAnswers}/${questions.length} to proceed. Please review this game again.`)
    if (currentGame === 1) {
      startGame(1, false, currentSentenceLevel)
    } else {
      startModule(currentGame, true)
    }
  }
}

function openDeveloperCheckQuestionReturn() {
  hideAllScreens()
  setGameIdVisibility(false)
  if (developerLastQuestionList.type === "content") {
    developerOpenContentList(developerLastQuestionList.game || 2)
  } else {
    developerOpenQuestionList(developerLastQuestionList.game || 1)
  }
}

function rewardHint() {
  rewardTracker++

  if (rewardTracker >= 2) {
    hintCount++
    rewardTracker = 0
  }
}

function showHint() {
  const q = questions[currentQuestion]

  if (hintCount <= 0) {
    document.getElementById("hintText").innerText = "No hints available. Earn hints by answering correctly."
    setGuideState("assets/images/guide-default.png", "No hints yet. Answer correctly to earn more help from me.")
    return
  }

  hintCount--
  document.getElementById("hintText").innerText = "Hint: " + q.hint
  setGuideState("assets/images/guide-default.png", "Hint: " + q.hint)
  updateStats()
}

function fiftyFifty() {
  if (currentGame === 3 || alreadyAnswered) return
  const fiftyButton = document.querySelector(".fifty-image-btn")
  if (fiftyButton?.dataset.used === "true") return

  if (hintCount <= 0) {
    document.getElementById("hintText").innerText = "No hints available. Earn hints by answering correctly."
    setGuideState("assets/images/guide-default.png", "No hints left. The 50/50 tool uses one hint too.")
    return
  }

  const q = questions[currentQuestion]
  const removeCount = Math.max(0, q.choices.length - 2)
  const wrong = q.choices.filter(c => c !== q.answer).slice(0, removeCount)
  const choiceWord = wrong.length === 1 ? "choice" : "choices"
  hintCount--
  if (fiftyButton) {
    fiftyButton.dataset.used = "true"
    fiftyButton.disabled = true
  }
  setGuideState("assets/images/guide-default.png", `I removed ${wrong.length} wrong ${choiceWord}. Compare the remaining answers.`)

  document.querySelectorAll("#choices button").forEach(btn => {
    if (wrong.includes(btn.dataset.answer || btn.innerText)) btn.style.display = "none"
  })
  updateStats()
}

function updateStats() {
  document.getElementById("score").innerText = score
  document.getElementById("streak").innerText = streak
  document.getElementById("hintCount").innerText = hintCount
  updateFiftyButtonAvailability()
  syncMultiplayerScore("stats")
}

function updateFiftyButtonAvailability() {
  const fiftyButton = document.querySelector(".fifty-image-btn")
  if (!fiftyButton) return

  fiftyButton.disabled = currentGame === 3
    || alreadyAnswered
    || hintCount <= 0
    || fiftyButton.dataset.used === "true"
}

function updateTimerBar(animate = true) {
  const timerBar = document.getElementById("timerBar")
  if (!timerBar) return

  const ratio = questionDuration > 0 ? Math.max(0, questionTimeLeft) / questionDuration : 0

  if (!animate) {
    timerBar.classList.add("resetting")
  }

  timerBar.style.width = `${ratio * 100}%`

  if (!animate) {
    timerBar.offsetWidth
    timerBar.classList.remove("resetting")
  }
}

function startQuestionTimer(resetTime = true) {
  clearInterval(questionTimerInterval)

  if (resetTime) {
    questionTimeLeft = questionDuration
  }

  updateTimerBar(false)

  if (developerPreviewMode) return

  questionTimerInterval = setInterval(() => {
    questionTimeLeft--
    updateTimerBar()

    if (questionTimeLeft <= 0 && !alreadyAnswered) {
      alreadyAnswered = true
      clearInterval(questionTimerInterval)
      questionTimeLeft = 0
      updateTimerBar()
      recordCurrentRunAnswer(questions[currentQuestion], "No answer", questions[currentQuestion]?.answer || questions[currentQuestion]?.figure || "N/A", false)
      streak = 0
      updateStats()
      setFeedback("timeout", "Time's up!", "No points earned.", true)
      setGuideState("assets/images/guide-default.png", "Time is up. Stay with me and try the next question.")
      disableChoices()
    }
  }, 1000)
}

function disableChoices() {
  document.querySelectorAll("#choices button").forEach(btn => btn.disabled = true)

  const input = document.getElementById("playerAnswer")
  if (input) input.disabled = true
}

function updateModuleLocks() {
  const module2 = document.getElementById("module2")
  if (module2) {
    if (unlockedGame >= 2) {
      module2.className = "module-card module-card-image text-detectives-card unlocked"
      module2.onclick = () => startModule(2)
      module2.querySelector("span").innerText = "Unlocked"
    } else {
      module2.className = "module-card module-card-image text-detectives-card locked"
      module2.onclick = () => lockedMessage(2)
      module2.querySelector("span").innerText = "Locked"
    }
  }

  const module3 = document.getElementById("module3")
  if (module3) {
    if (unlockedGame >= 3) {
      module3.className = "module-card module-card-image expression-lab-card unlocked"
      module3.onclick = () => startModule(3)
      module3.querySelector("span").innerText = "Unlocked"
    } else {
      module3.className = "module-card module-card-image expression-lab-card locked"
      module3.onclick = () => lockedMessage(3)
      module3.querySelector("span").innerText = "Locked"
    }
  }
}

function lockedMessage(moduleNumber) {
  if (moduleNumber === 2 && !completedGames.has(1)) {
    showPopup("NOTE", "Please finish Sentence Sleuths Levels 1, 2, and 3 before proceeding.")
    return
  }

  showPopup("NOTE", `Please finish Game ${moduleNumber - 1} first before proceeding.`)
}

function getBadgeKeyFromAnswer(answer) {
  const normalizedAnswer = String(answer || "").trim().toLowerCase()
  return Object.keys(badgeDefinitions).find(key => badgeDefinitions[key].label.toLowerCase() === normalizedAnswer) || null
}

function awardBadgeForAnswer(answer) {
  const badgeKey = getBadgeKeyFromAnswer(answer)
  if (!badgeKey || earnedBadges.has(badgeKey)) return 0
  if (earnedBadges.size >= BADGE_CAP) return 0

  const currentCount = badgeProgress[badgeKey] || 0
  badgeProgress[badgeKey] = Math.min(BADGE_REQUIRED_CORRECT, currentCount + 1)

  if (badgeProgress[badgeKey] < BADGE_REQUIRED_CORRECT) {
    return 0
  }

  earnedBadges.add(badgeKey)
  badgeProgress[badgeKey] = BADGE_REQUIRED_CORRECT
  const completedAllBadges = earnedBadges.size >= BADGE_CAP && !allBadgesBonusAwarded

  if (completedAllBadges) {
    score += ALL_BADGES_BONUS
    allBadgesBonusAwarded = true
  }

  updateGameIdCard()
  showBadgeAward(badgeKey, completedAllBadges)
  return completedAllBadges ? 3700 : 2600
}

function showBadgeAward(badgeKey, completedAllBadges = false) {
  const badge = badgeDefinitions[badgeKey]
  if (!badge) return

  const panel = document.getElementById("badgePanel")
  const title = panel.querySelector("h2")
  const image = document.getElementById("badgeAwardImage")
  const message = document.getElementById("badgeAwardMessage")

  panel.classList.toggle("all-badges-bonus", completedAllBadges)
  if (title) title.innerText = completedAllBadges ? "All Badges Activated!" : "Badge Earned!"
  image.src = badge.display
  image.alt = `${badge.label} badge`
  message.innerText = completedAllBadges
    ? `${playerName || "Player"}, you collected all five badges! Bonus +${ALL_BADGES_BONUS} points activated.`
    : `${playerName || "Player"}, you answered 3 ${badge.label} items correctly and earned the badge!`
  panel.classList.remove("hidden")
  createCompletionFireworks()

  clearTimeout(showBadgeAward.hideTimer)
  showBadgeAward.hideTimer = setTimeout(() => {
    panel.classList.add("hidden")
    panel.classList.remove("all-badges-bonus")
  }, completedAllBadges ? 3400 : 2300)
}

function showPopup(title, message) {
  document.getElementById("popupBox").classList.remove("mechanics-popup", "answers-popup", "developer-popup", "developer-password-popup", "developer-review-popup")
  document.getElementById("popupTitle").innerText = title
  document.getElementById("popupMessage").innerText = message
  document.getElementById("popupPanel").classList.remove("hidden")
}

function closePopup() {
  document.getElementById("popupBox").classList.remove("mechanics-popup", "answers-popup", "developer-popup", "developer-password-popup", "developer-review-popup")
  document.getElementById("popupPanel").classList.add("hidden")
}

function showSuccessBoard(gameNumber, nextGame = null) {
  const title = document.getElementById("successTitle")
  const message = document.getElementById("successMessage")
  const actions = document.getElementById("successActions")

  title.innerText = "Complete!"

  const summary = `Score: ${score} | Hints: ${hintCount} | Streak: ${streak}`

  if (nextGame) {
    message.innerText = `${gameTitles[gameNumber]} complete!\n${summary}\n${gameTitles[nextGame]} is unlocked.`
    actions.innerHTML = `
      <button onclick="goToNextGame(${nextGame})" class="image-btn next-image-btn" aria-label="Go to Game ${nextGame}" title="Go to Game ${nextGame}"></button>
      <button onclick="restartCompletedGame(${gameNumber})" class="image-btn restart-image-btn" aria-label="Restart Game ${gameNumber}" title="Restart Game ${gameNumber}"></button>
    `
  } else {
    message.innerText = `All games complete!\n${summary}\nGreat job using figurative language with confidence.`
    actions.innerHTML = `
      <button onclick="restartCompletedGame(${gameNumber})" class="image-btn restart-image-btn" aria-label="Restart Game ${gameNumber}" title="Restart Game ${gameNumber}"></button>
      <button onclick="exitSuccessBoard()" class="image-btn exit-image-btn" aria-label="Exit" title="Exit"></button>
    `
  }

  document.getElementById("successPanel").classList.remove("hidden")
  createCompletionFireworks()
}

function showSentenceLevelSuccessBoard(levelNumber, nextLevel) {
  const title = document.getElementById("successTitle")
  const message = document.getElementById("successMessage")
  const actions = document.getElementById("successActions")
  const summary = `Score: ${score} | Hints: ${hintCount} | Streak: ${streak}`

  title.innerText = "Complete!"
  message.innerText = `Sentence Sleuths Level ${levelNumber} complete!\n${summary}\nLevel ${nextLevel} is unlocked.`
  actions.innerHTML = `
    <button onclick="goToSentenceLevel(${nextLevel})" class="image-btn next-image-btn" aria-label="Go to Sentence Sleuths Level ${nextLevel}" title="Go to Sentence Sleuths Level ${nextLevel}"></button>
    <button onclick="restartSentenceLevel(${levelNumber})" class="image-btn restart-image-btn" aria-label="Restart Sentence Sleuths Level ${levelNumber}" title="Restart Sentence Sleuths Level ${levelNumber}"></button>
  `

  document.getElementById("successPanel").classList.remove("hidden")
  createCompletionFireworks()
}

function closeSuccessBoard() {
  document.getElementById("successPanel").classList.add("hidden")
}

function goToNextGame(gameNumber) {
  closeSuccessBoard()
  startModule(gameNumber)
}

function goToSentenceLevel(levelNumber) {
  closeSuccessBoard()
  startGame(1, false, levelNumber)
}

function restartSentenceLevel(levelNumber) {
  closeSuccessBoard()
  startGame(1, false, levelNumber)
}

function restartCompletedGame(gameNumber) {
  closeSuccessBoard()
  startGame(gameNumber, false, 1)
}

function exitSuccessBoard() {
  closeSuccessBoard()
  showModuleMap()
}

function showInstructions() {
  const popupBox = document.getElementById("popupBox")
  const popupMessage = document.getElementById("popupMessage")

  popupBox.classList.remove("answers-popup", "developer-popup")
  popupBox.classList.add("mechanics-popup")
  document.getElementById("popupTitle").innerText = "Game Mechanics"
  popupMessage.innerHTML = `
    <div class="mechanics-guide">
      <div class="mechanics-flow" aria-label="Game flow">
        <div class="mechanics-step">
          <span class="mechanics-number">1</span>
          <strong>Learn First</strong>
          <p>Read the short tutorial before each game.</p>
        </div>
        <div class="mechanics-step">
          <span class="mechanics-number">2</span>
          <strong>Answer</strong>
          <p>Choose the best answer or type your own sentence.</p>
        </div>
        <div class="mechanics-step">
          <span class="mechanics-number">3</span>
          <strong>Get Feedback</strong>
          <p>See correct or wrong feedback after every item.</p>
        </div>
        <div class="mechanics-step">
          <span class="mechanics-number">4</span>
          <strong>Unlock</strong>
          <p>Pass with 60% or higher in Game 1, or 4 out of 5 in the other games.</p>
        </div>
      </div>

      <div class="mechanics-games" aria-label="Game modes">
        <div class="mechanics-game-card">
          <span class="mechanics-game-badge">Game 1</span>
          <strong>Sentence Sleuths</strong>
          <p>Clear Levels 1, 2, and 3 before Text Detectives unlocks.</p>
        </div>
        <div class="mechanics-game-card">
          <span class="mechanics-game-badge">Game 2</span>
          <strong>Text Detectives</strong>
          <p>Analyze lines and clues from longer text.</p>
        </div>
        <div class="mechanics-game-card">
          <span class="mechanics-game-badge">Game 3</span>
          <strong>Expression Lab</strong>
          <p>Create your own figurative language from a given clue.</p>
        </div>
      </div>

      <div class="mechanics-rules" aria-label="Rules and tools">
        <div class="mechanics-rule">
          <span>Score</span>
          <strong>+10 / +15</strong>
          <p>Choice answers earn 10. Creative answers earn 15.</p>
        </div>
        <div class="mechanics-rule">
          <span>Timer</span>
          <strong>15 sec</strong>
          <p>The green bar shows time left for each question.</p>
        </div>
        <div class="mechanics-rule">
          <span>Hints</span>
          <strong>Earned</strong>
          <p>Answer correctly to earn guide help for later items.</p>
        </div>
        <div class="mechanics-rule">
          <span>50/50</span>
          <strong>Games 1-2</strong>
          <p>Remove wrong choices when you need support.</p>
        </div>
      </div>
    </div>
  `
  document.getElementById("popupPanel").classList.remove("hidden")
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null
}

function updateFullscreenButton() {
  const button = document.getElementById("fullscreenBtn")
  if (!button) return

  const isFullscreen = Boolean(getFullscreenElement())
  button.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen")
  button.title = isFullscreen ? "Exit fullscreen" : "Fullscreen"
  document.body.classList.toggle("is-fullscreen", isFullscreen)
  updateFixedLayout()
}

function lockLandscapeIfPossible() {
  const orientation = window.screen?.orientation
  if (!orientation?.lock) return

  const lockRequest = orientation.lock("landscape")
  if (lockRequest?.catch) lockRequest.catch(() => {})
}

function unlockOrientationIfPossible() {
  const orientation = window.screen?.orientation
  if (!orientation?.unlock) return
  try {
    orientation.unlock()
  } catch {
    // Some mobile browsers only allow locking, not explicit unlocking.
  }
}

function toggleFullscreen() {
  const activeElement = getFullscreenElement()

  if (activeElement) {
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen
    unlockOrientationIfPossible()
    if (exitFullscreen) exitFullscreen.call(document)
    return
  }

  const target = document.documentElement
  const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen

  if (!requestFullscreen) {
    return
  }

  const request = requestFullscreen.call(target, { navigationUI: "hide" })
  if (request?.then) {
    request.then(lockLandscapeIfPossible).catch(() => {})
  } else {
    lockLandscapeIfPossible()
  }
}

document.addEventListener("fullscreenchange", updateFullscreenButton)
document.addEventListener("webkitfullscreenchange", updateFullscreenButton)
document.addEventListener("MSFullscreenChange", updateFullscreenButton)

function openSettings() {
  clearInterval(questionTimerInterval)
  document.getElementById("settingsPanel").classList.remove("hidden")
}

function closeSettings() {
  document.getElementById("settingsPanel").classList.add("hidden")

  if (!alreadyAnswered && !document.getElementById("playMode").classList.contains("hidden")) {
    startQuestionTimer(false)
  }
}

function restartGame() {
  document.getElementById("settingsPanel").classList.add("hidden")
  rollbackCurrentRunProgress()
  startGame(currentGame, false, currentGame === 1 ? currentSentenceLevel : 1)
}

function endGame() {
  clearInterval(questionTimerInterval)
  document.getElementById("settingsPanel").classList.add("hidden")
  rollbackCurrentRunProgress()
  showModuleMap()
}

function toggleMusic() {
  const music = document.getElementById("bgMusic")

  musicMuted = !musicMuted

  if (!musicMuted) {
    music.volume = 0.25
    music.play().catch(() => {})
  } else {
    music.pause()
  }

  updateMuteButton()
}

function playMusic() {
  const music = document.getElementById("bgMusic")
  if (musicMuted) return
  music.volume = 0.25
  music.play().catch(() => {})
}

function updateMuteButton() {
  const button = document.getElementById("muteBtn")
  if (!button) return

  button.classList.toggle("is-muted", musicMuted)
  button.setAttribute("aria-label", musicMuted ? "Unmute music" : "Mute music")
  button.title = musicMuted ? "Unmute music" : "Mute music"
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5)
}

function createGlitterBurst(x, y) {
  const burst = document.createElement("span")
  burst.className = "glitter-burst"
  burst.style.transform = `translate(${x}px, ${y}px)`

  for (let i = 0; i < 20; i++) {
    const spark = document.createElement("span")
    const angle = (Math.PI * 2 * i) / 20
    const distance = 42 + Math.random() * 36
    spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`)
    spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`)
    spark.style.animationDelay = `${Math.random() * 70}ms`
    burst.appendChild(spark)
  }

  document.body.appendChild(burst)
  setTimeout(() => burst.remove(), 980)
}

function createCompletionFireworks() {
  const show = document.createElement("span")
  show.className = "fireworks-show"
  document.body.appendChild(show)

  const bursts = [
    [22, 24],
    [50, 18],
    [78, 25],
    [34, 42],
    [66, 43]
  ]

  bursts.forEach(([x, y], burstIndex) => {
    for (let i = 0; i < 20; i++) {
      const spark = document.createElement("span")
      const angle = (Math.PI * 2 * i) / 20
      const distance = 62 + Math.random() * 58
      spark.style.left = `${x}vw`
      spark.style.top = `${y}vh`
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`)
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`)
      spark.style.animationDelay = `${burstIndex * 180 + Math.random() * 80}ms`
      show.appendChild(spark)
    }
  })

  setTimeout(() => show.remove(), 3600)
}

function sparkButton(button) {
  if (!button || button.disabled) return

  const rect = button.getBoundingClientRect()
  createGlitterBurst(rect.left + rect.width / 2, rect.top + rect.height / 2)
}

loadPlayerProfile()
updateGameIdCard()
initMultiplayer()

const playerNameInput = document.getElementById("playerNameInput")
if (playerNameInput) {
  playerNameInput.value = playerName
  playerNameInput.addEventListener("input", () => {
    playerNameInput.value = playerNameInput.value.slice(0, 16)
  })
  playerNameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") submitPlayerName()
  })
}

document.addEventListener("click", event => {
  const target = event.target.closest("button")
  if (!target || target.disabled) return

  createGlitterBurst(event.clientX, event.clientY)
})
