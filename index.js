import { platformaticDB, buildServer as buildDBServer } from '@platformatic/db'
import autoload from '@fastify/autoload'
import { schema } from './lib/schema.js'
import { join } from 'node:path'
import * as desm from 'desm'

const pluginsDir = desm.join(import.meta.url, 'plugins')
const routesDir = desm.join(import.meta.url, 'routes')

export default async function dbDashboard (app, opts) {
  app.register(autoload, {
    dir: pluginsDir,
    encapsulate: false
  })

  app.register(autoload, {
    dir: routesDir,
    encapsulate: true
  })

  await platformaticDB(app, opts)
}

export async function buildServer (opts) {
  return buildDBServer(opts, dbDashboard)
}

// break Fastify encapsulation
dbDashboard[Symbol.for('skip-override')] = true
dbDashboard.configType = 'db-dashboard'

// This is the schema for this reusable application configuration file,
// customize at will but retain the base properties of the schema from
// @platformatic/service
dbDashboard.schema = schema

async function isDirectory (path) {
  try {
    return (await lstat(path)).isDirectory()
  } catch {
    return false
  }
}

// The configuration of the ConfigManager
dbDashboard.configManagerConfig = {
  schema,
  envWhitelist: ['PORT', 'HOSTNAME', 'WATCH', 'DATABASE_URL'],
  allowToWatch: ['.env'],
  schemaOptions: {
    useDefaults: true,
    coerceTypes: true,
    allErrors: true,
    strict: false
  },
  async transformConfig () {
    // Call the transformConfig method from the base stackable
    platformaticDB.configManagerConfig.transformConfig.call(this)
  }
}
