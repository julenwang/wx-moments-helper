import * as Comlink from 'comlink'
import { init, processImage } from '@/views/Main/ImageProcessor/ImageProcessFuncs'

// init ImageMagick
const initedPromise = init()

Comlink.expose({
  processImage: async (...args) => {
    await initedPromise

    return processImage(...args)
  }
} satisfies ImageProcessorWorkerExpose)

export type ImageProcessorWorkerExpose = {
  processImage: typeof processImage
}
