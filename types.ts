
export interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  fileSize: number;
  duration: number;
  bitrate: number;
  sampleRate: number;
  bitsPerSample: number;
}

export interface Track extends AudioMetadata {
  id: string;
  blobUrl: string;
  albumArtUrl: string | null;
}
