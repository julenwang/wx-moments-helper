import type { IDisposable } from '@/types/class'
import localforage from 'localforage'
import ImageProcessorWorker from '@/views/Main/ImageProcessor/ImageProcessorWorker?worker'
import { type ImageProcessorWorkerExpose } from '@/views/Main/ImageProcessor/ImageProcessorWorker'
import * as Comlink from 'comlink'
import type { ImageProcessorOptions } from '@/views/Main/ImageProcessor/types'
import { init, processImage } from '@/views/Main/ImageProcessor/ImageProcessFuncs'
import { wait } from '@/utils/schedule'
import { saveAs } from 'file-saver'

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

    const WORKER_MAX_COUNT = 4

    if (this.isProcessing) {
      throw new Error('image processing')
    }
    this.isProcessing = true

    try {
      // clear indexDB, reset state
      await localforage.clear()

      let counter = 0

      const filesSlice: (typeof files)[] = Array.from(
        new Array(Math.min(files.length, WORKER_MAX_COUNT)),
        () => []
      )

      for (let i = 0; i < files.length; i++) {
        filesSlice[i % filesSlice.length].push(files[i])
      }

      await Promise.all(
        filesSlice.map(async (slice) => {
          const worker = new ImageProcessorWorker()
          const workerExpose = Comlink.wrap<ImageProcessorWorkerExpose>(worker)
          const optionsProxy = Comlink.proxy({
            onProcessed: () => {
              onProgressChange?.(++counter)
            },
            ...restOptions
          })

          await (workerExpose.processImage as unknown as typeof processImage)(slice, optionsProxy)
          worker.terminate()
        })
      )
    } finally {
      this.isProcessing = false
    }
  }

  // if it has history, can download multiple
  downloadFiles(): void {
    /**
     * download files greater than 10
     * @link https://stackoverflow.com/questions/53560991/automatic-file-downloads-limited-to-10-files-on-chrome-browser/53841885#53841885
     */
    ;(async () => {
      const keys = await localforage.keys()

      const BATCH_COUNT = 10
      let count = 0
      for (const key of keys) {
        const file = (await localforage.getItem<File>(key)) as File
        if (count === BATCH_COUNT) {
          await wait(1000)
          count = 0
        }
        saveAs(file, file.name)
        count++
      }
    })()
  }

  dispose(): void {
    localforage.clear()
  }

  static async create(): Promise<ImageProcessor> {
    await init()

    return new ImageProcessor()
  }
}

export default ImageProcessor
