<template>
  <main class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <header class="mb-8 space-y-2">
      <p class="text-sm font-bold uppercase tracking-widest text-primary">Admin</p>
      <h1 v-if="!isValidApiKey" class="text-4xl font-extrabold tracking-tight">Enter API key</h1>
      <h1 v-if="isValidApiKey" class="text-4xl font-extrabold tracking-tight">Event gallery</h1>
      <p v-if="isValidApiKey" class="text-muted-foreground">Create events and upload their photos.</p>
    </header>

    <Accordion type="single" collapsible class="mb-8 rounded-2xl">
      <AccordionItem value="api-config" class="border-b-0 px-5 sm:px-6">
        <AccordionTrigger class="py-4 hover:no-underline">
          <div class="flex flex-wrap items-center gap-3 text-left">
            <span class="text-sm font-bold text-foreground">API </span>
            <span
              class="inline-flex items-center rounded-md border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-mono text-muted-foreground transition-colors">
              {{ apiUrl ? apiUrl : "Default (Same Origin)" }}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent class="pb-5 pt-1 text-muted-foreground">
          <div class="space-y-3">
            <div>
              <label for="api-url"
                class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Endpoint URL
              </label>
              <input id="api-url" v-model="apiUrl" type="url" placeholder="https://api.example.com"
                class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <p class="text-xs leading-relaxed text-muted-foreground">
              Leave blank when the API is hosted on this same domain or proxied. In local development, leaving this
              blank proxies <code class="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">/api</code> to <code
                class="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">http://localhost:3000</code>.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <template v-if="!isValidApiKey">
      <form class="mt-5 space-y-4" @submit.prevent="validateApiKey">
        <div>
          <label for="api-key" class="mb-2 block text-sm font-bold">Validate API key</label>
          <input id="api-key" v-model="apiKey" type="password" required autocomplete="off"
            class="w-full rounded-lg border bg-background px-3 py-2" />
        </div>

        <button type="submit" :disabled="validating"
          class="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">
          {{ validating ? "Validating…" : "Validate API key" }}
        </button>
      </form>
    </template>

    <template v-if="isValidApiKey">
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="rounded-xl border bg-card p-6 shadow-sm">
          <h2 class="text-xl font-bold">Create event</h2>
          <form class="mt-5 space-y-4" @submit.prevent="createEvent">
            <div>
              <label for="api-key" class="mb-2 block text-sm font-bold">Upload API key</label>
              <input id="api-key" v-model="apiKey" disabled type="password" required autocomplete="off"
                class="w-full rounded-lg border bg-background px-3 py-2 opacity-50" />
            </div>
            <div>
              <label for="event-name" class="mb-2 block text-sm font-bold">Event name</label>
              <input id="event-name" v-model="eventName" type="text" required maxlength="120"
                class="w-full rounded-lg border bg-background px-3 py-2" />
            </div>
            <div>
              <label for="event-date" class="mb-2 block text-sm font-bold">Event date</label>
              <input id="event-date" v-model="eventDate" type="date" required
                class="w-full rounded-lg border bg-background px-3 py-2" />
            </div>
            <div>
              <label for="event-season" class="mb-2 block text-sm font-bold">Season</label>
              <select id="event-season" v-model="eventSeason" required class="w-full rounded-lg border bg-background px-3 py-2">
                <option v-for="season in seasons" :key="season" :value="season">{{ seasonLabel(season) }}</option>
              </select>
            </div>
            <button type="submit" :disabled="creating"
              class="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">
              {{ creating ? "Creating…" : "Create event" }}
            </button>
          </form>
        </section>

        <section class="rounded-xl border bg-card p-6 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-bold">Upload images</h2>
            <button type="button" class="text-sm font-bold text-primary disabled:opacity-50" :disabled="loadingEvents"
              @click="loadEvents">
              {{ loadingEvents ? "Loading…" : "Refresh events" }}
            </button>
          </div>
          <div class="mt-5 space-y-4">
            <div>
              <label for="event-select" class="mb-2 block text-sm font-bold">Event</label>
              <select id="event-select" v-model="selectedSlug" class="w-full rounded-lg border bg-background px-3 py-2">
                <option value="">Select event</option>
                <option v-for="event in events" :key="event.slug" :value="event.slug">{{ event.name }} — {{
                  event.eventDate }}</option>
              </select>
            </div>
            <div v-if="selectedSlug">
              <label for="event-season-update" class="mb-2 block text-sm font-bold">Season tag</label>
              <div class="flex gap-2">
                <select id="event-season-update" v-model="selectedEventSeason" class="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2">
                  <option value="">Select season</option>
                  <option v-for="season in seasons" :key="season" :value="season">{{ seasonLabel(season) }}</option>
                </select>
                <button type="button" :disabled="!selectedEventSeason || updatingSeason" class="rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary disabled:opacity-50" @click="updateSeason">
                  {{ updatingSeason ? "Saving…" : "Save" }}
                </button>
              </div>
            </div>

            <div>
              <label for="images" class="mb-2 block text-sm font-bold">Images</label>
              <input id="images" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif"
                :disabled="!selectedSlug || uploading" class="w-full" @change="setFiles" />
            </div>
            <div v-if="files.length">
              <label for="cover-file" class="mb-2 block text-sm font-bold">Cover image</label>
              <select id="cover-file" v-model="coverFileIndex" class="w-full rounded-lg border bg-background px-3 py-2">
                <option v-for="(file, index) in files" :key="`${file.name}-${index}`" :value="index">{{ file.name }}
                </option>
              </select>
              <p class="mt-2 text-sm text-muted-foreground">Selected image becomes event cover.</p>
            </div>
            <button type="button" :disabled="!selectedSlug || !files.length || uploading"
              class="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
              @click="uploadImages">
              {{ uploading ? "Uploading…" : "Upload images" }}
            </button>
            <ul v-if="uploadStatuses.length" class="space-y-1 text-sm" aria-live="polite">
              <li v-for="(status, index) in uploadStatuses" :key="`${status.name}-${index}`"
                :class="status.state === 'failed' ? 'text-destructive' : 'text-muted-foreground'">
                {{ status.name }}: {{ status.state }}<span v-if="status.message"> — {{ status.message }}</span>
              </li>
            </ul>
            <p class="text-sm text-muted-foreground">{{ selectedEventName }}<span v-if="selectedEvent"> · {{
              selectedEvent.images.length }} image{{ selectedEvent.images.length === 1 ? "" : "s" }}</span></p>
          </div>
        </section>
      </div>
      <section class="mt-8" aria-labelledby="all-events-heading">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="all-events-heading" class="text-2xl font-bold">All events</h2>
            <p class="mt-1 text-sm text-muted-foreground">Review every event and its uploaded images.</p>
          </div>
          <span class="shrink-0 text-sm text-muted-foreground">{{ events.length }} event{{ events.length === 1 ? "" : "s" }}</span>
        </div>

        <p v-if="loadingEvents" class="rounded-xl border border-dashed p-8 text-center text-muted-foreground" role="status">Loading events…</p>
        <p v-else-if="!events.length" class="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No events have been created yet.</p>
        <div v-else class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="event in events" :key="event.slug" class="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div class="flex items-start justify-between gap-4 p-5">
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-wider text-primary">{{ event.season ? seasonLabel(event.season) : "Uncategorised" }}</p>
                <h3 class="mt-1 truncate text-lg font-bold" :title="event.name">{{ event.name }}</h3>
                <time :datetime="event.eventDate" class="mt-1 block text-sm text-muted-foreground">{{ event.eventDate }}</time>
              </div>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/40 px-2.5 py-2 text-xs font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="deletingEventSlug === event.slug"
                :aria-label="`Delete ${event.name}`"
                @click="deleteEvent(event)"
              >
                <Trash2 :size="14" aria-hidden="true" />
                {{ deletingEventSlug === event.slug ? "Deleting…" : "Delete" }}
              </button>
            </div>

            <div class="border-t bg-muted/20 p-4">
              <div v-if="event.images.length" class="flex gap-3 overflow-x-auto pb-1" :aria-label="`${event.images.length} images for ${event.name}`">
                <div v-for="image in event.images" :key="image.id" class="group relative min-w-28 overflow-hidden rounded-xl border bg-background sm:min-w-32">
                  <img v-if="image.url" :src="image.url" :alt="`${event.name} image${image.isCover ? ' (cover)' : ''}`" class="aspect-square w-full object-cover" loading="lazy" />
                  <div v-else class="flex aspect-square items-center justify-center p-3 text-center text-xs text-muted-foreground">Image unavailable</div>
                  <span v-if="image.isCover" class="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Cover</span>
                  <button
                    type="button"
                    class="absolute right-2 top-2 inline-flex rounded-md bg-black/75 p-1.5 text-white opacity-100 transition hover:bg-destructive sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="deletingImageId === image.id"
                    :aria-label="`Delete image from ${event.name}`"
                    @click.stop="deleteImage(event, image)"
                  >
                    <Trash2 :size="14" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p v-else class="py-4 text-center text-sm text-muted-foreground">No images uploaded.</p>
              <p class="mt-3 text-xs text-muted-foreground">{{ event.images.length }} image{{ event.images.length === 1 ? "" : "s" }}</p>
            </div>
          </article>
        </div>
      </section>
    </template>


    <p v-if="notice" class="mt-6 rounded-lg border border-primary/30 bg-primary/10 p-4 font-medium" role="status">{{
      notice }}</p>
    <p v-if="error" class="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive"
      role="alert">{{ error }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Trash2 } from "lucide-vue-next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Season = "winter" | "spring" | "summer" | "autumn";
