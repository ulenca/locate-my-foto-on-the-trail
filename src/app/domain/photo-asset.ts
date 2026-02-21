import { GeoCoordinate } from './geo-coordinate';

export type TakenAtSource = 'EXIF' | 'XMP' | 'FILE_TIMESTAMP' | 'UNKNOWN';

export type PhotoAsset = Readonly<{
  file: File;
  takenAt: Date | null;
  takenAtSource: TakenAtSource;
  location: GeoCoordinate | null;
}>;