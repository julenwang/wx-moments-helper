import type { IDisposable } from '@/types/class'
import {
  Gravity,
  type IMagickImage,
  initializeImageMagick,
  MagickColor,
  MagickFormat,
  MagickGeometry,
  MagickImage
} from '@imagemagick/magick-wasm'
import { saveAs } from 'file-saver'
import localforage from 'localforage'

type ImageProcessorOptions = {
  onProgressChange?: (processed: number) => void
}

class ImageProcessor implements IDisposable {
  private isProcessing = false

  private constructor() {}

  // start process
  async start(files: File[], options?: ImageProcessorOptions): Promise<void> {
    const { onProgressChange } = options ?? {}

    if (this.isProcessing) {
      throw new Error('image processing')
    }
    this.isProcessing = true

    try {
      // clear indexDB, reset state
      await localforage.clear()

      let counter = 0
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        const magickImage: IMagickImage = await new Promise((resolve, reject) => {
          try {
            // TODO: 40MB 会出错，instance disposed
            const image = MagickImage.create()
            image.read(uint8Array)
            resolve(image)
          } catch (e) {
            reject(e)
          }
        })

        /**
         * @link https://imagemagick.org/script/command-line-processing.php#geometry
         */
        // 等比缩小短边
        magickImage.resize(new MagickGeometry('x2262'))
        // 拉伸到宽幅，居中，添加白边
        magickImage.extent(
          new MagickGeometry('4524x2262'),
          Gravity.Center,
          new MagickColor(255, 255, 255)
        )

        const processedBlob = await new Promise<Blob>((resolve, reject) => {
          try {
            magickImage.write(MagickFormat.Jpg, (u8Arr) => {
              const blob = new File([u8Arr], file.name, {
                lastModified: file.lastModified,
                type: 'image/jpeg'
              })
              resolve(blob)
            })
          } catch (e) {
            reject(e)
          }
        })

        await localforage.setItem(crypto.randomUUID(), processedBlob)

        magickImage.dispose()

        onProgressChange?.(++counter)
      }
    } finally {
      this.isProcessing = false
    }
  }

  // if it has history, can download multiple
  downloadFiles(): void {
    localforage.iterate((file: File) => {
      saveAs(file, file.name)
    })
  }

  dispose(): void {}

  static async create(): Promise<ImageProcessor> {
    const wasmLocation = new URL('@imagemagick/magick-wasm/magick.wasm', import.meta.url)

    // init ImageMagick
    await initializeImageMagick(wasmLocation)

    return new ImageProcessor()
  }
}

export default ImageProcessor
