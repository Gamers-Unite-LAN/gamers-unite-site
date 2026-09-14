<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-vue-next";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "radix-vue";

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

const isEditing = ref(false);
const draft = ref<EditableEvent | null>(null);
const orderedImages = ref<EventImage[]>([]);
const draggedImageId = ref("");
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

function openEditor() {
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
  orderedImages.value = [...props.event.images];
  isEditing.value = true;
}

function closeEditing() {
  if (isDirty.value && !window.confirm("You have unsaved changes. Discard them?")) {
    isEditing.value = true;
    return;
  }
  isEditing.value = false;
  draft.value = null;
  draggedImageId.value = "";
}

function handleOpenChange(open: boolean) {
  if (open) {
    isEditing.value = true;
    return;
  }
  closeEditing();
}

function save() {
  if (!draft.value || props.saving) return;
  emit("save", { ...draft.value });
}

function commitImageOrder(images: EventImage[]) {
  const currentIds = props.event.images.map((image) => image.id);
  const seen = new Set<string>();
  const ordered = images.filter((image) => currentIds.includes(image.id) && !seen.has(image.id));
  ordered.forEach((image) => seen.add(image.id));
  ordered.push(...props.event.images.filter((image) => !seen.has(image.id)));
  orderedImages.value = ordered;
  emit("reorder-images", ordered.map((image) => image.id));
}

function moveImage(index: number, offset: number) {
  const targetIndex = index + offset;
  if (props.reordering || targetIndex < 0 || targetIndex >= orderedImages.value.length) return;
  const images = [...orderedImages.value];
  [images[index], images[targetIndex]] = [images[targetIndex], images[index]];
  commitImageOrder(images);
}

function startDragging(image: EventImage, dragEvent: DragEvent) {
  draggedImageId.value = image.id;
  if (dragEvent.dataTransfer) {
    dragEvent.dataTransfer.effectAllowed = "move";
    dragEvent.dataTransfer.setData("text/plain", image.id);
  }
}

