# Video Embedding Guide

This project uses `react-player` to embed videos from YouTube and Vimeo. This approach avoids hosting large video files on our server, saving storage and bandwidth.

## 1. Implementation Details

### Component: `VideoPlayer.jsx`
Located in `frontend/src/components/video/VideoPlayer.jsx`.
- **Library**: `react-player` handles the iframe embedding and API events.
- **Fullscreen**: `screenfull` library manages cross-browser fullscreen toggling.
- **Controls**: Custom overlays are built with Tailwind CSS for a consistent look across different platforms (since YouTube/Vimeo native controls vary).

### Progress Tracking
- **Frontend**: The player fires `onProgress` events. We capture the `played` fraction (0.0 to 1.0).
- **Backend**: We added `playback_position` (Float) to the `Progress` table.
- **Resume**: When loading a course, `CourseDetail.jsx` fetches `playback_position` and passes it to `VideoPlayer` as `initialProgress`, allowing users to pick up where they left off.

## 2. Best Practices

*   **Lazy Loading**: Use `react-player/lazy` to only load the heavy iframe when the component is actually in the viewport.
*   **Database Storage**: Store only the clean URL (e.g., `https://www.youtube.com/watch?v=...`). Do not store the iframe HTML code.
    *   *Why?* It's safer (prevents XSS) and allows us to change the player implementation later without migrating data.
*   **Privacy**: Use "Privacy Enhanced Mode" for YouTube (`youtube-nocookie.com`) if GDPR compliance is strict.
*   **Throttling**: Do not send progress updates to the backend every second.
    *   *Implemented*: We currently save on manual action or completion.
    *   *Improvement*: Implement a `debounce` or `interval` (e.g., every 30s) for auto-saving.

## 3. Limitations & Alternatives

### Limitations of Embedding
*   **Offline Access**: Users cannot download videos for offline viewing (unlike self-hosted files).
*   **Ads**: YouTube/Vimeo free accounts will show ads.
*   **Dependency**: If the video is deleted on the host platform, it breaks on our site.
*   **Analytics**: We only get what we track (playback position). Granular heatmaps require paid accounts or custom players.

### Alternatives
1.  **Self-Hosting (FFmpeg + HTML5)**:
    *   *Pros*: Full control, no ads, offline capability.
    *   *Cons*: High storage/bandwidth costs, need to handle transcoding (HLS/DASH) for smooth streaming.
2.  **Paid Video Hosting (Mux, Cloudflare Stream)**:
    *   *Pros*: Developer-friendly APIs, great performance, no ads.
    *   *Cons*: Recurring monthly costs.
