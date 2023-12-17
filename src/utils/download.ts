import { saveAs } from 'file-saver'

/**
 * download files greater than 10
 * @link https://stackoverflow.com/questions/53560991/automatic-file-downloads-limited-to-10-files-on-chrome-browser/53841885#53841885
 */
function pause(timeout: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout || 1000)
  })
}
export async function downloadAll(files: File[]) {
  let count = 0
  for (const file of files) {
    saveAs(file, file.name) // your
    if (++count >= 10) {
      await pause(1000)
      count = 0
    }
  }
}
