<script setup>
import { usePopupStore } from '@/stores/popupStore';
import { computed } from 'vue';

const store = usePopupStore();

const props = defineProps({
  type: String,
  title: String,
});

const isVisible = computed(() => store.activePopup === props.type);

const closePopup = () => store.closePopup();
</script>

<template>
  <div v-if="isVisible" class="popup-overlay" @click="closePopup">
    <div class="popup-content" @click.stop>
      <header>
        <h2>{{ title }}</h2>
        <button @click="closePopup">&times;</button>
      </header>
      <div class="popup-body">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.popup-content {
  background: var(--popup-color);
  color: white;
  padding-bottom: 20px;
  padding-left: 20px;
  padding-right: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

header {
  display: flex;
  justify-content: space-between;
  position: relative;
}

header button {
  background-color: white;
  border: none;
  width: 25px;
  height: 25px;
  border-radius: 5px;
  font-size: 21px;
  position: absolute;
  right: -10px;
  top: 10px;
  transition: all 0.2s ease;
}

header button:hover {
  transform: scale(1.08);
  background-color: #e0e0e0;
  cursor: pointer;
}
</style>
