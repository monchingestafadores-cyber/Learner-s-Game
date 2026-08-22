const { getStore } = require("@netlify/blobs")

const stalePlayerMs = 1000 * 60 * 20
const highScoreLimit = 10

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8"
}

function normalizeRoomCode(value = "CLASS") {
  const clean = String(value || "CLASS")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16)

  return clean || "CLASS"
}

function sanitizeText(value, maxLength = 40, fallback = "") {
  const clean = String(value || fallback)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return clean.slice(0, maxLength) || fallback
}

function sanitizeNumber(value, min = 0, max = 999999) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.max(min, Math.min(max, Math.round(number)))
}

function sanitizeLearnAnswers(value) {
  if (!Array.isArray(value)) return []

  return value
    .slice(0, 20)
    .map((answer, index) => {
      const safeAnswer = answer && typeof answer === "object" ? answer : {}

      return {
        id: sanitizeText(safeAnswer.id, 80, `learn-${index}`),
        title: sanitizeText(safeAnswer.title, 80, "Learning Response"),
        prompt: sanitizeText(safeAnswer.prompt, 160, "Student response"),
        answer: sanitizeText(safeAnswer.answer, 700, ""),
        updatedAt: sanitizeNumber(safeAnswer.updatedAt, 0, Date.now())
      }
    })
    .filter(answer => answer.answer)
}

function getLeaderKey(name) {
  return sanitizeText(name, 16, "Player").toLowerCase()
}

function getRoomLeaders(room) {
  return Object.values(room.leaders || {})
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.badges !== a.badges) return b.badges - a.badges
      return a.name.localeCompare(b.name)
    })
    .slice(0, highScoreLimit)
}

function getRoomSnapshot(roomCode, room) {
  const now = Date.now()
  const playersMap = room.players || {}

  for (const [clientId, player] of Object.entries(playersMap)) {
    if (now - player.updatedAt > stalePlayerMs) {
      delete playersMap[clientId]
    }
  }

  const players = Object.values(playersMap)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.badges !== a.badges) return b.badges - a.badges
      return a.name.localeCompare(b.name)
    })
    .slice(0, 50)

  return {
    roomCode,
    playerCount: players.length,
    players,
    leaders: getRoomLeaders(room)
  }
}

async function readRoom(store, roomCode) {
  const room = await store.get(`room-${roomCode}.json`, { type: "json" })

  return room && typeof room === "object"
    ? { players: room.players || {}, leaders: room.leaders || {} }
    : { players: {}, leaders: {} }
}

async function writeRoom(store, roomCode, room) {
  await store.setJSON(`room-${roomCode}.json`, room)
}

function updateLeader(room, player) {
  if (!player.name || player.score <= 0) return

  const key = getLeaderKey(player.name)
  const existing = room.leaders[key]
  const shouldReplace = !existing
    || player.score > existing.score
    || (player.score === existing.score && player.badges > existing.badges)

  if (!shouldReplace) return

  room.leaders[key] = {
    name: player.name,
    score: player.score,
    badges: player.badges,
    game: player.game,
    level: player.level,
    updatedAt: player.updatedAt
  }

  room.leaders = Object.fromEntries(
    getRoomLeaders(room).map(leader => [getLeaderKey(leader.name), leader])
  )
}

exports.handler = async event => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" }
  }

  const store = getStore("metaphoria-classrooms")

  try {
    if (event.httpMethod === "GET") {
      const roomCode = normalizeRoomCode(event.queryStringParameters?.room)
      const room = await readRoom(store, roomCode)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(getRoomSnapshot(roomCode, room))
      }
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}")
      const roomCode = normalizeRoomCode(body.roomCode)
      const room = await readRoom(store, roomCode)
      const clientId = sanitizeText(body.clientId, 80, `guest-${Date.now()}`)
      const previous = room.players[clientId] || {}
      const now = Date.now()
      const player = {
        clientId,
        name: sanitizeText(body.name, 16, previous.name || "Player"),
        score: sanitizeNumber(body.score),
        streak: sanitizeNumber(body.streak, 0, 999),
        hints: sanitizeNumber(body.hints, 0, 999),
        badges: sanitizeNumber(body.badges, 0, 5),
        game: sanitizeText(body.game, 32, previous.game || "Lobby"),
        level: sanitizeText(body.level, 18, previous.level || ""),
        status: sanitizeText(body.status, 36, previous.status || "Playing"),
        learnAnswers: sanitizeLearnAnswers(body.learnAnswers || previous.learnAnswers || []),
        updatedAt: now
      }

      room.players[clientId] = player
      updateLeader(room, player)
      await writeRoom(store, roomCode, room)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(getRoomSnapshot(roomCode, room))
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed." })
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Classroom API failed.", details: error.message })
    }
  }
}