const seasons: Season[] = ["winter", "spring", "summer", "autumn"];
type EventSummary = { name: string; slug: string; eventDate: string; season: Season | null; coverUrl: string | null };
type EventImage = { id: string; url: string | null; isCover: boolean };
type EventDetail = { event: Omit<EventSummary, "coverUrl">; images: EventImage[] };
type AdminEvent = EventSummary & { images: EventImage[] };
type UploadStatus = { name: string; state: "pending" | "uploading" | "uploaded" | "failed"; message?: string };

const apiUrl = ref(import.meta.env.VITE_API_URL || "");
const apiKey = ref("");
const isValidApiKey = ref(false);
const validating = ref(false);
const eventName = ref("");
const eventDate = ref("");
const eventSeason = ref<Season>("winter");
const events = ref<AdminEvent[]>([]);
const selectedSlug = ref("");
const selectedEvent = ref<EventDetail | null>(null);
const selectedEventSeason = ref<Season | "">("");
const files = ref<File[]>([]);
const coverFileIndex = ref(0);
const loadingEvents = ref(false);
const updatingSeason = ref(false);
const creating = ref(false);
const uploading = ref(false);
const error = ref("");
const notice = ref("");
const uploadStatuses = ref<UploadStatus[]>([]);
const deletingEventSlug = ref("");
const deletingImageId = ref("");

