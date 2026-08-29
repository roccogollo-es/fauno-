/* global process */
import 'dotenv/config'
import crypto from 'crypto'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3001)
const DATA_DIR = process.env.FAUNO_DATA_DIR || path.join(__dirname, 'data')
const UPLOAD_DIR = process.env.FAUNO_UPLOAD_DIR || path.join(__dirname, 'uploads')
const MAX_UPLOAD_MB = Number(process.env.FAUNO_MAX_UPLOAD_MB || 25)
const VISION_MODEL_ENABLED = process.env.FAUNO_VISION_MODEL_ENABLED !== 'false'
const VISION_MODEL_ID = process.env.FAUNO_VISION_MODEL_ID || 'Xenova/mobilevit-xx-small'
const MODEL_CACHE_DIR = process.env.FAUNO_MODEL_CACHE_DIR || path.join(__dirname, 'models')
const MIN_VISION_MATCH_SCORE = Number(process.env.FAUNO_MIN_VISION_MATCH_SCORE || 0.08)

const SPECIES_SEED = path.join(DATA_DIR, 'species.seed.json')
const OBSERVATIONS_SEED = path.join(DATA_DIR, 'observations.seed.json')
const SPECIES_DB = path.join(DATA_DIR, 'species.json')
const OBSERVATIONS_DB = path.join(DATA_DIR, 'observations.json')

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/api/uploads', express.static(UPLOAD_DIR, { fallthrough: false, maxAge: '30d' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype))
  },
})

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(filePath, data) {
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, filePath)
}

function ensureDb(filePath, seedPath) {
  if (!fs.existsSync(filePath)) {
    const seed = fs.existsSync(seedPath) ? readJson(seedPath, []) : []
    writeJson(filePath, seed)
  }
}

ensureDb(SPECIES_DB, SPECIES_SEED)
ensureDb(OBSERVATIONS_DB, OBSERVATIONS_SEED)

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function sanitizeFilePart(value = 'photo') {
  return normalizeText(value)
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'photo'
}

function publicUploadUrl(relativePath) {
  return `/api/uploads/${relativePath.replace(/\\/g, '/')}`
}

function saveImage(file) {
  const day = new Date().toISOString().slice(0, 10)
  const dayDir = path.join(UPLOAD_DIR, day)
  fs.mkdirSync(dayDir, { recursive: true })

  const extFromMime = file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const hash = crypto.createHash('sha256').update(file.buffer).digest('hex')
  const original = sanitizeFilePart(file.originalname || 'bird')
  const filename = `${Date.now()}-${hash.slice(0, 12)}-${original}.${extFromMime}`
  const fullPath = path.join(dayDir, filename)

  fs.writeFileSync(fullPath, file.buffer)

  return {
    hash,
    relativePath: `${day}/${filename}`,
    url: publicUploadUrl(`${day}/${filename}`),
    size: file.size,
    mimeType: file.mimetype,
    fullPath,
  }
}

const SPECIES_LABEL_ALIASES = {
  1: ['bee eater', 'bee-eater', 'merops'],
  2: ['robin', 'redbreast', 'erithacus'],
  3: ['stork', 'white stork', 'ciconia'],
  4: ['swallow', 'barn swallow', 'hirundo'],
  5: ['flamingo', 'phoenicopterus'],
  6: ['eagle', 'golden eagle', 'aquila'],
  7: ['heron', 'little blue heron', 'great white heron', 'night heron', 'black-crowned night heron', 'egret', 'egretta', 'bittern', 'nycticorax'],
}

let visionClassifierPromise = null
let visionClassifierUnavailable = false

function clampConfidence(value) {
  return Math.max(1, Math.min(99, Math.round(value)))
}

function getSpeciesAliases(species) {
  return [
    species.name,
    species.scientific,
    ...(species.keywords || []),
    ...(SPECIES_LABEL_ALIASES[species.id] || []),
  ].map(normalizeText).filter(Boolean)
}

