import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportWorkspace } from './import-workspace';

describe('ImportWorkspace', () => {
  let component: ImportWorkspace;
  let fixture: ComponentFixture<ImportWorkspace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportWorkspace]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportWorkspace);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
