# Poetry Book Website

A minimalist React website for a collection of 66 poems, designed with a clean white background and black typography, inspired by The Way of Code website.

## Project Structure

```
book/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── media/       # Directory for images and media files
├── src/
│   ├── components/
│   │   ├── BookCover.jsx      # Cover page component
│   │   ├── PoemPage.jsx       # Individual poem page component
│   │   └── TableOfContents.jsx # Table of contents component
│   ├── App.css      # Main application styles
│   ├── App.jsx      # Main application component
│   ├── index.css    # Global styles
│   ├── index.js     # Entry point
│   └── reportWebVitals.js
└── package.json     # Project dependencies and scripts
```

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Build for production:
   ```
   npm run build
   ```

## Adding Poems

To add poems to the collection:

1. Edit the `App.jsx` file and update the poems array with your actual poem content.
2. Place any images in the `public/media/` directory.
3. For the book cover, add an image named `cover.jpg` to the `public/media/` directory.

## Features

- Clean, minimalist design with white background and black typography
- Book cover page
- Table of contents with links to all 66 poems
- Individual poem pages with navigation between poems
- Responsive design for all devices
