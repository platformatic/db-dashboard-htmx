import html from 'fastify-html'
import fastifyStatic from '@fastify/static'
import { join } from 'desm'
import tags from 'common-tags'

function link (table) {
  return tags.html`<a hx-swap="outerHTML" hx-target="#content" hx-get="/tables/${table}" hx-trigger="click" href="/tables/${table}" hx-push-url="true">${table}</a>`
}

export default async function (fastify, opts) {
  await fastify.register(html)

  fastify.addLayout(function (inner, reply) {
    const entities = fastify.platformatic.entities
    const tables = Object.values(entities).map(({ table }) => table)

    return fastify.tags.html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <script src="/static/htmx.js"></script>
        <link rel="stylesheet" href="/static/mvp.css">
      </head>
      <body>
        <header>
          <nav>
            <ul>
                <li><a href="https://docs.platformatic.dev">Docs</a></li>
                <li><a href="#">Tables</a>
                    <ul>
                      ${tables.map(table => tags.html`
                        <li>${link(table)}</li>
                      `)}
                    </ul>
                </li>
            </ul>
          </nav>
        </header>
        <div id="content">
          ${inner}
        </div>
      </body>
    </html>
  `
  }, { skipOnHeader: 'hx-request' })

  // This is encapsulated
  fastify.register(async function (fastify) {
    await fastify.register(fastifyStatic, {
      serve: false,
      root: join(import.meta.url, '..')
    })

    fastify.get('/static/mvp.css', function (request, reply) {
      reply.sendFile('node_modules/mvp.css/mvp.css')
    })

    fastify.get('/static/htmx.js', function (request, reply) {
      reply.sendFile('node_modules/htmx.org/dist/htmx.min.js')
    })
  })
}