function dropImage(targetImage: EventImage, dropEvent: DragEvent) {
  const sourceId = dropEvent.dataTransfer?.getData("text/plain") || draggedImageId.value;
  const sourceIndex = orderedImages.value.findIndex((image) => image.id === sourceId);
  const targetIndex = orderedImages.value.findIndex((image) => image.id === targetImage.id);
  draggedImageId.value = "";
  if (props.reordering || sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
  const images = [...orderedImages.value];
  const [source] = images.splice(sourceIndex, 1);
  images.splice(targetIndex, 0, source);
  commitImageOrder(images);
}

function syncImages() {
  if (!props.reordering) orderedImages.value = [...props.event.images];
}

watch(
  () => props.savedRevision,
  (revision, previousRevision) => {
    if (revision !== previousRevision) closeEditing();
  },
);
watch(() => props.event.images, syncImages, { deep: true });
</script>

<template>
  <DialogRoot :open="isEditing" @update:open="handleOpenChange">
    <article class="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div class="flex items-start justify-between gap-4 p-5">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-wider text-primary">{{ event.season ? seasonLabel(event.season) : "Uncategorised" }}</p>
          <h3 class="mt-1 truncate text-lg font-bold" :title="event.name">{{ event.name }}</h3>
          <time :datetime="event.eventDate" class="mt-1 block text-sm text-muted-foreground">{{ event.eventDate }}</time>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <DialogTrigger as-child>
            <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-2.5 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50" :disabled="saving || deleting" :aria-label="`Edit ${event.name}`" @click="openEditor">
              <Pencil :size="14" aria-hidden="true" />
              Edit
            </button>
          </DialogTrigger>
          <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-2.5 py-2 text-xs font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-50" :disabled="deleting || saving" :aria-label="`Delete ${event.name}`" @click="emit('delete-event')">
            <Trash2 :size="14" aria-hidden="true" />
            {{ deleting ? "Deleting…" : "Delete" }}
          </button>
        </div>
      </div>

      <div class="border-t bg-muted/20 p-4">
        <div v-if="event.images.length" class="flex gap-3 overflow-x-auto pb-1" :aria-label="`${event.images.length} images for ${event.name}`">
          <div v-for="image in event.images" :key="image.id" class="relative min-w-28 overflow-hidden rounded-xl border bg-background sm:min-w-32">
            <img v-if="image.url" :src="image.url" :alt="`${event.name} image${image.isCover ? ' (cover)' : ''}`" class="aspect-square w-full object-cover" loading="lazy" />
            <div v-else class="flex aspect-square items-center justify-center p-3 text-center text-xs text-muted-foreground">Image unavailable</div>
            <span v-if="image.isCover" class="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Cover</span>
          </div>
        </div>
        <p v-else class="py-4 text-center text-sm text-muted-foreground">No images uploaded.</p>
        <p class="mt-3 text-xs text-muted-foreground">{{ event.images.length }} image{{ event.images.length === 1 ? "" : "s" }}</p>
      </div>
    </article>

    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl focus:outline-none">
        <div class="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div>
            <DialogTitle class="text-2xl font-bold text-foreground">Edit {{ event.name }}</DialogTitle>
            <DialogDescription class="mt-1 text-sm text-muted-foreground">Update event details and arrange the gallery images.</DialogDescription>
          </div>
          <DialogClose as-child>
            <button type="button" class="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Close event editor">
              <X :size="20" aria-hidden="true" />
            </button>
          </DialogClose>
        </div>

        <form v-if="draft" class="min-h-0 overflow-y-auto" @submit.prevent="save">
          <div class="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div class="space-y-4">
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
                  <span><span class="font-semibold">Show cover image in gallery</span><span class="block text-xs text-muted-foreground">Omit the cover image from the public gallery when disabled.</span></span>
                </label>
              </fieldset>
            </div>

            <section aria-labelledby="event-images-heading">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 id="event-images-heading" class="text-lg font-bold">Gallery images</h3>
                  <p class="mt-1 text-sm text-muted-foreground">Drag images into the order visitors should see.</p>
                </div>
                <span class="shrink-0 text-sm text-muted-foreground">{{ orderedImages.length }} image{{ orderedImages.length === 1 ? "" : "s" }}</span>
              </div>
              <div v-if="orderedImages.length" class="mt-4 grid gap-3 sm:grid-cols-2">
                <div
                  v-for="(image, index) in orderedImages"
                  :key="image.id"
                  class="group relative overflow-hidden rounded-xl border bg-background transition"
                  :class="draggedImageId === image.id ? 'border-primary opacity-60' : 'border-border'"
                  draggable="true"
                  :aria-label="`${event.name} image ${index + 1}${image.isCover ? ', cover' : ''}`"
                  @dragstart="startDragging(image, $event)"
                  @dragend="draggedImageId = ''"
                  @dragover.prevent
                  @drop.prevent="dropImage(image, $event)"
                >
                  <img v-if="image.url" :src="image.url" :alt="`${event.name} image${image.isCover ? ' (cover)' : ''}`" class="aspect-[4/3] w-full object-cover" loading="lazy" />
                  <div v-else class="flex aspect-[4/3] items-center justify-center p-4 text-center text-sm text-muted-foreground">Image unavailable</div>
                  <span v-if="image.isCover" class="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Cover</span>
                  <div class="flex items-center justify-between gap-2 border-t px-2 py-2">
                    <span class="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><GripVertical :size="14" aria-hidden="true" /> Image {{ index + 1 }}</span>
                    <div class="flex gap-1">
                      <button type="button" class="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40" :disabled="reordering || index === 0" :aria-label="`Move image ${index + 1} earlier for ${event.name}`" @click="moveImage(index, -1)">
                        <ArrowUp :size="14" aria-hidden="true" />
                      </button>
                      <button type="button" class="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40" :disabled="reordering || index === orderedImages.length - 1" :aria-label="`Move image ${index + 1} later for ${event.name}`" @click="moveImage(index, 1)">
                        <ArrowDown :size="14" aria-hidden="true" />
                      </button>
                      <button v-if="!image.isCover" type="button" class="rounded-md px-2 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50" :disabled="!!settingCoverImageId || deletingImageId === image.id || reordering" :aria-label="`Set image as cover for ${event.name}`" @click="emit('set-cover', image)">
                        {{ settingCoverImageId === image.id ? "Setting…" : "Set cover" }}
                      </button>
                      <button type="button" class="rounded-md p-1.5 text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-50" :disabled="deletingImageId === image.id || !!settingCoverImageId || reordering" :aria-label="`Delete image from ${event.name}`" @click="emit('delete-image', image)">
                        <Trash2 :size="14" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p v-else class="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No images uploaded.</p>
              <p class="mt-3 text-xs text-muted-foreground">Drag and drop works with a mouse. The arrow controls also support keyboard reordering.</p>
            </section>
          </div>

          <div class="flex justify-end gap-2 border-t bg-background/50 px-6 py-4">
            <DialogClose as-child>
              <button type="button" class="rounded-lg border px-3 py-2 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" :disabled="saving">Cancel</button>
            </DialogClose>
            <button type="submit" class="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50" :disabled="saving || !isDirty">
              {{ saving ? "Saving…" : "Save changes" }}
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
