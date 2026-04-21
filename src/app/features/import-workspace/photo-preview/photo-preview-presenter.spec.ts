import { TestBed } from '@angular/core/testing';

import { PhotoPreviewPresenter } from './photo-preview-presenter';

describe('PhotoPreviewPresenter', () => {
  let service: PhotoPreviewPresenter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhotoPreviewPresenter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