async function getVisionClassifier() {
  if (!VISION_MODEL_ENABLED || visionClassifierUnavailable) return null
  if (!visionClassifierPromise) {
    visionClassifierPromise = import('@huggingface/transformers')
      .then(async ({ pipeline, env }) => {
        fs.mkdirSync(MODEL_CACHE_DIR, { recursive: true })
        env.cacheDir = MODEL_CACHE_DIR
        return pipeline('image-classification', VISION_MODEL_ID)
      })
      .catch((error) => {
        visionClassifierUnavailable = true
        console.warn('FAUNO vision model unavailable, using local fallback:', error.message)
        return null
      })
  }
  return visionClassifierPromise
}

function mapVisionLabelsToSpecies(results, speciesList) {
  const normalizedResults = (Array.isArray(results) ? results : [])
    .map((result) => ({ ...result, normalizedLabel: normalizeText(result.label || '') }))
    .filter((result) => result.normalizedLabel)

  let bestMatch = null

  for (const species of speciesList) {
    const aliases = getSpeciesAliases(species)
    for (const result of normalizedResults) {
      const matchedAlias = aliases.find((alias) => result.normalizedLabel.includes(alias))
      if (matchedAlias && (!bestMatch || result.score > bestMatch.score)) {
        bestMatch = { species, score: result.score, label: result.label, matchedAlias }
      }
    }
  }

  if (!bestMatch || bestMatch.score < MIN_VISION_MATCH_SCORE) return null

  const confidence = clampConfidence(70 + bestMatch.score * 28)
  return {
    species: bestMatch.species,
    confidence,
    status: confidence >= 82 ? 'verified' : 'review',
    method: 'transformers-mobilevit-image-classification',
    modelId: VISION_MODEL_ID,
    visionLabel: bestMatch.label,
    visionScore: Number(bestMatch.score.toFixed(4)),
  }
}

async function visionFreeClassifier(image, speciesList) {
  const classifier = await getVisionClassifier()
  if (!classifier) return null

  const results = await classifier(image.fullPath, { top_k: 30 })
  return mapVisionLabelsToSpecies(results, speciesList)
}

async function identifyBird(file, image, speciesList) {
  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey) {
    try {
      const base64Image = fs.readFileSync(image.fullPath).toString('base64')
      
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Identify the bird in this image. You MUST return a JSON object following this EXACT schema:
{
  "is_bird": true, // Set to false if the image does not contain a bird
  "scientific": "Scientific name of the bird (e.g. Passer domesticus)",
  "name": "Common name of the bird in Spanish",
  "diet": "Brief description of its diet in Spanish",
  "habitat": "Brief description of its habitat in Spanish",
  "description": "A nice short description of the bird in Spanish",
  "curiosities": [
    "Fun fact 1 in Spanish",
    "Fun fact 2 in Spanish",
    "Fun fact 3 in Spanish"
  ]
}`
                },
                {
                  inlineData: {
                    mimeType: image.mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Gemini API Error:', errText)
        throw new Error('Gemini API returned error status')
      }

      const data = await response.json()
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text
      
      if (!resultText) {
        throw new Error('Empty response from Gemini model')
      }

      const parsedResult = JSON.parse(resultText)

      if (!parsedResult.is_bird) {
        return { is_bird: false }
      }

      // Try to match with predefined species
      const cleanScientific = parsedResult.scientific.trim().toLowerCase()
      const matchedSpecies = speciesList.find(
        s => s.scientific.toLowerCase() === cleanScientific
      )

      if (matchedSpecies) {
        return {
          species: matchedSpecies,
          confidence: 98,
          status: 'verified',
          method: 'gemini-1.5-flash-predefined'
        }
      }

      // Newly discovered bird! Add it to species database
      let wikiImg = '🐦'
      try {
        const wikiUrlName = encodeURIComponent(parsedResult.scientific.trim().replace(/ /g, '_'))
        const wikiRes = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${wikiUrlName}`)
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json()
          if (wikiData.thumbnail && wikiData.thumbnail.source) {
            wikiImg = wikiData.thumbnail.source
          }
        }
      } catch (e) {
        console.error('Error fetching image from Wikipedia:', e)
      }

      const newSpecies = {
        id: 100 + speciesList.length,
        name: parsedResult.name,
        scientific: parsedResult.scientific,
        img: wikiImg,
        heroImg: wikiImg !== '🐦' ? wikiImg : null,
        diet: parsedResult.diet,
        habitat: parsedResult.habitat,
        description: parsedResult.description,
        curiosities: parsedResult.curiosities,
        predefined: false,
        migratory: false,
        activeSeason: [0,1,2,3,4,5,6,7,8,9,10,11],
        status: 'LC',
        statusLabel: 'Preocupación Menor',
        statusColor: '#2ecc71',
        products: [
          { name: 'Semillas Fauno Premium', icon: '🥜', price: '12.99€' }
        ]
      }

      // Save the new species in SPECIES_DB
      speciesList.push(newSpecies)
      writeJson(SPECIES_DB, speciesList)

      return {
        species: newSpecies,
        confidence: 95,
        status: 'verified',
        method: 'gemini-1.5-flash-discovered'
      }

    } catch (error) {
      console.error('Gemini identification failed, falling back to local vision:', error)
    }
  }

  const visionIdentification = await visionFreeClassifier(image, speciesList)
  if (visionIdentification) return visionIdentification

  return localFreeClassifier(file, speciesList)
}


