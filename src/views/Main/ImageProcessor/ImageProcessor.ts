import type { IDisposable } from '@/types/class'
import localforage from 'localforage'
import ImageProcessorWorker from '@/views/Main/ImageProcessor/ImageProcessorWorker?worker'
import { type ImageProcessorWorkerExpose } from '@/views/Main/ImageProcessor/ImageProcessorWorker'
import * as Comlink from 'comlink'
import type { ImageProcessorOptions } from '@/views/Main/ImageProcessor/types'
import { init, processImage } from '@/views/Main/ImageProcessor/ImageProcessFuncs'
import { downloadAll } from '@/utils/download'

class ImageProcessor implements IDisposable {
  private isProcessing = false

  private constructor() {}

  // start process
  async start(
    files: File[],
    options?: ImageProcessorOptions & {
      onProgressChange?: (processed: number) => void
    }
  ): Promise<void> {
    const { onProgressChange, ...restOptions } = options ?? {}

    const WORKER_COUNT = 4
    const notUseWorker = files.length < WORKER_COUNT

    if (this.isProcessing) {
      throw new Error('image processing')
    }
    this.isProcessing = true

    try {
      // clear indexDB, reset state
      await localforage.clear()

      let counter = 0

      if (notUseWorker) {
        await processImage(files, {
          onProcessed() {
            onProgressChange?.(++counter)
          },
          ...restOptions
        })
      } else {
        const filesSlice: (typeof files)[] = Array.from(new Array(WORKER_COUNT), () => [])

        for (let i = 0; i < files.length; i++) {
          filesSlice[i % WORKER_COUNT].push(files[i])
        }

        await Promise.all(
          filesSlice.map(async (slice) => {
            const worker = new ImageProcessorWorker()
            const workerExpose = Comlink.wrap<ImageProcessorWorkerExpose>(worker)
            const options = Comlink.proxy({
              onProcessed: () => {
                onProgressChange?.(++counter)
              }
            })

            await (workerExpose.processImage as unknown as typeof processImage)(slice, options)
            worker.terminate()
          })
        )
      }
    } finally {
      this.isProcessing = false
    }
  }

  // if it has history, can download multiple
  downloadFiles(): void {
    ;(async () => {
      const files: File[] = []

      // localforage.iterate return void
      await localforage.iterate((file) => {
        files.push(file as File)
      })

      downloadAll(files)
    })()
  }

  dispose(): void {}

  static async create(): Promise<ImageProcessor> {
    await init()

    return new ImageProcessor()
  }
}

export default ImageProcessor
