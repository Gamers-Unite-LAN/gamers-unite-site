<template>
    <!-- Full Screen Modal Overlay -->
    <div v-show="isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 animate-in animate"
        @click="closeModal">
        <!-- Modal Content -->
        <div class="relative max-w-2xl mx-4 px-8 pb-8 border bg-popover text-popover-foreground  rounded-lg shadow-2xl transform transition-all duration-300 scale-100"
            @click.stop>
            <div class="flex w-full justify-end">

                <button @click="closeModal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold mb-1">
                    x
                </button>
            </div>

            <!-- Modal Body -->
            <div class="text-center">
                <!-- Image -->
                <div class="mb-6 rounded-sm">
                    <img src="https://placecats.com/700/400" alt="Hosts Easter Egg" class="mx-auto object-contain"
                        @error="handleImageError" />
                </div>

                <!-- Thank You Message -->
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

                <!-- Action Button -->
                <button @click="closeModal"
                    class="mt-6 px-6 py-3 bg-primary text-white rounded-lg transition-colors duration-200 font-medium">
                    You're welcome!
                </button>
            </div>
        </div>
    </div>
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

const showModal = () => {
    isVisible.value = true
}

const closeModal = () => {
    isVisible.value = false
}

const handleImageError = (event: Event) => {
    const imgElement = event.target as HTMLImageElement
    imgElement.style.display = 'none'
}

</script>