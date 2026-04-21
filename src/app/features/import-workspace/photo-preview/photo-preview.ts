import { Component, Input, inject } from '@angular/core';
import { PhotoAsset, TakenAtSource } from '../../../domain/photo-asset';
import { GeoCoordinate } from '../../../domain/geo-coordinate';
import { PhotoPreviewPresenter } from './photo-preview-presenter';

@Component({
  selector: 'app-photo-preview',
  standalone: true,
  templateUrl: './photo-preview.html',
})
export class PhotoPreviewComponent {
  @Input({ required: true }) photos: PhotoAsset[] = [];
  @Input({ required: true }) isLoading = false;

  private readonly presenter = inject(PhotoPreviewPresenter);

  formatTakenAt(takenAt: Date | null): string {
    return this.presenter.formatTakenAt(takenAt);
  }

  formatLocation(location: GeoCoordinate | null): string {
    return this.presenter.formatLocation(location);
  }

  sourceLabel(source: TakenAtSource): string {
    return this.presenter.sourceLabel(source);
  }

  sourceBadgeClass(source: TakenAtSource): string {
    return this.presenter.sourceBadgeClass(source);
  }
}