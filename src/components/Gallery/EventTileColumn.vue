<script setup lang="ts">
import EventTile from "@/components/Gallery/EventTile.vue";

type EventSummary = {
  name: string;
  slug: string;
  eventDate: string;
  coverUrl: string | null;
};

defineProps<{
  season: string;
  events: EventSummary[];
}>();

defineEmits<{
  (event: "eventClicked", slug: string): void;
}>();

function seasonLabel(season: string) {
  return season.charAt(0).toUpperCase() + season.slice(1);
}
</script>

<template>
  <section class="flex min-w-0 flex-1 flex-col gap-4" :aria-labelledby="`${season}-events-heading`">
    <div class="flex items-baseline justify-between gap-3 border-b border-border pb-3">
      <h2 :id="`${season}-events-heading`" class="text-2xl font-bold">{{ seasonLabel(season) }}</h2>
      <span class="text-sm text-muted-foreground">{{ events.length }}</span>
    </div>
    <div v-if="events.length" class="grid gap-4">
      <EventTile
        v-for="event in events"
        :key="event.slug"
        :event="event"
        @click="$emit('eventClicked', event.slug)"
      />
    </div>
    <p v-else class="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      No {{ season }} events yet.
    </p>
  </section>
</template>
