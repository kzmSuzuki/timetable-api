export interface D1Result<T> {
  results: T[]
}

export interface D1BoundStatementLike<T = unknown> {
  all: () => Promise<D1Result<T>>
}

export interface D1PreparedStatementLike<T = unknown> {
  bind: (...values: unknown[]) => D1BoundStatementLike<T>
}

export interface D1DatabaseLike {
  prepare: <T = unknown>(query: string) => D1PreparedStatementLike<T>
  batch: (statements: D1BoundStatementLike[]) => Promise<unknown[]>
}
