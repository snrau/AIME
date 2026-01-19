# AIME - Ai Music Exploration

**AIME** is an interactive web application for creating, exploring, and manipulating musical sequences using AI-powered melody generation. Built with Vue 3 and Google's Magenta.js, AIME provides an intuitive grid-based interface where you can draw melodies, generate variations, and create musical interpolations.

The application is optimized for desktop and tablet devices (iPad), offering touch-friendly controls and responsive design for creative music exploration on multiple platforms.

## Hosted and online version

https://snrau.github.io/AIME/#/

## Tablet Fullscreen in Chrome

chrome://flags

Disable EdgeToEdgeEverywhere

## Getting Started

### Desktop

1. Install dependencies:

```sh
npm install
```

2. Start the development server:

```sh
npm run dev
```

3. Open your browser and navigate to:

```
http://localhost:5174/
```

### iPad/Mobile Device

To access the application on an iPad or other mobile device on your local network:

1. Start the development server with the host option:

```sh
npm run dev -- --host
```

2. Find your computer's local IP address:

   - **macOS/Linux**: Open Terminal and run:
     ```sh
     ifconfig | grep "inet " | grep -v 127.0.0.1
     ```
   - **Windows**: Open Command Prompt and run:
     ```sh
     ipconfig
     ```
   - Look for your local IP address (usually starts with `192.168.x.x` or `10.x.x.x`)

3. On your iPad, open Safari and navigate to:

```
http://YOUR_IP_ADDRESS:5174/
```

Replace `YOUR_IP_ADDRESS` with the IP address you found in step 2 (e.g., `http://192.168.1.100:5174/`)

**Note:** Make sure your iPad and computer are connected to the same Wi-Fi network.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## File Structure

```
├── public/                 # Static assets
│   └── midi/              # MIDI files for melody generation
├── src/
│   ├── assets/            # CSS and SVG assets
│   ├── components/        # Vue components
│   │   ├── BufferComponent.vue       # Buffer management component
│   │   ├── CircleOfFifths.vue        # Musical key selection interface
│   │   ├── DrawComponent.vue         # Piano roll editor
│   │   ├── HeaderComponent.vue       # Application header
│   │   ├── HelpComponent.vue         # User guide and documentation
│   │   ├── HomeComponent.vue         # Home view component
│   │   ├── MelodyComponent.vue       # Melody playback and display
│   │   ├── PopupModal.vue            # Modal dialog component
│   │   ├── RoomComponent.vue         # Main grid workspace
│   │   ├── RoomSelection.vue         # Saved rooms selector
│   │   ├── SequencePreview.vue       # Sequence preview component
│   │   └── SquareComponent.vue       # Individual grid square
│   ├── composables/       # Reusable composition functions
│   │   ├── useFirstSquareLogic.js    # First square creation logic
│   │   ├── useFormations.js          # Grid formation patterns
│   │   ├── useGrid.js                # Grid management utilities
│   │   └── usePullSquare.js          # Square dragging and interpolation
│   ├── constants/         # Application constants
│   │   └── colors.js                 # Color definitions
│   ├── router/            # Vue Router configuration
│   ├── services/          # External services
│   │   └── magentaService.js         # Magenta.js AI music generation
│   ├── stores/            # Pinia state management
│   │   ├── counter.js                # Counter state (example)
│   │   ├── gridHistory.js            # Grid history and undo/redo
│   │   ├── mode.js                   # Application mode (create/remove)
│   │   ├── popupStore.js             # Popup state management
│   │   ├── roomStore.js              # Room save/load state
│   │   └── tonicKey.js               # Musical key and tonic state
│   ├── utils/             # Utility functions
│   │   ├── gridUtils.js              # Grid manipulation helpers
│   │   └── tonicColorUtils.js        # Tonal color calculations
│   └── views/             # View components
│       └── HomeView.vue              # Main application view
```

## Architecture

