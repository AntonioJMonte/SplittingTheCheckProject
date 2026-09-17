// Dedicated schema: integration tests truncate tables, so they must never point at "public".
export const INTEGRATION_SCHEMA = 'integration_test'

export const INTEGRATION_DATABASE_URL = process.env.DATABASE_URL_INTEGRATION
    ?? `postgresql://splittr:splittr@localhost:5432/splittr_db?schema=${INTEGRATION_SCHEMA}`
