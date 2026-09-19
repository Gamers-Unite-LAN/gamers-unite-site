<template>
  <main class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <header class="mb-8 space-y-2">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-bold uppercase tracking-widest text-primary">Admin</p>
          <h1 class="text-4xl font-extrabold tracking-tight">{{ isAdmin ? "Event gallery" : "Admin sign-in" }}</h1>
          <p v-if="isAdmin" class="text-muted-foreground">Create events and upload their photos.</p>
        </div>
        <button v-if="isAdmin" type="button" class="rounded-lg border px-3 py-2 text-sm font-bold" @click="logout">Sign out</button>
      </div>
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

    <template v-if="!isAdmin">
      <div class="mt-5 space-y-4">
        <p v-if="authUser" class="text-muted-foreground">Signed in as {{ authUser.globalName || authUser.username }}, but this account is not an administrator.</p>
        <p v-else class="text-muted-foreground">Sign in with Discord to access event administration.</p>
        <a v-if="!isAuthenticated" :href="endpoint('/api/auth/discord')" class="inline-flex rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground">
          {{ authLoading ? "Checking session…" : "Continue with Discord" }}
        </a>
        <button v-else type="button" class="rounded-lg border px-4 py-2 font-bold" @click="logout">Sign out</button>
      </div>
    </template>
    <template v-if="isAdmin">
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="rounded-xl border bg-card p-6 shadow-sm">
          <h2 class="text-xl font-bold">Create event</h2>
          <form class="mt-5 space-y-4" @submit.prevent="createEvent">
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
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="event-start-time" class="mb-2 block text-sm font-bold">Start time</label>
                <input id="event-start-time" v-model="eventStartTime" type="time" required
                  class="w-full rounded-lg border bg-background px-3 py-2" />
              </div>
              <div>
                <label for="event-end-time" class="mb-2 block text-sm font-bold">End time</label>
                <input id="event-end-time" v-model="eventEndTime" type="time" required
                  class="w-full rounded-lg border bg-background px-3 py-2" />
              </div>
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
            <div v-if="files.length && selectedEvent && selectedEvent.images.length === 0">
              <label for="cover-file" class="mb-2 block text-sm font-bold">Cover image</label>
              <select id="cover-file" v-model="coverFileIndex" class="w-full rounded-lg border bg-background px-3 py-2">
                <option v-for="(file, index) in files" :key="`${file.name}-${index}`" :value="index">{{ file.name }}
                </option>
              </select>
              <p class="mt-2 text-sm text-muted-foreground">Selected image becomes event cover.</p>
            </div>
            <p v-else-if="files.length && selectedEvent?.images.length" class="text-sm text-muted-foreground">Existing cover image will be kept. Use Set cover on an event card to change it.</p>
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
        <EventCard
          v-for="event in events"
          :key="event.slug"
          :event="event"
          :seasons="seasons"
          :saving="savingEventSlug === event.slug"
          :saved-revision="lastSavedEventSlug === event.slug ? eventSaveRevision : 0"
          :deleting="deletingEventSlug === event.slug"
          :deleting-image-id="deletingImageId"
          :setting-cover-image-id="settingCoverImageId"
          :reordering="reorderingImagesSlug === event.slug"
          @save="saveEvent"
          @delete-event="deleteEvent(event)"
          @delete-image="deleteImage(event, $event)"
          @set-cover="setCoverImage(event, $event)"
          @reorder-images="reorderImages(event, $event)"
        />
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
import EventCard from "@/components/Admin/EventCard.vue";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
type Season = "winter" | "spring" | "summer" | "autumn";
const seasons: Season[] = ["winter", "spring", "summer", "autumn"];

type EventSummary = {
  name: string;
  slug: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  season: Season | null;
  galleryVisible: boolean;
  showCoverImage: boolean;
  coverUrl: string | null;
};
type EventImage = { id: string; url: string | null; isCover: boolean };
type EventDetail = { event: Omit<EventSummary, "coverUrl">; images: EventImage[] };
type AdminEvent = EventSummary & { images: EventImage[] };
type EditableEvent = {
  slug: string;
  name: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  season: Season | "";
  galleryVisible: boolean;
  showCoverImage: boolean;
};
type UploadStatus = { name: string; state: "pending" | "uploading" | "uploaded" | "failed"; message?: string };

const apiUrl = ref(import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "");
type AuthUser = { id: string; username: string; globalName: string | null; avatar: string | null };
const authUser = ref<AuthUser | null>(null);
const isAuthenticated = ref(false);
const isAdmin = ref(false);
const authLoading = ref(true);
const eventName = ref("");
const eventDate = ref("");
const eventStartTime = ref("10:00");
const eventEndTime = ref("18:00");
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
const settingCoverImageId = ref("");
const savingEventSlug = ref("");
const reorderingImagesSlug = ref("");
const lastSavedEventSlug = ref("");
const eventSaveRevision = ref(0);

