<template>
    <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
            @click="closeModal">
            <Transition enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 scale-75 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 translate-y-2">
                <div v-if="isVisible"
                    class="relative max-w-2xl mx-4 px-8 pb-8 border bg-popover text-popover-foreground rounded-lg shadow-2xl"
                    @click.stop>
                    <div class="flex w-full justify-end">
                        <button @click="closeModal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold mb-1">
                            x
                        </button>
                    </div>

                    <div class="text-center">
                        <div class="mb-6 rounded-sm">
                            <img :src="'team/easteregg.jpg'" alt="Hosts Easter Egg" class="mx-auto object-contain"
                                @error="handleImageError" />
                        </div>

                        <h2 class="text-2xl md:text-3xl font-bold mb-4 text-white">
                            You found an easter egg! 💚
                        </h2>

                        <p class="text-lg text-gray-300 leading-relaxed">
                            Thank you from the bottom of our hearts for making this community so special.
                            You're amazing!
                        </p>

                        <p class="text-lg text-gray-300 leading-relaxed">
                            Tell a host "Cat5 over Fiber" for a GUL sticker!
                        </p>

                        <button @click="closeModal"
                            class="mt-6 px-6 py-3 bg-primary text-white rounded-lg transition-colors duration-200 font-medium">
                            You're welcome!
                        </button>
                    </div>
                </div>
            </Transition>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onKeyStroke } from '@vueuse/core'

const isVisible = ref(false)


const easterEggMasterSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight']
const easterEggSequence = [...easterEggMasterSequence]

onKeyStroke(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'], (e) => {
    e.preventDefault();
    const key = e.key
    if (key === easterEggSequence[0]) {
        easterEggSequence.shift()
        if (easterEggSequence.length === 0) {
            showModal()
            easterEggSequence.splice(0, easterEggSequence.length, ...easterEggMasterSequence)
        }
    } else {
        easterEggSequence.splice(0, easterEggSequence.length, ...easterEggMasterSequence)
    }
})

function showModal() {
    isVisible.value = true
}

function closeModal() {
    isVisible.value = false
}

const handleImageError = (event: Event) => {
    const imgElement = event.target as HTMLImageElement
    imgElement.style.display = 'none'
}

</script>