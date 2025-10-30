
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as musicMetadata from 'https://jspm.dev/music-metadata-browser';
import { Track } from './types';
import { PlayIcon, PauseIcon, VolumeUpIcon, MusicNoteIcon, PreviousIcon, NextIcon, CloseIcon, PhotoIcon, SearchIcon } from './components/Icons';

// Helper Functions
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getBestEffortDecodedString = (text: string | undefined): string => {
    if (!text) return '';
    try {
        let isMisinterpretedUTF16BE = true;
        let reconstructed = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            if ((charCode & 0x00FF) === 0 && (charCode >> 8) >= 0x20 && (charCode >> 8) <= 0x7E) {
                reconstructed += String.fromCharCode(charCode >> 8);
            } else {
                isMisinterpretedUTF16BE = false;
                break;
            }
        }
        if (isMisinterpretedUTF16BE && reconstructed) return reconstructed;
        let isPotentiallyGarbled = true;
        for (let i = 0; i < text.length; i++) {
            if (text.charCodeAt(i) > 255) {
                isPotentiallyGarbled = false;
                break;
            }
        }
        if (!isPotentiallyGarbled) return text;
        const buffer = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
            buffer[i] = text.charCodeAt(i);
        }
        try {
            const decodedUtf8 = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
            if (decodedUtf8 !== text) return decodedUtf8;
        } catch (e) {}
        try {
            const decodedSjis = new TextDecoder('shift-jis', { fatal: true }).decode(buffer);
            if (decodedSjis !== text) return decodedSjis;
        } catch (e) {}
    } catch (e) {
        console.error("Error during text re-decoding:", e);
    }
    return text;
};

// --- Modal Component ---
interface SetArtworkModalProps {
    isOpen: boolean;
    onClose: () => void;
    track: Track | null;
    onApply: (newArtUrl: string) => void;
}

