// extract to an individual module，avoid worker error
import {
  Gravity,
  type IMagickImage,
  initializeImageMagick,
  MagickColor,
  MagickFormat,
  MagickGeometry,
  MagickImage
} from '@imagemagick/magick-wasm'
import localforage from 'localforage'
import type { ImageProcessorOptions } from '@/views/Main/ImageProcessor/types'

export async function init() {
  const wasmLocation = new URL('@imagemagick/magick-wasm/magick.wasm', import.meta.url)

  // init ImageMagick
  await initializeImageMagick(wasmLocation)
}

export async function processImage(
  files: File[],
  options?: ImageProcessorOptions & {
    onProcessed?: (id: string) => void
  }
) {
  const { onProcessed } = options ?? {}

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

    const uuid = crypto.randomUUID()
    await localforage.setItem(uuid, processedBlob)

    magickImage.dispose()

    onProcessed?.(uuid)
  }
}
