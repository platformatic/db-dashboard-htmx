import { platformaticDB as db } from '@platformatic/db'
import esMain from 'es-main'

const { schema: baseSchema } = db

export const schema = structuredClone(baseSchema)

schema.$id = 'https://raw.githubusercontent.com/platformatic/db-dashboard-htmx/main/schemas/0.json'
schema.title = 'Platformatic DB Dashboard'

// Needed to allow module loading
schema.properties.module = {
  type: 'string'
}

delete schema.properties.db.properties.openapi
delete schema.properties.db.properties.graphql

if (esMain(import.meta)) {
  console.log(JSON.stringify(schema, null, 2))
}
