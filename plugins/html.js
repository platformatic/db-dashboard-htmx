import html from 'fastify-html'
import fastifyStatic from '@fastify/static'
import formBody from '@fastify/formbody'
import { join } from 'desm'
import tags from 'common-tags'

export default async function (fastify, opts) {
  fastify.register(formBody)
  await fastify.register(html)

  fastify.addLayout(function (inner, reply) {

    return fastify.tags.html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <script src="/static/htmx.js"></script>
        <link rel="stylesheet" href="/static/water.css">
        <link rel="preload" href="/static/spinner.svg" as="image">
      </head>
      <body>
        <header>
          <h1>Platformatic DB Dashboard
            <img id="indicator" class="htmx-indicator" src='/static/spinner.svg' />
          </h1>
        </header>
        <div id="content" hx-indicator="#indicator">
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

    fastify.get('/static/water.css', function (request, reply) {
      reply.sendFile('node_modules/water.css/out/water.min.css')
    })

    fastify.get('/static/htmx.js', function (request, reply) {
      reply.sendFile('node_modules/htmx.org/dist/htmx.min.js')
    })

    fastify.get('/static/spinner.svg', function (request, reply) {
      reply.sendFile('static/oval.svg')
    })
  })
}
