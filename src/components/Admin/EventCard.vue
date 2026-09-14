<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-vue-next";

type Season = "winter" | "spring" | "summer" | "autumn";
type EventImage = { id: string; url: string | null; isCover: boolean };
type AdminEvent = {
  name: string;
  slug: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  season: Season | null;
  galleryVisible: boolean;
  showCoverImage: boolean;
  coverUrl: string | null;
  images: EventImage[];
};
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

const props = withDefaults(defineProps<{
  event: AdminEvent;
  seasons: Season[];
  saving?: boolean;
  savedRevision?: number;
  deleting?: boolean;
  deletingImageId?: string;
  settingCoverImageId?: string;
  reordering?: boolean;
}>(), {
  saving: false,
  savedRevision: 0,
  deleting: false,
  deletingImageId: "",
  settingCoverImageId: "",
  reordering: false,
});

const emit = defineEmits<{
  (event: "save", edit: EditableEvent): void;
  (event: "delete-event"): void;
  (event: "delete-image", image: EventImage): void;
  (event: "set-cover", image: EventImage): void;
  (event: "reorder-images", imageIds: string[]): void;
}>();

const draft = ref<EditableEvent | null>(null);
const isDirty = computed(() => {
  if (!draft.value) return false;
  return (
    draft.value.name !== props.event.name ||
    draft.value.eventDate !== props.event.eventDate ||
    draft.value.startTime !== props.event.startTime ||
    draft.value.endTime !== props.event.endTime ||
    draft.value.season !== (props.event.season || "") ||
    draft.value.galleryVisible !== props.event.galleryVisible ||
    draft.value.showCoverImage !== props.event.showCoverImage
  );
});