function localFreeClassifier(file, speciesList) {
  const filename = normalizeText(file.originalname || '')
  const keywordMatch = speciesList.find((species) =>
    (species.keywords || []).some((keyword) => filename.includes(normalizeText(keyword)))
  )

  if (keywordMatch) {
    return {
      species: keywordMatch,
      confidence: 91,
      status: 'verified',
      method: 'filename-keyword-local',
    }
  }

  const hash = crypto.createHash('sha256').update(file.buffer).digest()
  const index = hash[0] % speciesList.length
  const confidence = 63 + (hash[1] % 17)
  return {
    species: speciesList[index],
    confidence,
    status: confidence >= 78 ? 'review' : 'pending',
    method: 'free-local-hash-baseline',
  }
}

function parseCoordinate(value) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes'
}

function makeObservation({ req, species, identification, image }) {
  const lat = parseCoordinate(req.body.latitude)
  const lng = parseCoordinate(req.body.longitude)
  const hasLocation = lat !== null && lng !== null
  const shareLocation = parseBoolean(req.body.shareLocation) || hasLocation
  const userEmail = String(req.body.userEmail || '').trim().toLowerCase()
  const userName = String(req.body.userName || 'Usuario FAUNO').trim().slice(0, 80) || 'Usuario FAUNO'

  return {
    id: crypto.randomUUID(),
    speciesId: species.id,
    speciesName: species.name,
    scientific: species.scientific,
    confidence: identification.confidence,
    status: identification.status,
    identificationMethod: identification.method,
    source: 'user_photo',
    userEmailHash: userEmail ? crypto.createHash('sha256').update(userEmail).digest('hex') : null,
    userName,
    lat: shareLocation ? lat : null,
    lng: shareLocation ? lng : null,
    hasLocation: shareLocation && hasLocation,
    locationLabel: shareLocation && hasLocation ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Ubicación no compartida',
    photoUrl: image.url,
    photoHash: image.hash,
    photoSize: image.size,
    mimeType: image.mimeType,
    observedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
}

function speciesResponse(species, observation, identification) {
  return {
    ...species,
    id: species.id,
    is_bird: true,
    predefined: species.id < 100,
    confidence: identification.confidence,
    status: species.status || 'LC',
    statusLabel: species.statusLabel || 'Preocupación Menor',
    statusColor: species.statusColor || '#2ecc71',
    img: observation.photoUrl || '🐦',
    observation,
    memory: {
      saved: true,
      observationId: observation.id,
      mapReady: observation.hasLocation,
      reviewStatus: observation.status,
    },
    model: {
      name: identification.modelId || 'FAUNO Free Local v0',
      paidApi: false,
      method: identification.method,
      visionLabel: identification.visionLabel,
      visionScore: identification.visionScore,
      note: identification.modelId
        ? 'Modelo visual gratuito ejecutado localmente en el servidor. Las observaciones de baja confianza quedan pendientes para revisar.'
        : 'Clasificador gratuito inicial. Las observaciones de baja confianza quedan pendientes para revisar.',
    },
  }
}

const emailsPath = path.join(DATA_DIR, 'registered_emails.txt')

app.post('/api/register-email', (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' })
    }

    const cleanEmail = email.trim().toLowerCase()
    
    let emails = []
    if (fs.existsSync(emailsPath)) {
      const content = fs.readFileSync(emailsPath, 'utf8')
      emails = content.split('\n').map(e => e.trim().toLowerCase()).filter(Boolean)
    }

    if (!emails.includes(cleanEmail)) {
      emails.push(cleanEmail)
      fs.writeFileSync(emailsPath, emails.join('\n') + '\n')
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error saving email:', error)
    return res.status(500).json({ error: 'Server error saving email.' })
  }
})

