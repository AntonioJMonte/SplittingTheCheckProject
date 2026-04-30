import { app } from './infra/http/app'
import { env } from './infra/env'

async function start() {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
