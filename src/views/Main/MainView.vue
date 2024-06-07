<script setup lang="ts">
import ImageProcessor from '@/views/Main/ImageProcessor/ImageProcessor'
import type { UnwrapRef } from 'vue'
import { onBeforeUnmount, ref, watchEffect } from 'vue'
import logoUrl from '@/assets/logo.svg'
import loadingUrl from '@/assets/loading.svg'

const enum Status {
  'READY',
  'UPLOADED',
  'PROCESSING',
  'PROCESSED'
}

const TAIL_MAIN_CONTENT = 'max-w-screen-lg mx-auto px-4 md:px-10 box-content'

const imageProcessor = ImageProcessor.create()

const $status = ref<Status>(Status.READY)
const $files = ref<File[]>([])
const $processed = ref<number>(0)

type SetStatusParams =
  | [status: Status.READY]
  | [
      status: Status.UPLOADED,
      payload: {
        files: UnwrapRef<typeof $files>
      }
    ]
  | [status: Status.PROCESSING]
  | [status: Status.PROCESSED]
function setStatus(...args: SetStatusParams) {
  const status = args[0]
  switch (status) {
    case Status.READY: {
      // reset
      $files.value.length = 0
      $processed.value = 0
      break
    }
    case Status.UPLOADED: {
      $files.value = args[1].files
      break
    }
    case Status.PROCESSING: {
      break
    }
    case Status.PROCESSED: {
      break
    }
  }
  $status.value = status
}

// Status.PROCESSING to Status.PROCESSED
watchEffect(() => {
  if ($status.value === Status.PROCESSING && $processed.value >= $files.value.length) {
    setStatus(Status.PROCESSED)
  }
})
// add leave guard
watchEffect((onCleanup) => {
  function handleLeave(e: Event) {
    if ($status.value !== Status.READY) {
      e.preventDefault()
    }
  }
  if ($status.value !== Status.READY) {
    window.addEventListener('beforeunload', handleLeave)
  }
  onCleanup(() => {
    window.removeEventListener('beforeunload', handleLeave)
  })
})

function handleUpload(e: Event) {
  const element = e.currentTarget as HTMLButtonElement
  element.querySelector('input')?.click()
}
function handleFileChange(e: Event) {
  const files = Array.from((e.currentTarget as HTMLInputElement).files!)
  setStatus(Status.UPLOADED, { files })
}
async function handleStartProcess() {
  setStatus(Status.PROCESSING)
  const processor = await imageProcessor

  const smoothUpdateArr: number[] = []

  const timer = window.setInterval(() => {
    if ($status.value !== Status.PROCESSING) {
      window.clearInterval(timer)
    }
    if (smoothUpdateArr.length) {
      $processed.value = smoothUpdateArr.shift()!
    }
  }, 800)

  processor.start($files.value, {
    onProgressChange(processed) {
      smoothUpdateArr.push(processed)
    }
  })
}
async function handleDownload() {
  const processor = await imageProcessor

  processor.downloadFiles()
}
function handleReUpload() {
  setStatus(Status.READY)
}

onBeforeUnmount(() => {
  ;(async () => {
    ;(await imageProcessor)?.dispose()
  })()
})
</script>

<template>
  <header class="sticky top-0 h-14 bg-white shadow-md">
    <div :class="`h-full ${TAIL_MAIN_CONTENT} flex items-center`">
      <img class="h-10" :src="logoUrl" alt="logo" />
    </div>
  </header>
  <main class="flex-1 bg-[#f5f5fa]">
    <section :class="`mt-[20vh] ${TAIL_MAIN_CONTENT}`">
      <h1 class="text-4xl mb-10">朋友圈图片处理工具</h1>

      <template v-if="$status === Status.READY">
        <button class="w-full max-w-sm h-12 bg-primary text-white rounded-md" @click="handleUpload">
          <input
            class="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heif"
            multiple
            @change="handleFileChange"
          />
          上传文件
        </button>
      </template>

      <div v-if="$status !== Status.READY" class="flex items-center mb-10">
        <progress
          class="max-w-md flex-1 rounded-2xl"
          id="file"
          :max="$files.length"
          :value="$processed"
        />
        <span class="ml-2"> {{ $processed }} / {{ $files.length }} </span>
      </div>

      <div class="flex flex-col gap-2">
        <button
          v-if="$status === Status.UPLOADED || $status === Status.PROCESSING"
          class="relative inline-flex items-center justify-center w-full max-w-sm h-12 bg-primary disabled:bg-gray-400 text-white rounded-md"
          :disabled="$status === Status.PROCESSING"
          @click="handleStartProcess"
        >
          处理
          <img v-if="$status === Status.PROCESSING" class="ml-2 h-8" :src="loadingUrl" alt="logo" />
        </button>
        <button
          v-if="$status === Status.PROCESSED"
          class="w-full max-w-sm h-12 bg-primary text-white rounded-md"
          @click="handleDownload"
        >
          下载
        </button>

        <button
          v-if="$status !== Status.READY"
          class="w-full max-w-sm h-12 bg-primary disabled:bg-gray-400 text-white rounded-md"
          :disabled="$status === Status.PROCESSING"
          @click="handleReUpload"
        >
          重新上传
        </button>
      </div>
    </section>
  </main>
  <footer class="h-10 bg-[#fafbfd]">
    <div
      :class="`h-full ${TAIL_MAIN_CONTENT} flex justify-between items-center font-light text-sm text-gray-700`"
    >
      <span>
        ©
        <a
          class="hover:underline"
          href="https://github.com/julenwang"
          target="_blank"
          rel="noreferrer"
          >Julenwang</a
        >
        2024
      </span>
      <span>
        Powered by
        <a
          class="hover:underline"
          href="https://github.com/dlemstra/magick-wasm"
          target="_blank"
          rel="noreferrer"
          >magick-wasm</a
        >
      </span>
    </div>
  </footer>
</template>

<style>
html,
body {
  background-color: #f5f5fa;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
#app > * {
  flex-shrink: 0;
}
</style>