const selectedEventName = computed(() => selectedEvent.value?.event.name || "No event selected");
function seasonLabel(season: Season) {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

function endpoint(path: string) {
  return `${apiUrl.value.replace(/\/$/, "")}${path}`;
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(endpoint(path), options);
  if (response.ok || response.status === 204) return response;
  const body = await response.json().catch(() => null);
  throw new Error(body?.error || `Request failed (${response.status}).`);
}

async function validateApiKey() {
  isValidApiKey.value = false;
  validating.value = true;
  if (!apiKey.value) return;
  try {
    const response = await request("/api/validate", { headers: { authorization: `Bearer ${apiKey.value}` } });
    const body = await response.json() as { valid: boolean };
    isValidApiKey.value = body.valid;
  } catch (caught) {
    isValidApiKey.value = false;
    error.value = caught instanceof Error ? caught.message : "Unable to load events.";
  } finally {
    validating.value = false;
  }
}

async function loadEvents() {
  loadingEvents.value = true;
  error.value = "";
  try {
    const response = await request("/api/events");
    const body = await response.json() as { events: EventSummary[] };
    events.value = await Promise.all(body.events.map(async (event) => {
      const detailResponse = await request(`/api/events/${encodeURIComponent(event.slug)}`);
      const detail = await detailResponse.json() as EventDetail;
      return { ...event, images: detail.images };
    }));
    if (selectedSlug.value && !events.value.some((event) => event.slug === selectedSlug.value)) {
      selectedSlug.value = "";
      selectedEvent.value = null;
      selectedEventSeason.value = "";
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load events.";
  } finally {
    loadingEvents.value = false;
  }
}

async function loadSelectedEvent() {
  if (!selectedSlug.value) return;
  selectedEvent.value = null;
  selectedEventSeason.value = "";
  error.value = "";
  try {
    const response = await request(`/api/events/${encodeURIComponent(selectedSlug.value)}`);
    selectedEvent.value = await response.json() as EventDetail;
    selectedEventSeason.value = selectedEvent.value.event.season || "";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load event.";
  }
}

async function deleteImage(event: AdminEvent, image: EventImage) {
  if (!window.confirm(`Delete this image from "${event.name}"? This cannot be undone.`)) return;
  error.value = "";
  notice.value = "";
  deletingImageId.value = image.id;
  try {
    await request(`/api/images/${encodeURIComponent(image.id)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${apiKey.value}` },
    });
    event.images = event.images.filter((candidate) => candidate.id !== image.id);
    if (selectedEvent.value?.event.slug === event.slug) {
      selectedEvent.value.images = selectedEvent.value.images.filter((candidate) => candidate.id !== image.id);
    }
    notice.value = "Image deleted.";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to delete image.";
  } finally {
    deletingImageId.value = "";
  }
}

