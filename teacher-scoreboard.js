const params = new URLSearchParams(window.location.search)
let roomCode = normalizeRoom(params.get("room") || "CLASS")
let classroomApiBase = getInitialClassroomApiBase()
let eventSource = null
let pollTimer = null

const roomInput = document.getElementById("roomInput")
const roomButton = document.getElementById("roomButton")
const studentLink = document.getElementById("studentLink")
const copyLinkButton = document.getElementById("copyLinkButton")
const liveRows = document.getElementById("liveRows")
const topRows = document.getElementById("topRows")
const liveCount = document.getElementById("liveCount")
const topCount = document.getElementById("topCount")
const connectionStatus = document.getElementById("connectionStatus")
const lastUpdated = document.getElementById("lastUpdated")
const studentDetailBody = document.getElementById("studentDetailBody")
const studentDetailCounts = Array.from(document.querySelectorAll("[data-student-count], #studentDetailCount")).filter(Boolean)
const studentBackButtons = Array.from(document.querySelectorAll("[data-student-nav='back'], #studentBackButton")).filter(Boolean)
const studentNextButtons = Array.from(document.querySelectorAll("[data-student-nav='next'], #studentNextButton")).filter(Boolean)

let latestPlayers = []
let studentOrder = []
let leaderOrder = []
let selectedStudentId = ""

function normalizeRoom(value) {
  const clean = String(value || "CLASS")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16)

  return clean || "CLASS"
}

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "")
}

