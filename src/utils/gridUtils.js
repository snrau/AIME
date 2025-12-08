import { Colors } from '@/constants/colors';
import { calculateTonicBasedColor } from '@/utils/tonicColorUtils';
import { ref, onMounted, onUnmounted, computed } from 'vue';

// Responsive breakpoints and their corresponding square dimensions
const RESPONSIVE_CONFIGS = {
  // Extra large screens (desktop)
  xl: {
    minWidth: 1400,
    squareHeight: 80,
    squareWidth: 80,
    squareMargin: 1,
  },
  // Large screens (laptop)
  lg: {
    minWidth: 1200,
    squareHeight: 70,
    squareWidth: 70,
    squareMargin: 1,
  },
  // Medium screens (tablet landscape)
  md: {
    minWidth: 992,
    squareHeight: 60,
    squareWidth: 60,
    squareMargin: 1,
  },
  // Small screens (tablet portrait)
  sm: {
    minWidth: 768,
    squareHeight: 45,
    squareWidth: 45,
    squareMargin: 1,
  },
  // Extra small screens (mobile)
  xs: {
    minWidth: 590,
    squareHeight: 50,
    squareWidth: 50,
    squareMargin: 1,
  },
  // Very small screens (small mobile)
  xxs: {
    minWidth: 0,
    squareHeight: 40,
    squareWidth: 40,
    squareMargin: 1,
  },
};

// Get responsive config based on screen width
function getResponsiveConfig(screenWidth) {
  const breakpoints = Object.values(RESPONSIVE_CONFIGS).sort((a, b) => b.minWidth - a.minWidth);

  for (const config of breakpoints) {
    if (screenWidth >= config.minWidth) {
      return config;
    }
  }

  return RESPONSIVE_CONFIGS.xxs;
}

export const GRID_CONFIG = {
  rows: 7,
  cols: 11,
  squareHeight: 80,
  squareWidth: 80,
  squareMargin: 1,
  containerPadding: 8,
  get roomContainerWidth() {
    const marginCorrectionWidth = this.cols * 2 * this.squareMargin;
    return this.squareWidth * this.cols + marginCorrectionWidth + this.containerPadding;
  },
  get roomContainerHeight() {
    const marginCorrectionHeight = this.rows * 2 * this.squareMargin;
    return this.squareHeight * this.rows + marginCorrectionHeight + this.containerPadding;
  },
  // Update dimensions based on screen width
  updateDimensions(screenWidth) {
    const config = getResponsiveConfig(screenWidth);
    this.squareHeight = config.squareHeight;
    this.squareWidth = config.squareWidth;
    this.squareMargin = config.squareMargin;
  },
};

// Composable for reactive grid config
export function useResponsiveGrid() {
  const gridConfig = ref({
    rows: GRID_CONFIG.rows,
    cols: GRID_CONFIG.cols,
    squareHeight: GRID_CONFIG.squareHeight,
    squareWidth: GRID_CONFIG.squareWidth,
    squareMargin: GRID_CONFIG.squareMargin,
    containerPadding: GRID_CONFIG.containerPadding,
  });

  const updateGridDimensions = () => {
    const screenWidth = window.innerWidth;
    const config = getResponsiveConfig(screenWidth);
    gridConfig.value.squareHeight = config.squareHeight;
    gridConfig.value.squareWidth = config.squareWidth;
    gridConfig.value.squareMargin = config.squareMargin;
  };

  onMounted(() => {
    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateGridDimensions);
  });

  // Create computed properties for container dimensions that update reactively
  const roomContainerWidth = computed(() => {
    const marginCorrectionWidth = gridConfig.value.cols * 2 * gridConfig.value.squareMargin;
    return (
      gridConfig.value.squareWidth * gridConfig.value.cols +
      marginCorrectionWidth +
      gridConfig.value.containerPadding
    );
  });

  const roomContainerHeight = computed(() => {
    const marginCorrectionHeight = gridConfig.value.rows * 2 * gridConfig.value.squareMargin;
    return (
      gridConfig.value.squareHeight * gridConfig.value.rows +
      marginCorrectionHeight +
      gridConfig.value.containerPadding
    );
  });

  return {
    rows: computed(() => gridConfig.value.rows),
    cols: computed(() => gridConfig.value.cols),
    squareHeight: computed(() => gridConfig.value.squareHeight),
    squareWidth: computed(() => gridConfig.value.squareWidth),
    squareMargin: computed(() => gridConfig.value.squareMargin),
    containerPadding: computed(() => gridConfig.value.containerPadding),
    roomContainerWidth,
    roomContainerHeight,
  };
}

