import React, { useMemo } from 'react';

const VideoPlayer = ({ url }) => {
    // Convert YouTube URL to Embed URL
    const embedUrl = useMemo(() => {
        if (!url) return "";
        try {
            // Regex to extract video ID from various YouTube URL formats
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);

            if (match && match[2].length === 11) {
                // Return standard embed URL
                return `https://www.youtube.com/embed/${match[2]}`;
            }
            // Return original if regex doesn't match (fallback for other sources)
            return url;
        } catch (error) {
            console.error("Error parsing video URL:", error);
            return url;
        }
    }, [url]);

    return (
        <div className="w-full h-full bg-black rounded-lg overflow-hidden relative group shadow-xl">
            <iframe
                src={embedUrl}
                title="Course Video"
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
            />
        </div>
    );
};

export default VideoPlayer;