function seasonLabel(season: Season) {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

function toggleEditing() {
  if (draft.value) {
    closeEditing();
    return;
  }

  draft.value = {
    slug: props.event.slug,
    name: props.event.name,
    eventDate: props.event.eventDate,
    startTime: props.event.startTime,
    endTime: props.event.endTime,
    season: props.event.season || "",
    galleryVisible: props.event.galleryVisible,
    showCoverImage: props.event.showCoverImage,
  };
}

function closeEditing() {
  if (isDirty.value && !window.confirm("You have unsaved changes. Discard them?")) return;
  draft.value = null;
}

function save() {
  if (!draft.value || props.saving) return;
  emit("save", { ...draft.value });
}

function moveImage(index: number, offset: number) {
  const targetIndex = index + offset;
  if (props.reordering || targetIndex < 0 || targetIndex >= props.event.images.length) return;
  const imageIds = props.event.images.map((image) => image.id);
  [imageIds[index], imageIds[targetIndex]] = [imageIds[targetIndex], imageIds[index]];
  emit("reorder-images", imageIds);
}

watch(
  () => props.savedRevision,
  (revision, previousRevision) => {
    if (revision !== previousRevision) draft.value = null;
  },
);
</script>

<template>
  <article class="overflow-hidden rounded-2xl border bg-card shadow-sm">
    <div class="flex items-start justify-between gap-4 p-5">
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-wider text-primary">{{ event.season ? seasonLabel(event.season) : "Uncategorised" }}</p>
        <h3 class="mt-1 truncate text-lg font-bold" :title="event.name">{{ event.name }}</h3>
        <time :datetime="event.eventDate" class="mt-1 block text-sm text-muted-foreground">{{ event.eventDate }}</time>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-2.5 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50" :disabled="saving || deleting" :aria-label="`${draft ? 'Close editor for' : 'Edit'} ${event.name}`" @click="toggleEditing">
          <Pencil :size="14" aria-hidden="true" />
          {{ draft ? "Close" : "Edit" }}
        </button>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-2.5 py-2 text-xs font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-50" :disabled="deleting || saving" :aria-label="`Delete ${event.name}`" @click="emit('delete-event')">
          <Trash2 :size="14" aria-hidden="true" />
          {{ deleting ? "Deleting…" : "Delete" }}
        </button>
      </div>
    </div>

    <form v-if="draft" class="space-y-3 border-t bg-background/40 p-4" @submit.prevent="save">
      <div>
        <label :for="`edit-name-${event.slug}`" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
        <input :id="`edit-name-${event.slug}`" v-model="draft.name" type="text" maxlength="120" required class="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label :for="`edit-date-${event.slug}`" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
        <input :id="`edit-date-${event.slug}`" v-model="draft.eventDate" type="date" required class="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label :for="`edit-start-${event.slug}`" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Start time</label>
          <input :id="`edit-start-${event.slug}`" v-model="draft.startTime" type="time" required class="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label :for="`edit-end-${event.slug}`" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">End time</label>
          <input :id="`edit-end-${event.slug}`" v-model="draft.endTime" type="time" required class="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label :for="`edit-season-${event.slug}`" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Season</label>
        <select :id="`edit-season-${event.slug}`" v-model="draft.season" class="w-full rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">Uncategorised</option>
          <option v-for="season in seasons" :key="season" :value="season">{{ seasonLabel(season) }}</option>
        </select>
      </div>
      <fieldset class="space-y-2 rounded-lg border bg-background/60 p-3 text-sm">
        <legend class="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Gallery visibility</legend>
        <label class="flex items-start gap-2">
          <input v-model="draft.galleryVisible" type="checkbox" class="mt-0.5 size-4 accent-primary" />
          <span><span class="font-semibold">Show event in gallery</span><span class="block text-xs text-muted-foreground">Hide events without deleting them.</span></span>
        </label>
        <label class="flex items-start gap-2">
          <input v-model="draft.showCoverImage" type="checkbox" class="mt-0.5 size-4 accent-primary" />
          <span><span class="font-semibold">Show cover image in gallery</span><span class="block text-xs text-muted-foreground">Keep the cover for the event card but omit it from photos.</span></span>
        </label>
      </fieldset>
      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="rounded-lg border px-3 py-2 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" :disabled="saving" @click="closeEditing">Cancel</button>
        <button type="submit" class="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50" :disabled="saving || !isDirty">
          {{ saving ? "Saving…" : "Save changes" }}
        </button>
      </div>
    </form>

    <div class="border-t bg-muted/20 p-4">
      <div v-if="event.images.length" class="flex gap-3 overflow-x-auto pb-1" :aria-label="`${event.images.length} images for ${event.name}`">
        <div v-for="(image, index) in event.images" :key="image.id" class="group relative min-w-28 overflow-hidden rounded-xl border bg-background sm:min-w-32">
          <img v-if="image.url" :src="image.url" :alt="`${event.name} image${image.isCover ? ' (cover)' : ''}`" class="aspect-square w-full object-cover" loading="lazy" />
          <div v-else class="flex aspect-square items-center justify-center p-3 text-center text-xs text-muted-foreground">Image unavailable</div>
          <span v-if="image.isCover" class="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Cover</span>
          <div class="absolute inset-x-1 bottom-1 flex gap-1">
            <button type="button" class="inline-flex flex-1 items-center justify-center rounded-md bg-black/75 p-1.5 text-white transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="reordering || index === 0" :aria-label="`Move image ${index + 1} earlier for ${event.name}`" @click.stop="moveImage(index, -1)">
              <ArrowUp :size="14" aria-hidden="true" />
            </button>
            <button type="button" class="inline-flex flex-1 items-center justify-center rounded-md bg-black/75 p-1.5 text-white transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="reordering || index === event.images.length - 1" :aria-label="`Move image ${index + 1} later for ${event.name}`" @click.stop="moveImage(index, 1)">
              <ArrowDown :size="14" aria-hidden="true" />
            </button>
          </div>
          <button v-if="!image.isCover" type="button" class="absolute right-10 top-2 rounded-md bg-black/75 px-2 py-1.5 text-[10px] font-bold text-white transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!!settingCoverImageId || deletingImageId === image.id || reordering" :aria-label="`Set image as cover for ${event.name}`" @click.stop="emit('set-cover', image)">
            {{ settingCoverImageId === image.id ? "Setting…" : "Set cover" }}
          </button>
          <button type="button" class="absolute right-2 top-2 inline-flex rounded-md bg-black/75 p-1.5 text-white opacity-100 transition hover:bg-destructive sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="deletingImageId === image.id || !!settingCoverImageId || reordering" :aria-label="`Delete image from ${event.name}`" @click.stop="emit('delete-image', image)">
            <Trash2 :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p v-else class="py-4 text-center text-sm text-muted-foreground">No images uploaded.</p>
      <p class="mt-3 text-xs text-muted-foreground">{{ event.images.length }} image{{ event.images.length === 1 ? "" : "s" }}</p>
    </div>
  </article>
</template>
