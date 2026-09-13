<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Pencil, Trash2 } from "lucide-vue-next";

type Season = "winter" | "spring" | "summer" | "autumn";
type EventImage = { id: string; url: string | null; isCover: boolean };
type AdminEvent = {
  name: string;
  slug: string;
  eventDate: string;
  season: Season | null;
  coverUrl: string | null;
  images: EventImage[];
};
type EditableEvent = { slug: string; name: string; eventDate: string; season: Season | "" };

const props = withDefaults(defineProps<{
  event: AdminEvent;
  seasons: Season[];
  saving?: boolean;
  savedRevision?: number;
  deleting?: boolean;
  deletingImageId?: string;
}>(), {
  saving: false,
  savedRevision: 0,
  deleting: false,
  deletingImageId: "",
});

const emit = defineEmits<{
  (event: "save", edit: EditableEvent): void;
  (event: "delete-event"): void;
  (event: "delete-image", image: EventImage): void;
}>();

const draft = ref<EditableEvent | null>(null);
const isDirty = computed(() => {
  if (!draft.value) return false;
  return (
    draft.value.name !== props.event.name ||
    draft.value.eventDate !== props.event.eventDate ||
    draft.value.season !== (props.event.season || "")
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
    season: props.event.season || "",
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
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-2.5 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="saving || deleting"
          :aria-label="`${draft ? 'Close editor for' : 'Edit'} ${event.name}`"
          @click="toggleEditing"
        >
          <Pencil :size="14" aria-hidden="true" />
          {{ draft ? "Close" : "Edit" }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-2.5 py-2 text-xs font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="deleting || saving"
          :aria-label="`Delete ${event.name}`"
          @click="emit('delete-event')"
        >
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
      <div>
        <label :for="`edit-season-${event.slug}`" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Season</label>
        <select :id="`edit-season-${event.slug}`" v-model="draft.season" class="w-full rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">Uncategorised</option>
          <option v-for="season in seasons" :key="season" :value="season">{{ seasonLabel(season) }}</option>
        </select>
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="rounded-lg border px-3 py-2 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" :disabled="saving" @click="closeEditing">Cancel</button>
        <button type="submit" class="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50" :disabled="saving">
          {{ saving ? "Saving…" : "Save changes" }}
        </button>
      </div>
    </form>

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
            @click.stop="emit('delete-image', image)"
          >
            <Trash2 :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p v-else class="py-4 text-center text-sm text-muted-foreground">No images uploaded.</p>
      <p class="mt-3 text-xs text-muted-foreground">{{ event.images.length }} image{{ event.images.length === 1 ? "" : "s" }}</p>
    </div>
  </article>
</template>