function getInitialClassroomApiBase() {
  const fromUrl = normalizeApiBase(params.get("api") || "")

  if (fromUrl) {
    try {
      localStorage.setItem("metaphoriaClassroomApi", fromUrl)
    } catch {
      // API still works for this page load.
    }
    return fromUrl
  }

  const fromConfig = normalizeApiBase(window.METAPHORIA_API_BASE || "")
  if (fromConfig) return fromConfig

  try {
    const saved = normalizeApiBase(localStorage.getItem("metaphoriaClassroomApi") || "")
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

function getApiUrl(path, query = "") {
  if (!classroomApiBase) return `${path}${query}`
  if (isNetlifyFunctionApi()) return `${classroomApiBase}${query}`
  return `${classroomApiBase}${path}${query}`
}

function getRoomUrl() {
  return getApiUrl("/api/room", `?room=${encodeURIComponent(roomCode)}`)
}

function getEventsUrl() {
  if (isNetlifyFunctionApi()) return ""
  return getApiUrl("/api/events", `?room=${encodeURIComponent(roomCode)}&teacher=1`)
}

function shouldShareApiParam() {
  return Boolean(classroomApiBase && !isNetlifyFunctionApi())
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

function sanitizeLearnAnswers(answers = []) {
  if (!Array.isArray(answers)) return []

  return answers
    .map(answer => ({
      title: escapeHtml(answer?.title || "Learning Response"),
      prompt: escapeHtml(answer?.prompt || "Student response"),
      answer: escapeHtml(answer?.answer || "")
    }))
    .filter(answer => answer.answer)
}

function sanitizeGameAnswers(runs = []) {
  if (!Array.isArray(runs)) return []

  return runs
    .slice(0, 5)
    .map(run => {
      const safeRun = run && typeof run === "object" ? run : {}
      const answers = Array.isArray(safeRun.answers) ? safeRun.answers : []

      return {
        title: escapeHtml(safeRun.title || "Finished Game"),
        score: Number(safeRun.score) || 0,
        correctAnswers: Number(safeRun.correctAnswers) || 0,
        totalQuestions: Number(safeRun.totalQuestions) || answers.length,
        answers: answers.slice(0, 5).map((answer, index) => {
          const safeAnswer = answer && typeof answer === "object" ? answer : {}

          return {
            number: Number(safeAnswer.number) || index + 1,
            question: escapeHtml(safeAnswer.question || "Question"),
            playerAnswer: escapeHtml(safeAnswer.playerAnswer || "No answer"),
            correctAnswer: escapeHtml(safeAnswer.correctAnswer || "N/A"),
            isCorrect: Boolean(safeAnswer.isCorrect)
          }
        })
      }
    })
    .filter(run => run.answers.length > 0)
}

function createLearnAnswerCards(answers = []) {
  const cleanAnswers = sanitizeLearnAnswers(answers)
  if (!cleanAnswers.length) return ""

  return `
    <div class="student-answer-section">
      <h3>Learning Responses</h3>
    </div>
    <div class="student-answers">
      ${cleanAnswers.map(answer => `
        <article class="student-answer-card">
          <strong>${answer.title}</strong>
          <span>${answer.prompt}</span>
          <p>${answer.answer}</p>
        </article>
      `).join("")}
    </div>
  `
}

function createGameAnswerCards(runs = []) {
  const cleanRuns = sanitizeGameAnswers(runs)
  if (!cleanRuns.length) return ""

  return `
    <div class="student-answer-section">
      <h3>Finished Game Answers</h3>
      ${cleanRuns.map(run => `
        <article class="game-answer-run">
          <header>
            <strong>${run.title}</strong>
            <span>${run.correctAnswers}/${run.totalQuestions} correct | Score ${run.score}</span>
          </header>
          <ol>
            ${run.answers.map(answer => `
              <li class="${answer.isCorrect ? "answer-correct" : "answer-wrong"}">
                <span class="answer-question">${answer.number}. ${answer.question}</span>
                <span class="answer-player">Student: ${answer.playerAnswer}</span>
                <span class="answer-key">Key: ${answer.correctAnswer}</span>
              </li>
            `).join("")}
          </ol>
        </article>
      `).join("")}
    </div>
  `
}

function getStudentUrl() {
  const url = new URL("/index.html", window.location.origin)
  url.searchParams.set("room", roomCode)

  if (shouldShareApiParam()) {
    url.searchParams.set("api", classroomApiBase)
  }

  return url.href
}

function updateRoomUi() {
  roomInput.value = roomCode
  studentLink.textContent = getStudentUrl()
}

function getStudentKey(player, index = 0) {
  return String(player?.clientId || `${player?.name || "Player"}-${index}`)
}

function getLeaderStableKey(player, index = 0) {
  return String(player?.clientId || player?.name || `leader-${index}`).toLowerCase()
}

function getStableItems(items = [], order, keyGetter) {
  const keyedItems = items.map((item, index) => ({
    key: keyGetter(item, index),
    item
  }))
  const currentKeys = new Set(keyedItems.map(item => item.key))

  for (let index = order.length - 1; index >= 0; index -= 1) {
    if (!currentKeys.has(order[index])) order.splice(index, 1)
  }

  keyedItems.forEach(item => {
    if (!order.includes(item.key)) order.push(item.key)
  })

  const itemByKey = new Map(keyedItems.map(item => [item.key, item.item]))
  return order.map(key => itemByKey.get(key)).filter(Boolean)
}

function getStableLivePlayers(players = []) {
  return getStableItems(players, studentOrder, getStudentKey)
}

function getStableLeaders(leaders = []) {
  return getStableItems(leaders, leaderOrder, getLeaderStableKey)
}

function getSelectedStudentIndex() {
  return latestPlayers.findIndex((player, index) => getStudentKey(player, index) === selectedStudentId)
}

function ensureSelectedStudent(players = latestPlayers) {
  if (!players.length) {
    selectedStudentId = ""
    return
  }

  const hasSelectedStudent = players.some((player, index) => getStudentKey(player, index) === selectedStudentId)
  if (!hasSelectedStudent) selectedStudentId = getStudentKey(players[0], 0)
}

function updateLiveRowSelection() {
  liveRows.querySelectorAll("[data-student-id]").forEach(row => {
    const selected = row.dataset.studentId === selectedStudentId
    row.classList.toggle("selected-student-row", selected)
    row.setAttribute("aria-current", selected ? "true" : "false")
  })
}

function createStudentDetail(player, index, total) {
  if (!player) {
    return `<p class="student-detail-empty">Waiting for students to join this room.</p>`
  }

  const gameAnswerCards = createGameAnswerCards(player.gameAnswers)
  const learnAnswerCards = createLearnAnswerCards(player.learnAnswers)
  const answerCards = [gameAnswerCards, learnAnswerCards].filter(Boolean).join("")

  return `
    <article class="student-detail-card">
      <header>
        <div>
          <span class="student-detail-position">Student ${index + 1} of ${total}</span>
          <h3>${escapeHtml(player.name || "Player")}</h3>
        </div>
        <strong>${Number(player.score) || 0}</strong>
      </header>
      <div class="student-detail-stats">
        <span><b>Game</b>${escapeHtml(player.game || "Lobby")}</span>
        <span><b>Level</b>${escapeHtml(player.level || "-")}</span>
        <span><b>Streak</b>${Number(player.streak) || 0}</span>
        <span><b>Hints</b>${Number(player.hints) || 0}</span>
        <span><b>Badges</b>${Number(player.badges) || 0}/5</span>
      </div>
      ${answerCards || `<p class="student-detail-empty">No typed answers recorded yet.</p>`}
    </article>
  `
}

function renderStudentDetails() {
  if (!studentDetailBody) return

  ensureSelectedStudent()

  const total = latestPlayers.length
  const selectedIndex = getSelectedStudentIndex()
  const selectedPlayer = selectedIndex >= 0 ? latestPlayers[selectedIndex] : null

  studentDetailBody.innerHTML = createStudentDetail(selectedPlayer, Math.max(selectedIndex, 0), total)
  const countText = total ? `${selectedIndex + 1}/${total}` : "0/0"
  studentDetailCounts.forEach(count => {
    count.textContent = countText
  })

  const disableNav = total <= 1
  studentBackButtons.forEach(button => {
    button.disabled = disableNav
  })
  studentNextButtons.forEach(button => {
    button.disabled = disableNav
  })
  updateLiveRowSelection()
}

function selectStudentOffset(offset) {
  if (!latestPlayers.length) return

  const currentIndex = Math.max(0, getSelectedStudentIndex())
  const nextIndex = (currentIndex + offset + latestPlayers.length) % latestPlayers.length
  selectedStudentId = getStudentKey(latestPlayers[nextIndex], nextIndex)
  liveRows.innerHTML = createLiveRows(latestPlayers)
  renderStudentDetails()
}

function createLiveRows(players = []) {
  if (!players.length) {
    return `<tr><td class="empty-cell" colspan="8">Waiting for students to join this room.</td></tr>`
  }

  ensureSelectedStudent(players)
  const selectedIndex = Math.max(0, getSelectedStudentIndex())
  const player = players[selectedIndex] || players[0]
  const studentKey = getStudentKey(player, selectedIndex)

  return `
    <tr class="student-live-row selected-student-row" data-student-id="${escapeHtml(studentKey)}" tabindex="0" aria-current="true">
      <td class="rank-cell">${selectedIndex + 1}</td>
      <td>${escapeHtml(player.name || "Player")}</td>
      <td class="score-cell">${Number(player.score) || 0}</td>
      <td>${escapeHtml(player.game || "Lobby")}</td>
      <td>${escapeHtml(player.level || "-")}</td>
      <td>${Number(player.streak) || 0}</td>
      <td>${Number(player.hints) || 0}</td>
      <td>${Number(player.badges) || 0}/5</td>
    </tr>
  `
}

function createTopRows(leaders = []) {
  if (!leaders.length) {
    return `<tr><td class="empty-cell" colspan="6">No student has earned a score yet.</td></tr>`
  }

  return leaders.map((player, index) => `
    <tr>
      <td class="rank-cell">${index + 1}</td>
      <td>${escapeHtml(player.name || "Player")}</td>
      <td class="score-cell">${Number(player.score) || 0}</td>
      <td>${escapeHtml(player.game || "Lobby")}</td>
      <td>${escapeHtml(player.level || "-")}</td>
      <td>${Number(player.badges) || 0}/5</td>
    </tr>
  `).join("")
}

function setStatus(connected, message) {
  connectionStatus.textContent = message
  connectionStatus.classList.toggle("connected", connected)
  connectionStatus.classList.toggle("offline", !connected)
}

function renderScoreboard(data) {
  const players = Array.isArray(data.players) ? data.players : []
  const leaders = Array.isArray(data.leaders) ? data.leaders : []

  latestPlayers = getStableLivePlayers(players)
  const stableLeaders = getStableLeaders(leaders)
  ensureSelectedStudent(latestPlayers)

  liveRows.innerHTML = createLiveRows(latestPlayers)
  topRows.innerHTML = createTopRows(stableLeaders)
  liveCount.textContent = `${players.length} live`
  topCount.textContent = `Top ${leaders.length}`
  lastUpdated.textContent = `Last update: ${new Date().toLocaleTimeString()}`
  setStatus(true, `Connected to room ${data.roomCode || roomCode}`)
  renderStudentDetails()
}

function fetchScores() {
  return fetch(getRoomUrl(), { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Scoreboard server not available.")
      return response.json()
    })
    .then(renderScoreboard)
    .catch(() => {
      const message = isNetlifyFunctionApi()
        ? "Not connected. Redeploy Netlify with the new classroom function files."
        : "Not connected. Open this page from the classroom server link."
      setStatus(false, message)
    })
}

function connectEvents() {
  const eventsUrl = getEventsUrl()
  if (!window.EventSource || !eventsUrl) return
  if (eventSource) eventSource.close()

  eventSource = new EventSource(eventsUrl)

  eventSource.addEventListener("scoreboard", event => {
    try {
      renderScoreboard(JSON.parse(event.data))
    } catch {
      setStatus(false, "Scoreboard update failed. Retrying...")
    }
  })

  eventSource.onerror = () => {
    setStatus(false, "Live connection retrying. Backup refresh is still running.")
  }
}

function startScoreboard() {
  updateRoomUi()
  fetchScores()
  connectEvents()
  clearInterval(pollTimer)
  pollTimer = setInterval(fetchScores, 2000)
}

roomButton.addEventListener("click", () => {
  const nextRoom = normalizeRoom(roomInput.value)
  const url = new URL(window.location.pathname, window.location.origin)
  url.searchParams.set("room", nextRoom)

  if (shouldShareApiParam()) {
    url.searchParams.set("api", classroomApiBase)
  }

  window.location.href = url.href
})

roomInput.addEventListener("keydown", event => {
  if (event.key === "Enter") roomButton.click()
})

copyLinkButton.addEventListener("click", () => {
  const text = getStudentUrl()

  navigator.clipboard?.writeText(text)
    .then(() => {
      copyLinkButton.textContent = "Copied"
      setTimeout(() => {
        copyLinkButton.textContent = "Copy"
      }, 1200)
    })
    .catch(() => {
      window.prompt("Student link:", text)
    })
})


studentBackButtons.forEach(button => {
  button.addEventListener("click", () => selectStudentOffset(-1))
})
studentNextButtons.forEach(button => {
  button.addEventListener("click", () => selectStudentOffset(1))
})

liveRows.addEventListener("click", event => {
  const row = event.target.closest("[data-student-id]")
  if (!row) return

  selectedStudentId = row.dataset.studentId
  renderStudentDetails()
})

liveRows.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return

  const row = event.target.closest("[data-student-id]")
  if (!row) return

  event.preventDefault()
  selectedStudentId = row.dataset.studentId
  renderStudentDetails()
})
startScoreboard()



