import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { syncRoute } from './routes/sync'
import { timetableRoute } from './routes/timetable'
import type { AppEnv } from './types/env'

const app = new Hono<AppEnv>()

app.use('*', cors())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/api/timetable', timetableRoute)
app.route('/api/sync', syncRoute)

export default app