async function deleteEvent(event: AdminEvent) {
  if (!window.confirm(`Delete "${event.name}" and all ${event.images.length} image${event.images.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
  error.value = "";
  notice.value = "";
  deletingEventSlug.value = event.slug;
  try {
    await request(`/api/events/${encodeURIComponent(event.slug)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${apiKey.value}` },
    });
    events.value = events.value.filter((candidate) => candidate.slug !== event.slug);
    if (selectedSlug.value === event.slug) {
      selectedSlug.value = "";
      selectedEvent.value = null;
      selectedEventSeason.value = "";
      files.value = [];
      uploadStatuses.value = [];
    }
    notice.value = `Deleted ${event.name}.`;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to delete event.";
  } finally {
    deletingEventSlug.value = "";
  }
}
async function updateSeason() {
  if (!selectedSlug.value || !selectedEventSeason.value) return;
  error.value = "";
  notice.value = "";
  updatingSeason.value = true;
  try {
    await request(`/api/events/${encodeURIComponent(selectedSlug.value)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey.value}` },
      body: JSON.stringify({ season: selectedEventSeason.value }),
    });
    await loadEvents();
    notice.value = "Season tag saved.";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to save season tag.";
  } finally {
    updatingSeason.value = false;
  }
}

async function createEvent() {
  error.value = "";
  notice.value = "";
  creating.value = true;
  try {
    const response = await request("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey.value}` },
      body: JSON.stringify({ name: eventName.value, eventDate: eventDate.value, season: eventSeason.value }),
    });
    const body = await response.json() as { event: EventSummary };
    eventName.value = "";
    eventDate.value = "";
    eventSeason.value = "winter";
    selectedSlug.value = body.event.slug;
    await loadEvents();
    await loadSelectedEvent();
    notice.value = "Event created.";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to create event.";
  } finally {
    creating.value = false;
  }
}

function setFiles(event: Event) {
  files.value = Array.from((event.target as HTMLInputElement).files || []);
  coverFileIndex.value = 0;
  uploadStatuses.value = files.value.map((file) => ({ name: file.name, state: "pending" }));
}

async function uploadImages() {
  if (!selectedSlug.value || !files.value.length) return;
  error.value = "";
  notice.value = "";
  uploading.value = true;
  let uploaded = 0;

  for (const [index, file] of files.value.entries()) {
    uploadStatuses.value[index] = { name: file.name, state: "uploading" };
    try {
      await request(`/api/events/${encodeURIComponent(selectedSlug.value)}/images?filename=${encodeURIComponent(file.name)}${index === coverFileIndex.value ? "&cover=true" : ""}`, {
        method: "POST",
        headers: { "content-type": file.type, authorization: `Bearer ${apiKey.value}` },
        body: file,
      });
      uploadStatuses.value[index] = { name: file.name, state: "uploaded" };
      uploaded += 1;
    } catch (caught) {
      uploadStatuses.value[index] = {
        name: file.name,
        state: "failed",
        message: caught instanceof Error ? caught.message : "Upload failed.",
      };
    }
  }

  uploading.value = false;
  await loadSelectedEvent();
  notice.value = `${uploaded} of ${files.value.length} image${files.value.length === 1 ? "" : "s"} uploaded.`;
}

watch(selectedSlug, loadSelectedEvent);
onMounted(loadEvents);
</script>
