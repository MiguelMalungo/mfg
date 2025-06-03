# Media Files for Miguel Ferraz Guedes Website

This directory contains all the static media files for the website. Please follow this organization structure:

## Directory Structure

```
/public
  /images     - For all image files (jpg, png, webp, etc.)
  /videos     - For video files including the store page hero video
```

## Required Media Files

### Store Page Hero Video
- File: `/public/videos/video-placeholder.mp4`
- This video will appear as a full-page background on the store page with a black overlay at 40% opacity

### Collection Images
Place your collection images in the `/public/images` directory and update the references in the code accordingly.

## How to Reference Media Files in Code

In Next.js, you can reference files in the public directory by using the root path:

```jsx
// For images
<img src="/images/your-image.jpg" alt="Description" />

// For videos (already configured)
<ReactPlayer url="/videos/video-placeholder.mp4" />
```

## Image Optimization

Next.js provides an Image component that optimizes images automatically. When using actual images (not placeholders), consider using the Next.js Image component:

```jsx
import Image from 'next/image';

// Then in your component
<Image 
  src="/images/your-image.jpg"
  alt="Description"
  width={500}
  height={300}
  layout="responsive"
/>
```

This will give you better performance and loading experience for your website visitors.
