<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import EventColumn from "@/components/Gallery/EventTileColumn.vue";

type Season = "winter" | "spring" | "summer" | "autumn";
type EventSummary = {
  name: string;
  slug: string;
  eventDate: string;
  season: Season | null;
  coverUrl: string | null;
};
type EventImage = {
  id: string;
  url: string | null;
  contentType: string;
  isCover: boolean;
};
type EventDetail = {
  event: Omit<EventSummary, "coverUrl">;
  images: EventImage[];
};

const seasons: Season[] = ["winter", "spring", "summer", "autumn"];
const apiUrl = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "";
const showOverview = ref(true);
const events = ref<EventSummary[]>([]);
const selectedEvent = ref<EventDetail | null>(null);
const loadingEvents = ref(false);
const loadingImages = ref(false);
const error = ref("");
const largeImage = ref<string | null>(null);

const eventsBySeason = computed(() =>
  Object.fromEntries(
    seasons.map((season) => [season, events.value.filter((event) => event.season === season)]),
  ) as Record<Season, EventSummary[]>,
);
const visibleImages = computed(() => selectedEvent.value?.images.filter((image) => image.url) || []);

function seasonLabel(season: Season) {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

function endpoint(path: string) {
  return `${apiUrl.replace(/\/$/, "")}${path}`;
}

async function request(path: string) {
  const response = await fetch(endpoint(path));
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${response.status}).`);
  }
  return response;
}

async function loadEvents() {
  loadingEvents.value = true;
  error.value = "";
  try {
    const response = await request("/api/events");
    const body = await response.json() as { events: EventSummary[] };
    events.value = body.events;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load gallery events.";
  } finally {
    loadingEvents.value = false;
  }
}

async function showEvent(slug: string) {
  showOverview.value = false;
  selectedEvent.value = null;
  loadingImages.value = true;
  error.value = "";
  try {
    const response = await request(`/api/events/${encodeURIComponent(slug)}`);
    selectedEvent.value = await response.json() as EventDetail;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load event images.";
  } finally {
    loadingImages.value = false;
  }
}

function reset() {
  showOverview.value = true;
  selectedEvent.value = null;
  largeImage.value = null;
  error.value = "";
}

function showLargeImage(url: string) {
  largeImage.value = url;
}

onMounted(loadEvents);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8" :class="{ 'pb-28': !showOverview }">
    <header class="mx-auto mb-12 max-w-3xl text-center">
      <h1 class="text-5xl font-extrabold tracking-tight sm:text-6xl">Gallery</h1>
      <p class="mt-5 text-lg leading-8 text-muted-foreground">Look back at the LANs, season by season.</p>
    </header>

    <p v-if="error" class="mx-auto mb-8 max-w-2xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-destructive" role="alert">
      {{ error }}
    </p>
    <p v-if="loadingEvents" class="py-12 text-center text-muted-foreground" role="status">Loading events…</p>

    <div v-if="showOverview && !loadingEvents" class="grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
      <EventColumn
        v-for="season in seasons"
        :key="season"
        :season="season"
        :events="eventsBySeason[season]"
        @event-clicked="showEvent"
      />
    </div>

    <section v-if="!showOverview" aria-labelledby="event-gallery-heading">
      <div v-if="loadingImages" class="py-12 text-center text-muted-foreground" role="status">Loading photos…</div>
      <template v-else-if="selectedEvent">
        <div class="mb-8">
          <p class="text-sm font-bold uppercase tracking-widest text-primary">
            {{ selectedEvent.event.season ? seasonLabel(selectedEvent.event.season) : "Uncategorised" }}
          </p>
          <h2 id="event-gallery-heading" class="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{{ selectedEvent.event.name }}</h2>
          <time :datetime="selectedEvent.event.eventDate" class="mt-2 block text-muted-foreground">{{ selectedEvent.event.eventDate }}</time>
        </div>

        <div v-if="visibleImages.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="image in visibleImages"
            :key="image.id"
            type="button"
            class="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            :aria-label="`View ${selectedEvent.event.name} photo${image.isCover ? ' (cover)' : ''}`"
            @click="image.url && showLargeImage(image.url)"
          >
            <img
              :src="image.url || undefined"
              :alt="`${selectedEvent.event.name} photo${image.isCover ? ' (cover)' : ''}`"
              class="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        </div>
        <p v-else class="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No photos have been uploaded for this event yet.</p>
      </template>
    </section>

    <div v-if="!showOverview" class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div class="mx-auto max-w-7xl">
        <button
          type="button"
          class="w-full rounded-xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          @click="reset"
        >
          Back to events
        </button>
      </div>
    </div>

    <div
      v-if="largeImage"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded event photo"
      @click.self="largeImage = null"
      @keydown.esc="largeImage = null"
    >
      <div class="relative max-h-full max-w-5xl">
        <button
          type="button"
          class="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-2xl leading-none text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close expanded photo"
          @click="largeImage = null"
        >
          <span aria-hidden="true">&times;</span>
        </button>
        <img :src="largeImage" alt="Expanded event photo" class="max-h-[90vh] max-w-full rounded-xl object-contain" />
      </div>
    </div>
  </main>
</template>