This application is built with **Vue 3** and **Vite**, using the Composition API for reactive state management. The architecture follows a component-based design with clear separation of concerns:

### Core Technologies

- **Vue 3**: JavaScript framework with Composition API
- **Vite**: Frontend build tool for fast development
- **Pinia**: Official state management library for Vue 3
- **Magenta.js**: Google's machine learning library for music generation
- **Font Awesome**: Icon library for UI elements

### Key Architectural Patterns

1. **Composables**: Reusable logic extracted into composition functions (e.g., `useGrid`, `usePullSquare`)
2. **State Management**: Centralized state using Pinia stores for grid history, room data, and application modes
3. **Service Layer**: Separation of AI music generation logic into dedicated services
4. **Reactive Grid System**: Dynamic grid management with interpolation and melody generation capabilities
5. **MIDI Integration**: Support for both Web MIDI API and fallback audio playback

## Features and How to Use

### Getting Started with Your First Sequence

1. **Create Your First Sequence**: Click on the square in the middle of the grid to open the piano roll editor
2. **Draw Notes**: Click and drag on the piano roll to create notes at different pitches and durations
3. **Save**: Click the save button to add your sequence to the grid
4. **Auto-Generation**: Three additional squares with similar melodies will be automatically generated using AI

### Piano Roll Editor

The piano roll editor provides a comprehensive interface for creating and editing musical sequences:

- **Piano Roll Grid**: Click and drag to draw notes across different pitches (C4 to F6) and time steps
- **Piano Keys**: Click on the left-side piano keys to preview individual notes
- **Playback**: Play your sequence to hear how it sounds
- **Random Generation**: Click the dice button to generate a random note sequence as a creative starting point
- **Controls**: Save your work, reset the grid, or close the editor
- **Smart Note Grouping**: Continuous notes are automatically grouped when drawing across multiple steps

### Working with Squares

#### Moving & Interpolating Melodies

- **Drag to Interpolate**: Pull a square to a new position. If another square is nearby, the system will create a musical interpolation between the two melodies
- **Simple Moving**: If no interpolation partner is found, the square simply moves to the new position
- **Valid Positions**: Green highlighting indicates where a square can be placed

#### Creating New Squares

1. Ensure **Create Mode** is active (default setting, toggle located above buffer 2)
2. Click on any empty grid position
3. Add a note sequence using the piano roll editor
4. The square becomes available for melody interpolation and sequencing

#### Removing Squares

1. Toggle the slider above buffer 2 to **Remove Mode**
2. Click on any square to remove it from the grid
3. **Note**: Dragging squares for moving/copying still works in Remove Mode

### Drawing a Melody Sequence

Create complex melodic sequences by connecting multiple squares:

1. **Activate Drawing Mode**: Toggle the drawing mode switch (next to create mode, above the copy slider)
2. **Draw Your Path**: Click and drag to draw a line across the squares in your grid
3. **Automatic Sequencing**: All squares the line passes through are added to the melody in the order crossed
4. **Play**: Use the play button in the melody container to listen to your created sequence

### Saving & Loading Workspaces

- **Save Room**: Click the save button in the top-left corner of the header to save your current workspace
- **Load Rooms**: Access previously saved rooms through the rooms window (button next to save in the header)
- **Persistent Storage**: All rooms are saved locally in your browser

### Tonal Colors

The application uses an intelligent color system to visualize musical tonality:

- **Color Coding**: Squares are colored based on whether their average pitch is bright or dark relative to the selected tonic
- **Change Tonic**: Use the Circle of Fifths in the header (next to room selection) to select different tonic tones
- **Visual Harmony**: Colors help identify harmonic relationships between different melody squares

### AI-Powered Features

- **Similar Melody Generation**: Magenta.js AI automatically generates variations of your melodies
- **Melody Interpolation**: Smoothly transition between two different melodies using machine learning
- **Creative Assistance**: Random generation and AI suggestions help overcome creative blocks
