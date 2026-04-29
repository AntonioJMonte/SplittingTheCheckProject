import { buildApp } from './infra/http/app.js'
import { env } from './infra/env/index.js'

const app = buildApp()

async function start() {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
