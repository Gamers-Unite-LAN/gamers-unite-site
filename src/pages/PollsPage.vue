<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useHead } from "@unhead/vue";
import { formatEventDate } from "@/lib/homepageState";

type PollResult = { gameName: string; votes: number; winner: boolean };
type Poll = {
  category: "modern" | "classic" | "wildcard";
  games: string[];
  status: "scheduled" | "open" | "closed";
  schedule: { openAt: string; warningAt: string; closeAt: string };
  voterGameIndex: number | null;
  results: PollResult[];
};
type PollState = {
  event: { name: string; slug: string; eventDate: string; startTime: string } | null;
  polls: Poll[];
};
type User = { username: string; globalName: string | null };

const apiUrl = (import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const state = ref<PollState>({ event: null, polls: [] });
const user = ref<User | null>(null);
const loading = ref(true);
const error = ref("");
const voting = ref("");
const notice = ref("");
const categoryOrder = ["modern", "classic", "wildcard"] as const;

const orderedPolls = computed(() => categoryOrder.map((category) => state.value.polls.find((poll) => poll.category === category)).filter((poll): poll is Poll => Boolean(poll)));
const displayName = computed(() => user.value?.globalName || user.value?.username || "there");

function endpoint(path: string) {
  return `${apiUrl}${path}`;
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(endpoint(path), { ...options, credentials: "include" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [pollState, authState] = await Promise.all([
      request("/api/polls/current") as Promise<PollState>,
      request("/api/auth/me") as Promise<{ user: User | null }>,
    ]);
    state.value = pollState;
    user.value = authState.user;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to load the polls.";
  } finally {
    loading.value = false;
  }
}

function signIn() {
  window.location.href = endpoint(`/api/auth/discord?returnTo=${encodeURIComponent("/polls")}`);
}

async function vote(poll: Poll, gameIndex: number) {
  if (!user.value || poll.status !== "open") return;
  voting.value = poll.category;
  error.value = "";
  notice.value = "";
  try {
    const body = await request(`/api/events/${encodeURIComponent(state.value.event?.slug || "")}/polls/${poll.category}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameIndex }),
    }) as { poll: Poll };
    const index = state.value.polls.findIndex((candidate) => candidate.category === poll.category);
    if (index >= 0) state.value.polls[index] = body.poll;
    notice.value = "Your vote is saved. You can change it while the poll is open.";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Unable to save your vote.";
  } finally {
    voting.value = "";
  }
}

async function signOut() {
  await request("/api/auth/logout", { method: "POST" });
  user.value = null;
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

useHead({ title: "Vote for LAN games | Gamers Unite!" });
onMounted(load);
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
    <header class="mx-auto max-w-3xl text-center">
      <p class="text-sm font-bold uppercase tracking-[0.25em] text-primary">Game vote</p>
      <h1 class="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl">Choose what we play.</h1>
      <p class="mt-5 text-lg leading-8 text-muted-foreground">Pick one game in each category for the next Gamers Unite! LAN. Sign in with Discord so every person gets one vote per poll.</p>
    </header>

    <p v-if="loading" class="py-16 text-center text-muted-foreground" role="status">Loading polls…</p>
    <p v-else-if="error" class="mx-auto mt-10 max-w-2xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-destructive" role="alert">{{ error }}</p>
    <section v-else-if="!state.event" class="mx-auto mt-12 max-w-2xl rounded-2xl border border-dashed p-10 text-center">
      <h2 class="text-2xl font-bold">No poll is open yet</h2>
      <p class="mt-3 text-muted-foreground">The next game vote will appear one month before the next LAN event.</p>
    </section>
    <template v-else>
      <section class="mx-auto mt-10 flex max-w-5xl flex-wrap items-end justify-between gap-4 rounded-2xl border bg-card p-6 shadow-sm" aria-labelledby="event-heading">
        <div>
          <p class="text-sm font-bold uppercase tracking-wider text-primary">Next LAN</p>
          <h2 id="event-heading" class="mt-1 text-3xl font-extrabold">{{ state.event.name }}</h2>
          <p class="mt-1 text-muted-foreground">{{ formatEventDate(state.event.eventDate) }}</p>
        </div>
        <div v-if="user" class="flex items-center gap-3 text-sm">
          <span class="text-muted-foreground">Voting as <strong class="text-foreground">{{ displayName }}</strong></span>
          <button type="button" class="rounded-lg border px-3 py-2 font-bold transition hover:border-primary hover:text-primary" @click="signOut">Sign out</button>
        </div>
        <button v-else type="button" class="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground shadow-brand transition hover:bg-secondary" @click="signIn">Sign in with Discord to vote</button>
      </section>

      <div class="mt-8 grid gap-6 lg:grid-cols-3">
        <article v-for="poll in orderedPolls" :key="poll.category" class="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <header class="border-b bg-muted/20 p-5">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-xl font-extrabold capitalize">{{ poll.category }}</h3>
              <span class="rounded-full border px-2.5 py-1 text-xs font-bold capitalize text-muted-foreground">{{ poll.status }}</span>
            </div>
            <p v-if="poll.status === 'open'" class="mt-2 text-sm text-muted-foreground">Closes {{ dateTimeLabel(poll.schedule.closeAt) }}</p>
            <p v-else-if="poll.status === 'scheduled'" class="mt-2 text-sm text-muted-foreground">Opens {{ dateTimeLabel(poll.schedule.openAt) }}</p>
            <p v-else class="mt-2 text-sm text-muted-foreground">Final results</p>
          </header>

          <div class="space-y-3 p-5">
            <button v-for="(result, index) in poll.results" :key="result.gameName" type="button" :disabled="poll.status !== 'open' || !user || voting === poll.category" :aria-pressed="poll.voterGameIndex === index" class="w-full rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:opacity-90" :class="poll.voterGameIndex === index ? 'border-primary bg-primary/10' : 'hover:border-primary/60 hover:bg-primary/5'" @click="vote(poll, index)">
              <div class="flex items-center justify-between gap-3">
                <span class="font-bold">{{ result.gameName }}</span>
                <span class="shrink-0 text-sm font-bold text-muted-foreground">{{ result.votes }} vote{{ result.votes === 1 ? '' : 's' }}</span>
              </div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${Math.max(result.votes, result.winner ? 1 : 0) / Math.max(1, Math.max(...poll.results.map((candidate) => candidate.votes))) * 100}%` }"></div>
              </div>
              <span v-if="poll.voterGameIndex === index" class="mt-2 block text-xs font-bold text-primary">Your vote</span>
              <span v-if="poll.status === 'closed' && result.winner" class="mt-2 block text-xs font-bold text-primary">Winner</span>
            </button>
          </div>

          <footer v-if="poll.status === 'open' && !user" class="border-t bg-muted/10 p-5 text-sm text-muted-foreground">
            <button type="button" class="font-bold text-primary hover:underline" @click="signIn">Sign in with Discord</button> to cast your vote.
          </footer>
        </article>
      </div>
    </template>

    <p v-if="notice" class="mx-auto mt-6 max-w-5xl rounded-lg border border-primary/30 bg-primary/10 p-4 font-medium" role="status">{{ notice }}</p>
  </main>
</template>