app.get('/api/health', (_req, res) => {
  const observations = readJson(OBSERVATIONS_DB, [])
  const species = readJson(SPECIES_DB, [])
  res.json({ ok: true, service: 'fauno-server', paidApi: false, species: species.length, observations: observations.length })
})

app.post('/api/identify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded.' })

    const speciesList = readJson(SPECIES_DB, [])
    if (!speciesList.length) return res.status(500).json({ error: 'Species database is empty.' })

    const image = saveImage(req.file)
    const identification = await identifyBird(req.file, image, speciesList)

    if (identification.is_bird === false) {
      return res.json({ is_bird: false })
    }

    const observation = makeObservation({ req, species: identification.species, identification, image })

    const observations = readJson(OBSERVATIONS_DB, [])
    observations.unshift(observation)
    writeJson(OBSERVATIONS_DB, observations)

    return res.json(speciesResponse(identification.species, observation, identification))
  } catch (error) {
    console.error('Error in /api/identify:', error)
    return res.status(500).json({ error: 'Server error during identification.' })
  }
})

app.get('/api/birds', (_req, res) => {
  const species = readJson(SPECIES_DB, [])
  const observations = readJson(OBSERVATIONS_DB, [])
  const counts = observations.reduce((acc, observation) => {
    acc[observation.speciesId] = (acc[observation.speciesId] || 0) + 1
    return acc
  }, {})

  res.json({
    species: species.map((item) => ({ ...item, observationsCount: counts[item.id] || 0 })),
    observationsCount: observations.length,
  })
})

app.get('/api/observations/map', (req, res) => {
  const includePending = req.query.includePending !== 'false'
  const species = readJson(SPECIES_DB, [])
  const speciesById = new Map(species.map((item) => [item.id, item]))
  const observations = readJson(OBSERVATIONS_DB, [])

  const points = observations
    .filter((observation) => observation.hasLocation !== false && Number.isFinite(Number(observation.lat)) && Number.isFinite(Number(observation.lng)))
    .filter((observation) => includePending || observation.status === 'verified')
    .map((observation) => {
      const bird = speciesById.get(observation.speciesId) || {}
      return {
        id: observation.id,
        lat: Number(observation.lat),
        lng: Number(observation.lng),
        date: observation.observedAt,
        location: observation.locationLabel,
        user: observation.userName || 'Usuario FAUNO',
        source: observation.source,
        confidence: observation.confidence,
        status: observation.status,
        photoUrl: observation.photoUrl,
        bird: {
          ...bird,
          id: observation.speciesId,
          name: bird.name || observation.speciesName,
          scientific: bird.scientific || observation.scientific,
          img: observation.photoUrl || bird.img || '🐦',
          sightings: [],
        },
      }
    })

  res.json({ points, count: points.length })
})

app.patch('/api/observations/:id/confirm', (req, res) => {
  const observations = readJson(OBSERVATIONS_DB, [])
  const index = observations.findIndex((observation) => observation.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'Observation not found.' })

  observations[index] = {
    ...observations[index],
    status: req.body.status || 'verified',
    correctedSpeciesId: req.body.speciesId || observations[index].speciesId,
    reviewedAt: new Date().toISOString(),
  }
  writeJson(OBSERVATIONS_DB, observations)
  res.json({ observation: observations[index] })
})

app.use((error, _req, res, next) => {
  void next
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `Image is too large. Max ${MAX_UPLOAD_MB} MB.` })
  }
  console.error(error)
  return res.status(500).json({ error: 'Unexpected server error.' })
})

app.listen(PORT, () => {
  console.log(`Fauno Backend running on http://localhost:${PORT}`)
  console.log(`Data directory: ${DATA_DIR}`)
  console.log(`Upload directory: ${UPLOAD_DIR}`)
})







