interface IDisposable {
  dispose(): void
}
interface IAsyncDisposable {
  disposeAsync(): Promise<void>
}

export type { IDisposable, IAsyncDisposable }
