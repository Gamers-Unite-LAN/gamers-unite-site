<template>
    <div class="flex flex-col">
        {{ event }}
        <div class="block rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:w-[23%]">
            <EventTile @click="() => emit('eventClicked', 'asjbnsad')" />
            <EventTile @click="() => emit('eventClicked', 'asdasdg')" />
            <EventTile @click="() => emit('eventClicked', 'sdfghty6y')" />
            <EventTile @click="() => emit('eventClicked', 'sfghtshn')" />
        </div>
    </div>
</template>

<script setup lang="ts">
import EventTile from '@/components/Gallery/EventTile.vue';

defineProps<{
    event: string;
}>();

const emit = defineEmits<{
    (e: 'eventClicked', eventId: string): void;
}>();
</script>