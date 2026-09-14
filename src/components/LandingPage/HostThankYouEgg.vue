<template>
    <!-- Combo Key Display -->
    <Transition enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 scale-50 translate-y-8" enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all duration-500 ease-in" leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-150 -translate-y-12">
        <div v-if="showCombo" class="fixed bottom-8 right-8 z-40 pointer-events-none">
            <div class="min-w-30 animate-combo-glow rounded-xl border-2 border-amber-400 bg-gradient-to-br from-black/90 to-zinc-800/90 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.1)] backdrop-blur">
                <div class="mb-2 text-6xl drop-shadow-[0_0_8px_rgba(251,191,36,.5)]">{{ currentKeyEmoji }}</div>
                <div class="h-1.5 w-full overflow-hidden rounded-full border border-amber-400/30 bg-white/20">
                    <div class="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 shadow-[0_0_8px_rgba(251,191,36,.6)] transition-[width] duration-300" :class="progressWidth"></div>
                </div>
            </div>
        </div>
    </Transition>

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
                <div v-if="isVisible" role="dialog" aria-modal="true" aria-labelledby="easter-egg-title"
                    class="relative max-w-2xl mx-4 px-8 pb-8 border bg-popover text-popover-foreground rounded-lg shadow-2xl"
                    @click.stop>
                    <div class="flex w-full justify-end">
                        <button ref="closeButton" @click="closeModal" aria-label="Close easter egg" class="mb-1 text-2xl font-bold text-gray-500 hover:text-gray-700">
                            ×
                        </button>
                    </div>

                    <div class="text-center">
                        <div class="mb-6 rounded-sm">
                            <img :src="'team/easteregg.jpg'" alt="Hosts Easter Egg" class="mx-auto object-contain"
                                @error="handleImageError" />
                        </div>

                        <h2 id="easter-egg-title" class="text-2xl md:text-3xl font-bold mb-4 text-white">
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
import { computed, nextTick, ref } from 'vue';
import { onKeyStroke } from '@vueuse/core';

const isVisible = ref(false);
const showCombo = ref(false);
const currentKeyEmoji = ref('');
const comboCount = ref(0);
const closeButton = ref<HTMLButtonElement>();
const progressWidth = computed(() => ["w-0", "w-[12.5%]", "w-1/4", "w-[37.5%]", "w-1/2", "w-[62.5%]", "w-3/4", "w-[87.5%]", "w-full"][comboCount.value]);

const easterEggMasterSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
const easterEggSequence = [...easterEggMasterSequence];

// Map arrow keys to emojis
const keyEmojiMap: Record<string, string> = {
    'ArrowUp': '⬆️',
    'ArrowDown': '⬇️',
    'ArrowLeft': '⬅️',
    'ArrowRight': '➡️'
};

function triggerCombo(key: string) {
    currentKeyEmoji.value = keyEmojiMap[key];
    comboCount.value = easterEggMasterSequence.length - easterEggSequence.length + 1;
    showCombo.value = true;

    setTimeout(() => {
        showCombo.value = false
    }, 800);
};

onKeyStroke(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'], (e) => {
    if ((e.target as HTMLElement)?.matches('input, textarea, select, [contenteditable="true"]')) return;
    const key = e.key;
    if (key === easterEggSequence[0]) {
        triggerCombo(key);
        easterEggSequence.shift();
        if (easterEggSequence.length === 0) {
            setTimeout(() => {
                showModal()
            }, 400);
            easterEggSequence.splice(0, easterEggSequence.length, ...easterEggMasterSequence);
        }
    } else {
        easterEggSequence.splice(0, easterEggSequence.length, ...easterEggMasterSequence);
        comboCount.value = 0;
    }
})

async function showModal() {
    isVisible.value = true;
    await nextTick();
    closeButton.value?.focus();
}

onKeyStroke('Escape', closeModal);

function closeModal() {
    isVisible.value = false;
    comboCount.value = 0;
}

const handleImageError = (event: Event) => {
    const imgElement = event.target as HTMLImageElement;
    imgElement.classList.add('hidden');
}
</script>
