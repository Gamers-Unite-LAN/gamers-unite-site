<template>
    <section>
        <iframe 
        class="w-[50rem] m:w-[50rem] h-screen" 
        allow="picture-in-picture full"
        :src="src"></iframe>
    </section>
  </template>
  
<script setup lang="ts">
defineProps<{
    src: string
}>();

// stops weird errors from google
(window as any).DOCS_timing = {};
</script>