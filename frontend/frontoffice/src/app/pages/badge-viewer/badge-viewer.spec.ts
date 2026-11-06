import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadgeViewer } from './badge-viewer';

describe('BadgeViewer', () => {
  let component: BadgeViewer;
  let fixture: ComponentFixture<BadgeViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeViewer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadgeViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
