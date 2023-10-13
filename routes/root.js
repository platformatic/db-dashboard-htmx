import tags from 'common-tags'

/** @param {import('fastify').FastifyInstance} fastify */
export default async function (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    return reply.html`
      <section>
        <header>
          <h1>Welcome to Platformatic DB Dashboard</h2>
        </header>
      </section>
    `
  })

  let tables

  // We must defer this because Platformatic DB is loaded after the plugin
  fastify.addHook('onReady', async () => {
    tables = Object.values(fastify.platformatic.entities).reduce((acc, entity) => {
      acc[entity.table] = entity
      return acc
    }, {})
  })

  fastify.get('/tables/:table', {
    schema: {
      params: {
        type: 'object',
        properties: {
          table: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          offset: {
            type: 'integer',
            default: 0
          },
          limit: {
            type: 'integer',
            default: 10
          }
        },
        required: ['offset', 'limit']
      }
    }
  }, async (request, reply) => {
    const table = request.params.table
    if (!tables[table]) {
      reply.callNotFound()
      return
    }
    const { offset, limit } = request.query
    const entity = tables[table]
    const columns = Object.keys(entity.fields)

    const [count, rows] = await Promise.all([
      entity.count(),
      entity.find({ offset, limit })
    ])

    let previous = ''
    const previousOffset = offset - limit
    if (previousOffset >= 0) {
      previous= tags.html`
        <a href="/tables/${table}?offset=${Math.max(0, offset - limit)}&limit=${limit}">&lt;&lt;</a>
      `
    }
    const nextOffset = offset + limit
    let next = ''
    if (nextOffset < count) {
      next = tags.html`
        <a href="/tables/${table}?offset=${offset + limit}&limit=${limit}">&gt;&gt;</a>
      `
    }

    return reply.html`
      <section>
        <header>
          <h2>${table}</h2>
        </header>
      </section>
      <section>
        <table>
          <thead>
            ${columns.map(column => tags.html`<th>${column}</th>`)}
          </thead>
          <tbody>
            ${rows.map(row => tags.html`
              <tr>
                ${columns.map((column) => tags.html`
                  <td>${row[entity.fields[column].camelcase]}</td>
                `)}
              </th>
            `)}
            <tr>
              <td colspan="${columns.length}" style="text-align: center">
                ${previous}&nbsp;${offset} - ${offset + rows.length} of ${count}&nbsp;${next}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    `
  })
}
