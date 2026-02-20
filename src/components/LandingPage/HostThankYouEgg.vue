<template>
    <!-- Combo Key Display -->
    <Transition enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 scale-50 translate-y-8" enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all duration-500 ease-in" leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-150 -translate-y-12">
        <div v-if="showCombo" class="fixed bottom-8 right-8 z-40 pointer-events-none">
            <div class="combo-display">
                <div class="text-6xl mb-2">{{ currentKeyEmoji }}</div>
                <div class="combo-progress-bar">
                    <div class="combo-progress-fill" :style="{ width: `${(comboCount / 8) * 100}%` }"></div>
                </div>
            </div>
        </div>
    </Transition>

    <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
            @click="closeModal" v-click-outside="closeModal">
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
import { ref } from 'vue';
import { onKeyStroke, onClickOutside } from '@vueuse/core';

const isVisible = ref(false);
const showCombo = ref(false);
const currentKeyEmoji = ref('');
const comboCount = ref(0);

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
    e.preventDefault();
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

function showModal() {
    isVisible.value = true;
}

function closeModal() {
    isVisible.value = false;
    comboCount.value = 0;
}

const handleImageError = (event: Event) => {
    const imgElement = event.target as HTMLImageElement;
    imgElement.style.display = 'none';
}
</script>

<style scoped>
/* Combo display styles */
.combo-display {
    text-align: center;
    padding: 16px;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9));
    border: 2px solid #fbbf24;
    border-radius: 12px;
    box-shadow:
        0 0 20px rgba(251, 191, 36, 0.5),
        0 0 40px rgba(251, 191, 36, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    min-width: 120px;
    animation: comboGlow 0.8s ease-out forwards;
}

.combo-counter {
    font-size: 1.2rem;
    font-weight: bold;
    color: #fbbf24;
    text-shadow: 0 0 8px rgba(251, 191, 36, 0.8);
    margin-bottom: 8px;
    font-family: monospace;
}

.combo-progress-bar {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid rgba(251, 191, 36, 0.3);
}

.combo-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #f59e0b, #fbbf24, #eab308);
    border-radius: 3px;
    transition: width 0.3s ease-out;
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
    animation: progressPulse 0.3s ease-out;
}

/* Combo glow animation */
@keyframes comboGlow {
    0% {
        box-shadow:
            0 0 20px rgba(251, 191, 36, 0.5),
            0 0 40px rgba(251, 191, 36, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    50% {
        box-shadow:
            0 0 30px rgba(251, 191, 36, 0.8),
            0 0 60px rgba(251, 191, 36, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    100% {
        box-shadow:
            0 0 20px rgba(251, 191, 36, 0.5),
            0 0 40px rgba(251, 191, 36, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
}

/* Progress bar pulse */
@keyframes progressPulse {
    0% {
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
    }

    50% {
        box-shadow: 0 0 16px rgba(251, 191, 36, 1);
    }

    100% {
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
    }
}

/* Emoji styling */
.combo-display .text-6xl {
    filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
    animation: emojiPop 0.3s ease-out;
}

@keyframes emojiPop {
    0% {
        transform: scale(0.7);
        filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
    }

    50% {
        transform: scale(1.1);
        filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.8));
    }

    100% {
        transform: scale(1);
        filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
    }
}
</style>