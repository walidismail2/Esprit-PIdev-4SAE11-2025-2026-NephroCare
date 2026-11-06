import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, ChangeDetectorRef } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';
import { SidebarWidgetComponent } from './app-sidebar-widget.component';
import { combineLatest, Subscription } from 'rxjs';

type NavItem = {
  name: string;
  icon: string;
  path?: string;
  subItems?: { name: string; path: string }[];
};

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    RouterModule,
    SafeHtmlPipe,
    SidebarWidgetComponent
  ],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {
  navItems: NavItem[] = [
    {
      name: 'Clinical Module',
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/></svg>`,
      subItems: [
        { name: 'Clinical', path: '/clinical' },
        { name: 'Consultations Calendar', path: '/consultations-calendar' },
        { name: 'Transplant Candidacy', path: '/transplant' },
      ],
    },
    {
      name: 'Hospitalization Module',
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M6 3v18M18 3v18M6 12h12M9 7h.01M9 17h.01M15 7h.01M15 17h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      subItems: [
        { name: 'Hospitalization', path: '/hospitalization' },
        { name: 'Hospitalization Stats', path: '/statistique-hospitalization' },
      ],
    },
    {
      name: 'Pharmacy Module',
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M8 3h8l1 5H7l1-5Z" stroke="currentColor" stroke-width="1.5"/><path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      subItems: [
        { name: 'Pharmacy', path: '/pharmacy' },
        { name: 'Stock Stats', path: '/statistique-pharmacy' },
      ],
    },
    {
  name: 'Orders Module',
  icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
    <path d="M8 3h8l1 5H7l1-5Z" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  subItems: [
    { name: 'Orders', path: '/orders-back' },
    { name: 'Orders Stats', path: '/orders-stats' },
  ],
},
 {
  name: 'Mes Livraisons',
  icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
    <path d="M1 3h15v13H1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M16 8h4l3 3v5h-7V8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  subItems: [
    { name: 'Mes Livraisons', path: '/driver' },
  ],
},
    {
      name: 'Diagnostic Module',
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M10 3v5l-4 7a4 4 0 0 0 3.5 6h5a4 4 0 0 0 3.5-6l-4-7V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.5"/></svg>`,
      subItems: [
        { name: 'Diagnostic Orders', path: '/diagnostic' },
        { name: 'Diagnostic Results', path: '/diagnostic-result' },
        { name: 'Kidney CT scan', path: '/kidney-scan' },
      ],
    },
    {
      name: 'Dialysis Module',
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 3c3.5 0 6 2.5 6 5.5 0 4.5-6 12.5-6 12.5S6 13 6 8.5C6 5.5 8.5 3 12 3Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="8.5" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
      subItems: [
        { name: 'Dialysis Management', path: '/dialysis/treatments' },
        { name: 'Dialysis Alerts', path: '/dialysis/alerts' },
        { name: 'My Dialysis Schedule', path: '/dialysis/my-schedule' },
        { name: 'Dialysis Settings', path: '/dialysis/admin/settings' },
        { name: 'Dialysis Audit Logs', path: '/dialysis/admin/audit' },
      ],
    },
    {
      name: 'Calendar',
      path: '/calendar',
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M7 2.75v2.5M17 2.75v2.5M3.75 9.25h16.5M5.5 4.75h13A1.75 1.75 0 0 1 20.25 6.5v12A1.75 1.75 0 0 1 18.5 20.25h-13A1.75 1.75 0 0 1 3.75 18.5v-12A1.75 1.75 0 0 1 5.5 4.75Z" stroke="currentColor" stroke-width="1.5"/></svg>`,
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 19.5a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    }
  ];

  othersItems: NavItem[] = [];
  openSubmenu: string | null | number = null;
  subMenuHeights: { [key: string]: number } = {};
  @ViewChildren('subMenu') subMenuRefs!: QueryList<ElementRef>;

  readonly isExpanded$;
  readonly isMobileOpen$;
  readonly isHovered$;

  private subscription: Subscription = new Subscription();

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isHovered$ = this.sidebarService.isHovered$;
  }

  ngOnInit() {
    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      })
    );

    this.subscription.add(
      combineLatest([this.isExpanded$, this.isMobileOpen$, this.isHovered$]).subscribe(() => {
        this.cdr.detectChanges();
      })
    );

    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;
    } else {
      this.openSubmenu = key;

      setTimeout(() => {
        const el = document.getElementById(key);
        if (el) {
          this.subMenuHeights[key] = el.scrollHeight;
          this.cdr.detectChanges();
        }
      });
    }
  }

  onSidebarMouseEnter() {
    this.isExpanded$.subscribe(expanded => {
      if (!expanded) {
        this.sidebarService.setHovered(true);
      }
    }).unsubscribe();
  }

  private setActiveMenuFromRoute(currentUrl: string) {
    const menuGroups = [
      { items: this.navItems, prefix: 'main' }
    ];

    menuGroups.forEach(group => {
      group.items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach(subItem => {
            if (currentUrl === subItem.path) {
              const key = `${group.prefix}-${i}`;
              this.openSubmenu = key;
              setTimeout(() => {
                const el = document.getElementById(key);
                if (el) {
                  this.subMenuHeights[key] = el.scrollHeight;
                  this.cdr.detectChanges();
                }
              });
            }
          });
        }
      });
    });
  }

  onSubmenuClick() {
    this.isMobileOpen$.subscribe(isMobile => {
      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }
    }).unsubscribe();
  }
}
