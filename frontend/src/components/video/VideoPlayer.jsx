import React, { useRef, useEffect, lazy, Suspense } from 'react';
// Lazy load the player to fix hydration/build issues with YouTube player
const ReactPlayer = lazy(() => import('react-player/youtube'));

const ensureHttps = (url) => {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'http:') {
            urlObj.protocol = 'https:';
            return urlObj.toString();
        }
    } catch (e) {
        // If it's not a valid URL object yet (e.g. just a string), manual check
        if (url.startsWith('http://')) {
            return url.replace('http://', 'https://');
        }
    }
    return url;
};

const VideoPlayer = ({ url, onProgress, initialProgress }) => {
    const playerRef = useRef(null);
    const hasSeeked = useRef(false);

    useEffect(() => {
        console.log("VideoPlayer URL:", url);
    }, [url]);

    const handleReady = () => {
        if (initialProgress > 0 && initialProgress < 1 && !hasSeeked.current && playerRef.current) {
            // Seek to the saved fraction
            playerRef.current.seekTo(initialProgress, 'fraction');
            hasSeeked.current = true;
        }
    };

    if (!url) {
        return (
            <div className="w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
                <p className="text-white font-medium">Loading Video...</p>
            </div>
        );
    }

    const secureUrl = ensureHttps(url);

    return (
        <div className="w-full h-full bg-black rounded-lg overflow-hidden relative group shadow-xl">
            <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                    <p className="text-white">Loading Player...</p>
                </div>
            }>
                <ReactPlayer
                    ref={playerRef}
                    url={secureUrl}
                    width="100%"
                    height="100%"
                    controls={true}
                    onProgress={onProgress}
                    onReady={handleReady}
                    onEnded={() => { }}
                    onError={(e) => console.log('Player Error:', e)}
                    config={{
                        youtube: {
                            playerVars: {
                                showinfo: 1,
                                rel: 0,
                                modestbranding: 1
                            }
                        }
                    }}
                />
            </Suspense>
        </div>
    );
};

export default VideoPlayer;
