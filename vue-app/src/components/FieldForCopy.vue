<template>
  <h2>Отправьте ссылку своему другу чтобы начать игру</h2>
  <p>{{ pageUrl }}</p>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const pageUrl = ref("");

onMounted(() => {
  setTimeout(() => {
    pageUrl.value = window.location.href;
  });
});
</script>