const selectedEventName = computed(() => selectedEvent.value?.event.name || "No event selected");
function seasonLabel(season: Season) {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

function endpoint(path: string) {
  return `${apiUrl.value.replace(/\/$/, "")}${path}`;
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(endpoint(path), { ...options, credentials: "include" });
  if (response.ok || response.status === 204) return response;
  const body = await response.json().catch(() => null);
  throw new Error(body?.error || `Request failed (${response.status}).`);
}


async function loadEvents() {
  loadingEvents.value = true;
  error.value = "";
  try {
    const response = await request("/api/events?includeHidden=true");
    const body = await response.json() as { events: EventSummary[] };
    events.value = await Promise.all(body.events.map(async (event) => {
      const detailResponse = await request(`/api/events/${encodeURIComponent(event.slug)}?includeHidden=true`);
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
    const response = await request(`/api/events/${encodeURIComponent(selectedSlug.value)}?includeHidden=true`);
    selectedEvent.value = await response.json() as EventDetail;
    selectedEventSeason.value = selectedEvent.value.event.season || "";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load event.";
  }
}
async function saveEvent(edit: EditableEvent) {
  error.value = "";
  notice.value = "";
  savingEventSlug.value = edit.slug;
  try {
    await request(`/api/events/${encodeURIComponent(edit.slug)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: edit.name,
        eventDate: edit.eventDate,
        startTime: edit.startTime,
        endTime: edit.endTime,
        season: edit.season || null,
        galleryVisible: edit.galleryVisible,
        showCoverImage: edit.showCoverImage,
      }),
    });
    await loadEvents();
    if (selectedSlug.value === edit.slug) await loadSelectedEvent();
    lastSavedEventSlug.value = edit.slug;
    eventSaveRevision.value += 1;
    notice.value = "Event details saved.";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to save event details.";
  } finally {
    savingEventSlug.value = "";
  }
}


async function reorderImages(event: AdminEvent, imageIds: string[]) {
  error.value = "";
  notice.value = "";
  reorderingImagesSlug.value = event.slug;
  try {
    await request(`/api/events/${encodeURIComponent(event.slug)}/images/order`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageIds }),
    });
    await loadEvents();
    if (selectedSlug.value === event.slug) await loadSelectedEvent();
    notice.value = "Image order saved.";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to reorder images.";
    await loadEvents();
    if (selectedSlug.value === event.slug) await loadSelectedEvent();
  } finally {
    reorderingImagesSlug.value = "";
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

async function setCoverImage(event: AdminEvent, image: EventImage) {
  if (image.isCover) return;
  error.value = "";
  notice.value = "";
  settingCoverImageId.value = image.id;
  try {
    await request(`/api/images/${encodeURIComponent(image.id)}/cover`, {
      method: "PATCH",
    });
    await loadEvents();
    if (selectedSlug.value === event.slug) await loadSelectedEvent();
    notice.value = "Cover image updated.";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to update cover image.";
  } finally {
    settingCoverImageId.value = "";
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
      headers: { "content-type": "application/json" },
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
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: eventName.value,
        eventDate: eventDate.value,
        startTime: eventStartTime.value,
        endTime: eventEndTime.value,
        season: eventSeason.value,
      }),
    });
    const body = await response.json() as { event: EventSummary };
    eventName.value = "";
    eventDate.value = "";
    eventStartTime.value = "10:00";
    eventEndTime.value = "18:00";
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
  const canSetCover = selectedEvent.value?.images.length === 0;

  for (const [index, file] of files.value.entries()) {
    uploadStatuses.value[index] = { name: file.name, state: "uploading" };
    try {
      const coverQuery = canSetCover && index === coverFileIndex.value ? "&cover=true" : "";
      await request(`/api/events/${encodeURIComponent(selectedSlug.value)}/images?filename=${encodeURIComponent(file.name)}${coverQuery}`, {
        method: "POST",
        headers: { "content-type": file.type },
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
  await loadEvents();
  await loadSelectedEvent();
  notice.value = `${uploaded} of ${files.value.length} image${files.value.length === 1 ? "" : "s"} uploaded.`;
}
async function loadAuth() {
  authLoading.value = true;
  error.value = "";
  try {
    const response = await request("/api/auth/me");
    const body = await response.json() as { authenticated: boolean; admin: boolean; user: AuthUser | null };
    authUser.value = body.user;
    isAuthenticated.value = body.authenticated;
    isAdmin.value = body.admin;
    if (isAdmin.value) await loadEvents();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to check Discord login.";
  } finally {
    authLoading.value = false;
  }
}

async function logout() {
  await request("/api/auth/logout", { method: "POST" });
  authUser.value = null;
  isAuthenticated.value = false;
  isAdmin.value = false;
  events.value = [];
  selectedEvent.value = null;
  selectedSlug.value = "";
}

watch(selectedSlug, loadSelectedEvent);
onMounted(loadAuth);
</script>
