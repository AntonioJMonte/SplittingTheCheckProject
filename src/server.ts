import { app } from './infra/http/app'
import { env } from './infra/env'
import { logger } from './infra/logger/logger'
import { createSocketServer } from './infra/websocket/socket-server'

async function start() {
  if (!env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY ausente: a categorização usará apenas regras e cache, com fallback "Outros"')
  }

  try {
    await app.ready()
    createSocketServer(app.server)
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
