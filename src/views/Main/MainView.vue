<script setup lang="ts">
import ImageProcessor from '@/views/Main/ImageProcessor/ImageProcessor'
import { onBeforeMount, onBeforeUnmount, ref } from 'vue'

let files: File[] | undefined
let imageProcessor: ImageProcessor | undefined

let isInited = ref(false)
let fileTotal = ref<number | undefined>(undefined)
let processedCount = ref(0)

async function initImageProcessor() {
  imageProcessor = await ImageProcessor.create()
  isInited.value = true
}

function handleFileChange(e: Event) {
  files = Array.from((e.currentTarget as HTMLInputElement).files!)
  fileTotal.value = files.length
}
function handleStartClick() {
  if (files == null) {
    console.log('please upload first')
    return
  }
  if (imageProcessor == null) {
    console.log('imageProcessor is not inited')
    return
  }
  // console.log(files, 'files')
  imageProcessor.start(files, {
    onProgressChange(processed) {
      console.log(processed, 'processed')
      processedCount.value = processed
    }
  })
}
function handleDownload() {
  if (imageProcessor == null) {
    console.log('imageProcessor is not inited')
    return
  }
  imageProcessor.downloadFiles()
}

// TODO: leave guard
// TODO: use worker thread

onBeforeMount(initImageProcessor)
onBeforeUnmount(() => {
  imageProcessor?.dispose()
})
</script>

<template>
  <main>
    <input type="file" multiple @change="handleFileChange" />

    <label for="file">File progress:</label>
    <progress id="file" :max="fileTotal" :value="processedCount" />
    <div v-if="fileTotal != null">{{ processedCount }}/{{ fileTotal }}</div>

    <button class="border px-3 py-2 rounded-md bg-amber-50" @click="handleStartClick">
      start process !!
    </button>
    <button class="border px-3 py-2 rounded-md bg-amber-50" @click="handleDownload">
      download
    </button>
  </main>
</template>