// Composable for responsive melody component
export function useResponsiveMelody() {
  const melodyConfig = ref({
    rows: 1,
    cols: 11,
    squareHeight: 70,
    squareWidth: 70,
    squareMargin: 1,
    containerPadding: 8,
  });

  const updateMelodyDimensions = () => {
    const screenWidth = window.innerWidth;
    const config = getResponsiveConfig(screenWidth);
    // Use the same dimensions as the grid
    melodyConfig.value.squareHeight = config.squareHeight;
    melodyConfig.value.squareWidth = config.squareWidth;
    melodyConfig.value.squareMargin = config.squareMargin;
  };

  onMounted(() => {
    updateMelodyDimensions();
    window.addEventListener('resize', updateMelodyDimensions);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateMelodyDimensions);
  });

  // Create computed properties for container dimensions
  const roomContainerWidth = computed(() => {
    const marginCorrectionWidth = melodyConfig.value.cols * 2 * melodyConfig.value.squareMargin;
    return (
      melodyConfig.value.squareWidth * melodyConfig.value.cols +
      marginCorrectionWidth +
      melodyConfig.value.containerPadding
    );
  });

  const roomContainerHeight = computed(() => {
    const marginCorrectionHeight = melodyConfig.value.rows * 2 * melodyConfig.value.squareMargin;
    return (
      melodyConfig.value.squareHeight * melodyConfig.value.rows +
      marginCorrectionHeight +
      melodyConfig.value.containerPadding
    );
  });

  return {
    rows: computed(() => melodyConfig.value.rows),
    cols: computed(() => melodyConfig.value.cols),
    squareHeight: computed(() => melodyConfig.value.squareHeight),
    squareWidth: computed(() => melodyConfig.value.squareWidth),
    squareMargin: computed(() => melodyConfig.value.squareMargin),
    containerPadding: computed(() => melodyConfig.value.containerPadding),
    roomContainerWidth,
    roomContainerHeight,
  };
}

// Composable for responsive buffer component
export function useResponsiveBuffer() {
  const bufferConfig = ref({
    rows: 5,
    cols: 1,
    squareHeight: 70,
    squareWidth: 70,
    squareMargin: 1,
    containerPadding: 8,
  });

  const updateBufferDimensions = () => {
    const screenWidth = window.innerWidth;
    const config = getResponsiveConfig(screenWidth);
    // Use the same dimensions as the grid
    bufferConfig.value.squareHeight = config.squareHeight;
    bufferConfig.value.squareWidth = config.squareWidth;
    bufferConfig.value.squareMargin = config.squareMargin;

    // Switch to horizontal layout for screens below 768px
    if (screenWidth < 768) {
      bufferConfig.value.rows = 1;
      bufferConfig.value.cols = 5;
    } else {
      bufferConfig.value.rows = 5;
      bufferConfig.value.cols = 1;
    }
  };

  onMounted(() => {
    updateBufferDimensions();
    window.addEventListener('resize', updateBufferDimensions);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateBufferDimensions);
  });

  // Create computed properties for container dimensions
  const roomContainerWidth = computed(() => {
    const marginCorrectionWidth = bufferConfig.value.cols * 2 * bufferConfig.value.squareMargin;
    return (
      bufferConfig.value.squareWidth * bufferConfig.value.cols +
      marginCorrectionWidth +
      bufferConfig.value.containerPadding
    );
  });

  const roomContainerHeight = computed(() => {
    const marginCorrectionHeight = bufferConfig.value.rows * 2 * bufferConfig.value.squareMargin;
    return (
      bufferConfig.value.squareHeight * bufferConfig.value.rows +
      marginCorrectionHeight +
      bufferConfig.value.containerPadding
    );
  });

  return {
    rows: computed(() => bufferConfig.value.rows),
    cols: computed(() => bufferConfig.value.cols),
    squareHeight: computed(() => bufferConfig.value.squareHeight),
    squareWidth: computed(() => bufferConfig.value.squareWidth),
    squareMargin: computed(() => bufferConfig.value.squareMargin),
    containerPadding: computed(() => bufferConfig.value.containerPadding),
    roomContainerWidth,
    roomContainerHeight,
  };
}

/**
 * Get square color based on position and optionally sequence data and tonic key
 * If sequenceData and tonicKey are provided, calculates color based on tonic brightness
 * Otherwise uses default position-based colors
 */
export function getSquareColor(row, col, rows, cols, sequenceData = null, tonicKey = null) {
  // If we have sequence data and a tonic key, calculate tonic-based color
  if (sequenceData && tonicKey) {
    const tonicColor = calculateTonicBasedColor(sequenceData, tonicKey);
    if (tonicColor) {
      return tonicColor;
    }
  }

  // Fall back to position-based colors for squares without sequences
  const isTop = row === 0;
  const isBottom = row === rows - 1;
  const isLeft = col === 0;
  const isRight = col === cols - 1;
  const isCorner = (isTop || isBottom) && (isLeft || isRight);

  if (isCorner) return Colors.GREEN;
  if (isTop || isBottom || isLeft || isRight) return Colors.RED;
  return Colors.WHITE;
}

export function calculateRoomDimensions() {
  const marginCorrectionWidth = GRID_CONFIG.cols * 2 * GRID_CONFIG.squareMargin;
  const marginCorrectionHeight = GRID_CONFIG.rows * 2 * GRID_CONFIG.squareMargin;

  return {
    width:
      GRID_CONFIG.squareWidth * GRID_CONFIG.cols +
      marginCorrectionWidth +
      GRID_CONFIG.containerPadding,
    height:
      GRID_CONFIG.squareHeight * GRID_CONFIG.rows +
      marginCorrectionHeight +
      GRID_CONFIG.containerPadding,
  };
}
