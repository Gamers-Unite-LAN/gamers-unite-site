<script setup lang="ts">
type EventSummary = {
  name: string;
  slug: string;
  eventDate: string;
  coverUrl: string | null;
};

defineProps<{
  event: EventSummary;
}>();

defineEmits<{
  (event: "click"): void;
}>();
</script>

<template>
  <button
    type="button"
    class="group w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    :aria-label="`View photos from ${event.name}`"
    @click="$emit('click')"
  >
    <div class="aspect-[4/3] overflow-hidden bg-muted">
      <img
        v-if="event.coverUrl"
        :src="event.coverUrl"
        :alt="`${event.name} event cover`"
        class="size-full object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No cover image yet
      </div>
    </div>
    <div class="space-y-1 p-4">
      <h3 class="font-bold text-foreground">{{ event.name }}</h3>
      <time :datetime="event.eventDate" class="text-sm text-muted-foreground">{{ event.eventDate }}</time>
    </div>
  </button>
</template>
