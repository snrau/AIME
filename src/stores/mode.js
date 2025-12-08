import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useModeStore = defineStore('mode-store', () => {
  const copyRemoveMode = ref('copy');
  const createMode = ref(true);

  const featureMode = ref(false);

  const isCopyMode = computed(() => copyRemoveMode.value === 'copy');
  const isRemoveMode = computed(() => copyRemoveMode.value === 'remove');
  const isCreateMode = computed(() => createMode.value === true);

  const isFeatureMode = computed(() => featureMode.value === true);

  const setCopyRemoveMode = (newMode) => {
    if (newMode === 'copy' || newMode === 'remove') {
      copyRemoveMode.value = newMode;
    }
  };

  const toggleCopyRemoveMode = () => {
    copyRemoveMode.value = copyRemoveMode.value === 'copy' ? 'remove' : 'copy';
  };

  const setCreateMode = (value) => {
    createMode.value = Boolean(value);
  };

  const toggleCreateMode = () => {
    createMode.value = !createMode.value;
  };

  const setFeatureMode = (value) => {
    featureMode.value = Boolean(value);
  };

  const toggleFeatureMode = () => {
    featureMode.value = !featureMode.value;
  };

  return {
    copyRemoveMode,
    createMode,
    featureMode,
    isCopyMode,
    isRemoveMode,
    isCreateMode,
    isFeatureMode,
    setCopyRemoveMode,
    toggleCopyRemoveMode,
    setCreateMode,
    toggleCreateMode,
    setFeatureMode,
    toggleFeatureMode,
  };
});
