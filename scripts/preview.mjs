import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.argv[3]
  ? resolve(process.argv[3])
  : fileURLToPath(new URL('../dist/aurora-admin-angular/browser/', import.meta.url))
const entry = resolve(root, 'index.html')
const port = Number(process.argv[2] ?? 4200)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

await stat(entry)
createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end()
    return
  }
  let file
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    file = resolve(root, '.' + pathname)
    const name = relative(root, file)
    if (name === '..' || name.startsWith('..' + sep)) {
      response.writeHead(404).end()
      return
    }
    if (!(await stat(file).catch(() => null))?.isFile()) {
      if (extname(pathname)) {
        response.writeHead(404).end()
        return
      }
      file = entry
    }
  } catch {
    response.writeHead(400).end()
    return
  }
  response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
  if (request.method === 'HEAD') response.end()
  else createReadStream(file).on('error', () => response.destroy()).pipe(response)
}).listen(port, '127.0.0.1', () => console.log('Aurora Angular em http://127.0.0.1:' + port))