const SetArtworkModal: React.FC<SetArtworkModalProps> = ({ isOpen, onClose, track, onApply }) => {
    const [imageUrl, setImageUrl] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [error, setError] = useState('');
    const [isValidImage, setIsValidImage] = useState(false);
    
    useEffect(() => {
        if (!isOpen) {
            setImageUrl('');
            setPreviewUrl('');
            setError('');
            setIsValidImage(false);
        }
    }, [isOpen]);

    useEffect(() => {
        setIsValidImage(false);
        const handler = setTimeout(() => {
            if (imageUrl.startsWith('http')) {
                setPreviewUrl(imageUrl);
                setError('');
            } else if (imageUrl) {
                setError('Please enter a valid URL starting with http or https.');
                setPreviewUrl('');
            } else {
                setError('');
                setPreviewUrl('');
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [imageUrl]);

    const handleImageLoad = () => {
        setIsValidImage(true);
        setError('');
    };

    const handleImageError = () => {
        setIsValidImage(false);
        if(imageUrl) setError('Could not load image. Check the URL.');
    };
    
    if (!isOpen) return null;

    const searchQuery = encodeURIComponent(`"${track?.album}" "${track?.artist}"`);
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${searchQuery}`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg text-white transform transition-all animate-fade-in-up">
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <PhotoIcon className="w-6 h-6 text-purple-400" />
                        Set Album Artwork
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><CloseIcon className="w-5 h-5" /></button>
                </header>
                <main className="p-6">
                    <div className="aspect-square bg-gray-900/50 rounded-lg flex items-center justify-center overflow-hidden mb-4">
                        {previewUrl ? (
                            <img src={previewUrl} onLoad={handleImageLoad} onError={handleImageError} alt="Album art preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center text-gray-500">
                                <MusicNoteIcon className="w-20 h-20 mx-auto" />
                                <p>Image preview will appear here</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="imageUrlInput" className="text-sm font-medium text-gray-300">Image URL</label>
                        <input
                            id="imageUrlInput"
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Paste image URL here..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        />
                         <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:underline flex items-center gap-1.5 justify-end">
                            <SearchIcon className="w-4 h-4" />
                            Search on Google Images
                        </a>
                    </div>
                    {error && <p className="text-red-400 text-center mt-3 text-sm">{error}</p>}
                </main>
                <footer className="p-4 bg-gray-900/50 rounded-b-2xl flex items-center justify-end gap-3">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => onApply(previewUrl)} disabled={!isValidImage} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                        Use This Image
                    </button>
                </footer>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isArtModalOpen, setIsArtModalOpen] = useState(false);
  
  const currentTrack = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;

  useEffect(() => {
    return () => {
      playlist.forEach(track => {
        if (track.blobUrl.startsWith('blob:')) URL.revokeObjectURL(track.blobUrl);
        if (track.albumArtUrl && track.albumArtUrl.startsWith('blob:')) URL.revokeObjectURL(track.albumArtUrl);
      });
    };
  }, [playlist]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setError(null);
    if (audioRef.current) audioRef.current.src = "";
    playlist.forEach(track => {
      if (track.blobUrl.startsWith('blob:')) URL.revokeObjectURL(track.blobUrl);
      if (track.albumArtUrl && track.albumArtUrl.startsWith('blob:')) URL.revokeObjectURL(track.albumArtUrl);
    });
    setPlaylist([]);
    setCurrentTrackIndex(null);
    setIsPlaying(false);

    try {
      const newTracks = await Promise.all(Array.from(files).map(async (file: File, index): Promise<Track> => {
        const mm = await musicMetadata.parseBlob(file);
        const getNativeTag = (tagId: 'TIT2' | 'TPE1' | 'TALB'): string | undefined => {
            const tagPriority = ['ID3v2.4', 'ID3v2.3', 'ID3v2.2'];
            for (const tagType of tagPriority) {
                const nativeTags = mm.native[tagType] as { id: string, value: any }[] | undefined;
                if (nativeTags) {
                    const tag = nativeTags.find(t => t.id === tagId);
                    if (tag && tag.value) {
                        if (typeof tag.value === 'object' && tag.value !== null && 'text' in tag.value) return String(tag.value.text);
                        return String(tag.value);
                    }
                }
            }
            return undefined;
        };
        const decodedId3Title = getBestEffortDecodedString(getNativeTag('TIT2'));
        const decodedId3Artist = getBestEffortDecodedString(getNativeTag('TPE1'));
        const decodedId3Album = getBestEffortDecodedString(getNativeTag('TALB'));
        const decodedCommonTitle = getBestEffortDecodedString(mm.common.title);
        const decodedCommonArtist = getBestEffortDecodedString(mm.common.artist);
        const decodedCommonAlbum = getBestEffortDecodedString(mm.common.album);
        
        let newAlbumArtUrl: string | null = null;
        if (mm.common.picture && mm.common.picture.length > 0) {
          const picture = mm.common.picture[0];
          newAlbumArtUrl = URL.createObjectURL(new Blob([picture.data], { type: picture.format }));
        }

        return {
          id: `${file.name}-${file.lastModified}-${index}`,
          blobUrl: URL.createObjectURL(file),
          albumArtUrl: newAlbumArtUrl,
          title: decodedId3Title || decodedCommonTitle || 'Unknown Title',
          artist: decodedId3Artist || decodedCommonArtist || 'Unknown Artist',
          album: decodedId3Album || decodedCommonAlbum || 'Unknown Album',
          fileSize: file.size,
          duration: mm.format.duration || 0,
          bitrate: mm.format.bitrate || 0,
          sampleRate: mm.format.sampleRate || 0,
          bitsPerSample: mm.format.bitsPerSample || 0,
        };
      }));
      setPlaylist(newTracks);
      if (newTracks.length > 0) setCurrentTrackIndex(0);
    } catch (e) {
      console.error('Error parsing audio files:', e);
      setError('Failed to parse one or more audio files.');
    } finally {
      setIsLoading(false);
    }
  };

  const playTrack = useCallback((index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentTrackIndex(index);
    }
  }, [playlist.length]);

  const handleNextTrack = useCallback(() => {
    if (playlist.length === 0 || currentTrackIndex === null) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    playTrack(nextIndex);
  }, [currentTrackIndex, playlist.length, playTrack]);

  const handlePrevTrack = useCallback(() => {
    if (playlist.length === 0 || currentTrackIndex === null) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    playTrack(prevIndex);
  }, [currentTrackIndex, playlist.length, playTrack]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback error:", e));
    }
  }, [isPlaying, currentTrack]);

  const handleApplyArt = (newArtUrl: string) => {
    if (currentTrackIndex === null) return;
    setPlaylist(prevPlaylist => {
        const newPlaylist = [...prevPlaylist];
        const trackToUpdate = newPlaylist[currentTrackIndex];
        if (trackToUpdate) {
            trackToUpdate.albumArtUrl = newArtUrl;
        }
        return newPlaylist;
    });
    setIsArtModalOpen(false);
  };

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.blobUrl;
      audioRef.current.load();
      audioRef.current.play().catch(e => console.error("Error auto-playing track:", e));
    }
  }, [currentTrack]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); handleNextTrack(); };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [handleNextTrack]);

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md mx-auto">
          <header className="text-center mb-6">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Harmonia Player</h1>
            <p className="text-gray-400 mt-1">Experience your music with perfect clarity.</p>
          </header>

          <main className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 transition-all duration-300">
            <div className="aspect-square bg-gray-700/50 rounded-xl mb-6 flex items-center justify-center overflow-hidden shadow-inner relative">
              {isLoading ? <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
              : currentTrack?.albumArtUrl ? <img src={currentTrack.albumArtUrl} alt={currentTrack.album || 'Album Art'} className="w-full h-full object-cover" />
              : (
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <MusicNoteIcon className="w-24 h-24" />
                  {currentTrack && (
                    <button 
                        onClick={() => setIsArtModalOpen(true)}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-semibold transition-colors z-10">
                        <PhotoIcon className="w-5 h-5"/>
                        Set Artwork
                    </button>
                  )}
                </div>
              )}
            </div>
            <audio ref={audioRef} />

            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold truncate">{currentTrack?.title || 'Select a song'}</h2>
              <p className="text-gray-400 truncate">{currentTrack?.artist || 'to begin'}</p>
            </div>
            
            {currentTrack && <>
              <div className="space-y-2 mb-4">
                <input type="range" min="0" max={duration} value={currentTime} onChange={e => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value)}} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                <div className="flex justify-between text-xs text-gray-400"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
              </div>
              <div className="flex items-center justify-center space-x-6 mb-6">
                <button onClick={handlePrevTrack} className="p-3 rounded-full text-gray-300 hover:text-white transition-colors"><PreviousIcon className="w-6 h-6" /></button>
                <button onClick={togglePlayPause} className="p-4 rounded-full bg-pink-600 hover:bg-pink-500 text-white transition-transform transform hover:scale-110 shadow-lg">{isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}</button>
                <button onClick={handleNextTrack} className="p-3 rounded-full text-gray-300 hover:text-white transition-colors"><NextIcon className="w-6 h-6" /></button>
              </div>
              <div className="flex items-center space-x-2 mb-6">
                <VolumeUpIcon className="w-5 h-5 text-gray-400" />
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => { if(audioRef.current) audioRef.current.volume = Number(e.target.value); setVolume(Number(e.target.value))}} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
              </div>
              <div className="text-xs text-gray-400 bg-gray-900/50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-200 mb-2 text-sm">Track Information</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div><span className="font-semibold text-gray-300">File Size:</span> {formatBytes(currentTrack.fileSize)}</div>
                  <div><span className="font-semibold text-gray-300">Bitrate:</span> {Math.round(currentTrack.bitrate / 1000)} kbps</div>
                  <div><span className="font-semibold text-gray-300">Sample Rate:</span> {(currentTrack.sampleRate / 1000).toFixed(1)} kHz</div>
                  <div><span className="font-semibold text-gray-300">Bit Depth:</span> {currentTrack.bitsPerSample} bit</div>
                </div>
              </div>
            </>}

            {playlist.length > 0 && <div className="mt-6 w-full max-h-40 overflow-y-auto bg-gray-900/50 rounded-lg p-2 space-y-1">
              {playlist.map((track, index) => (
                <div key={track.id} onClick={() => playTrack(index)} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${currentTrackIndex === index ? 'bg-pink-500/30' : 'hover:bg-gray-700/50'}`}>
                  <div>
                    <p className={`font-semibold ${currentTrackIndex === index ? 'text-white' : 'text-gray-200'}`}>{track.title}</p>
                    <p className="text-xs text-gray-400">{track.artist}</p>
                  </div>
                  {currentTrackIndex === index && isPlaying && <div className="w-4 h-4 flex space-x-0.5 items-center">{[...Array(3)].map((_, i) => <span key={i} className="w-1 h-full bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: `${i*150}ms`}}/>)}</div>}
                </div>
              ))}
            </div>}

            {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            <input type="file" accept="audio/*,.wav,.mp3,.flac,.m4a" onChange={handleFileChange} ref={fileInputRef} className="hidden" multiple />
            {/* Fix: Corrected typo from fileInput to fileInputRef to match the ref name. */}
            <button onClick={() => fileInputRef.current?.click()} className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity duration-300">
              {playlist.length > 0 ? 'Load New Playlist' : 'Select Audio File(s)'}
            </button>
          </main>
        </div>
      </div>
      <SetArtworkModal 
        isOpen={isArtModalOpen}
        onClose={() => setIsArtModalOpen(false)}
        track={currentTrack}
        onApply={handleApplyArt}
      />
    </>
  );
};

export default App;
