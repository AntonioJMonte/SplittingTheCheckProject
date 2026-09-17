import { execSync } from 'node:child_process'
import { INTEGRATION_DATABASE_URL, INTEGRATION_SCHEMA } from './integration-database-url'

export default function setup() {
    if (!INTEGRATION_DATABASE_URL.includes(`schema=${INTEGRATION_SCHEMA}`)) {
        throw new Error(`DATABASE_URL_INTEGRATION precisa usar ?schema=${INTEGRATION_SCHEMA}`)
    }

    execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: INTEGRATION_DATABASE_URL },
    })
}
