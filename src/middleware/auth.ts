import type { Context, Next } from 'hono'
import type { AppEnv } from '../types/env'

function unauthorized(c: Context<AppEnv>, message: string) {
  return c.json(
    {
      error: 'Unauthorized',
      message,
    },
    401
  )
}

/**
 * 読み取り認証ミドルウェア
 * 読み取り専用キー OR 読み書きキー のどちらでもアクセス可
 */
export async function readAuth(c: Context<AppEnv>, next: Next) {
  const apiKey = c.req.header('X-API-Key')
  const validKeys = [c.env.API_KEY_READ, c.env.API_KEY_WRITE].filter(
    (key): key is string => Boolean(key)
  )

  if (!apiKey || !validKeys.includes(apiKey)) {
    return unauthorized(c, 'Invalid API key')
  }

  return next()
}

/**
 * 書き込み認証ミドルウェア
 * 読み書きキーのみアクセス可
 */
export async function writeAuth(c: Context<AppEnv>, next: Next) {
  const apiKey = c.req.header('X-API-Key')

  if (!apiKey || !c.env.API_KEY_WRITE || apiKey !== c.env.API_KEY_WRITE) {
    return unauthorized(c, 'Write permission required')
  }

  return next()
}
