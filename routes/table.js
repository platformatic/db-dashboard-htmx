import tags from 'common-tags'

function link (table) {
  return tags.html`<a hx-swap="innerHTML" hx-target="#content" hx-get="/tables/${table}" hx-trigger="click" href="/tables/${table}" hx-push-url="true">${table}</a>`
}

/** @param {import('fastify').FastifyInstance} fastify */
export default async function (fastify, opts) {
  let tables

  // We must defer this because Platformatic DB is loaded after the plugin
  fastify.addHook('onReady', async () => {
    tables = Object.values(fastify.platformatic.entities).reduce((acc, entity) => {
      acc[entity.table] = entity
      return acc
    }, {})
  })

  fastify.decorateRequest('table', null)

  // All the routes in this plugin are encapsulated
  // with a :table param that is validated here
  fastify.addHook('onRequest', async (request, reply) => {
    request.table = request.params.table
    if (!tables[request.table]) {
      reply.callNotFound()
      return
    }
  })

  function getPrimaryKey (entity) {
    // TODO support systems with multiple primary keys
    const primaryKey = Object.keys(entity.fields).reduce((acc, field) => {
      if (acc) {
        return acc
      }

      if (entity.fields[field].primaryKey) {
        return field
      }
    }, '')

    return primaryKey
  }

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
    const { table } = request
    const { offset, limit } = request.query
    const entity = tables[table]
    const columns = Object.keys(entity.fields)

    const primaryKey = getPrimaryKey(entity)

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
        ${Object.values(tables).map(table => {

          if (table.table === request.table) {
            return tags.html`
              <u>${table.table}</u>
            `
          } else {
            return tags.html`
              ${link(table.table)}
            `}
          }
        )}
      </section>
      <section>
        <table>
          <thead>
            ${columns.map(column => tags.html`<th>${column}</th>`)}
            <th></th>
          </thead>
          <tbody>
            ${rows.map(row => tags.html`
              <tr>
                ${columns.map((column) => {
                  const field = entity.fields[column]
                  const value = row[field.camelcase]
                  if (field.foreignKey) {
                    const relation = entity.relations.find(relation => relation.column_name === column)
                    const foreignTable = relation.foreign_table_name
                    return tags.html`
                      <td><a 
                          href="/tables/${foreignTable}/${value}"
                          hx-get="/tables/${foreignTable}/${value}"
                          hx-trigger="click"
                          hx-target="#content"
                          hx-swap="innerHTML"
                          hx-push-url="true"
                        >${value}</a></td>
                    `
                  } else {
                    return tags.html`
                      <td>${value}</td>
                    `
                  }
                })}
              </th>
              <td>
                <a 
                  href="/tables/${table}/${row[primaryKey]}"
                  hx-get="/tables/${table}/${row[primaryKey]}"
                  hx-trigger="click"
                  hx-target="#content"
                  hx-swap="innerHTML"
                  hx-push-url="true"
                >Edit</a>

                <a 
                  hx-delete="/tables/${table}/${row[primaryKey]}"
                  hx-trigger="click"
                  hx-target="#content"
                  hx-swap="innerHTML"
                  hx-disabled-elt="this"
                  role="button"
                >Delete</a>
              </td>
            `)}
            <tr>
              <td colspan="${columns.length + 1}" style="text-align: center">
                ${previous}&nbsp;${offset} - ${offset + rows.length} of ${count}&nbsp;${next}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <a href="/tables/${table}/new">Add a new entry in ${table}</a>
      </section>
    `
  })

  function renderForm (table, row, reply, title, button) {
    const entity = tables[table]
    const columns = Object.keys(entity.fields)

    return reply.html`
      <section>
        <header>
          <h3>${title}</h3>
        </header>
      </section>
      <section>
        <form method="POST">
          ${columns.map(column => {

            return tags.html`
              <input
                type="${sqlTypeToInputBox(entity.fields[column].sqlType)}"
                name="${column}"
                placeholder="${column}"
                value="${row ? row[entity.fields[column].camelcase] : ''}"
                />
            `
          })}
          <button type="submit"
            hx-post="/tables/${table}"
            hx-trigger="click"
            hx-target="#content"
            hx-swap="innerHTML"
            hx-push-url="true"
            hx-disabled-elt="this"
            >${button}</button>
        </form>
      </section>
    `
  }

  fastify.get('/tables/:table/new', (request, reply) => {
    return renderForm(request.table, null, reply, `Add a new entry to "${request.table}"`, 'Create')
  })

  fastify.get('/tables/:table/:id', async (request, reply) => {
    const { table } = request
    const { id } = request.params
    const entity = tables[table]

    const primaryKey = Object.keys(entity.fields).reduce((acc, field) => {
      if (acc) {
        return acc
      }

      if (entity.fields[field].primaryKey) {
        return field
      }
    }, '')

    const row = await entity.find({ where: { [primaryKey]: { eq: id } } })

    if (!row.length) {
      reply.callNotFound()
      return
    }

    return renderForm(request.table, row[0], reply, `Edit to "${request.table}" with id ${row[0].id}`, 'Save')
  })

  // TODO add schema validation for the entity
  fastify.post('/tables/:table', {
  }, async (request, reply) => {
    const { table } = request
    const entity = tables[table]
    const columns = Object.keys(entity.fields)

    const row = {}
    for (const column of columns) {
      row[column] = request.body[column] || undefined
    }

    await entity.save({ input: row })

    reply.status(204)
    reply.header('hx-location', JSON.stringify({
      path: `/tables/${table}`,
      swap: 'innerHTML',
      target: '#' + request.headers['hx-target']
    }))
    return
  })

  // TODO add schema validation for the entity
  fastify.delete('/tables/:table/:id', {
  }, async (request, reply) => {
    const { table } = request
    const entity = tables[table]
    const primaryKey = getPrimaryKey(entity)

    await entity.delete({ where: { [primaryKey]: { eq: request.params.id } } })

    request.log.info({ headers: request.headers }, 'headers')
    reply.status(204)
    reply.header('hx-location', JSON.stringify({
      path: `/tables/${table}`,
      swap: 'innerHTML',
      target: '#' + request.headers['hx-target']
    }))
    return 
  })
}

function sqlTypeToInputBox (type) {
  switch (type) {
    case 'string':
      return 'text'
    case 'integer':
    case 'real':
    case 'number':
      return 'number'
    case 'boolean':
      return 'checkbox'
    default:
      return 'text'
  }
}
