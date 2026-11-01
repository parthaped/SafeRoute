import { StatusIndicator } from '../primitives/StatusIndicator';
import { useSystemStore } from '../../stores/useSystemStore';
import { useThemeStore } from '../../stores/useThemeStore';

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: 'map',
    label: 'Live Map',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    id: 'risk',
    label: 'Risk Intel',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.636 18.364a9 9 0 010-12.728" />
        <path d="M18.364 5.636a9 9 0 010 12.728" />
        <path d="M8.464 15.536a5 5 0 010-7.072" />
        <path d="M15.536 8.464a5 5 0 010 7.072" />
        <circle cx="12" cy="12" r="1" />
      </svg>
    ),
  },
  {
    id: 'escorts',
    label: 'Escorts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: 'system',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

type SidebarProps = {
  activePanel: string;
  onNavigate: (id: string) => void;
};

export function Sidebar({ activePanel, onNavigate }: SidebarProps) {
  const wsConnected = useSystemStore((s) => s.wsConnected);
  const firestoreMetric = useSystemStore((s) =>
    s.metrics.find((m) => m.id === 'firestore')
  );
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <aside className="flex flex-col h-full w-[220px] bg-surface-sidebar backdrop-blur-[60px] border-r border-surface-border shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-border shrink-0">
        <svg width="28" height="28" viewBox="0 0 1024 1024" fill="none" className="shrink-0">
          <path
            d="M 487.500 154.104 C 482.550 154.562, 471.300 156.346, 462.500 158.067 C 413.309 167.688, 368.605 192.134, 334.989 227.797 C 327.272 235.984, 325.323 238.579, 326.700 238.837 C 327.690 239.023, 330.215 240.529, 332.311 242.183 L 336.121 245.192 346.311 235.311 C 374.454 208.022, 402.341 190.889, 438 178.982 C 461.459 171.148, 484.020 167.700, 512 167.671 C 551.291 167.631, 580.238 174.060, 614.500 190.436 C 643.859 204.469, 668.744 223.327, 690.724 248.200 C 693.544 251.391, 695.704 253.162, 695.631 252.224 C 695.559 251.302, 695.950 250.516, 696.500 250.477 C 697.050 250.437, 699.051 249.432, 700.947 248.244 C 703.717 246.507, 704.692 246.320, 705.910 247.291 C 709.473 250.134, 696.813 234.813, 688.054 225.684 C 659.587 196.012, 618.281 171.938, 577.876 161.468 C 549.738 154.177, 516.210 151.445, 487.500 154.104 M 484 201.472 C 447.109 206.908, 416.274 219.871, 388.265 241.719 C 383.736 245.252, 379.721 248.673, 379.343 249.321 C 378.965 249.970, 379.638 249.639, 380.838 248.586 C 382.741 246.917, 383.333 246.840, 385.478 247.988 C 388.616 249.667, 392.721 254, 391.174 254 C 390.528 254, 390 254.430, 390 254.956 C 390 255.482, 393.293 253.550, 397.319 250.662 C 448.859 213.683, 512.485 203.506, 572.458 222.647 C 592.629 229.084, 617.758 242.659, 635 256.431 C 642.504 262.424, 644.642 263.849, 643.595 262.155 C 643.203 261.520, 643.377 261, 643.981 261 C 645.934 261, 651.002 256.672, 650.935 255.062 C 650.843 252.853, 637.708 241.677, 626.182 234 C 600.470 216.875, 571.630 205.882, 540.999 201.529 C 528.208 199.711, 496.166 199.679, 484 201.472 M 483 262.140 C 467.325 267.669, 445.050 275.500, 433.500 279.541 C 421.950 283.582, 403.050 290.224, 391.500 294.299 C 379.950 298.375, 355.268 307.062, 336.652 313.604 C 313.460 321.753, 302.498 326.070, 301.832 327.314 C 300.527 329.753, 300.627 405.068, 301.968 429.500 C 305.808 499.465, 316.886 550.783, 336.693 590.367 C 353.165 623.285, 373.082 650.057, 404.500 681.512 C 436.867 713.918, 469.771 738.912, 504.713 757.635 L 511.926 761.500 518.378 758.185 C 538.395 747.900, 562.357 731.861, 585 713.589 C 599.213 702.120, 635.231 666.731, 645.648 654 C 695.218 593.418, 713.706 542.293, 721.589 444 C 723.289 422.803, 724.559 340.454, 723.322 331.657 L 722.500 325.814 694 315.855 C 678.325 310.378, 659.200 303.674, 651.500 300.957 C 553.358 266.335, 512.513 252.007, 512.053 252.043 C 511.749 252.067, 498.675 256.610, 483 262.140 M 488 278.074 C 475.625 282.458, 457.850 288.706, 448.500 291.959 C 439.150 295.212, 426.325 299.729, 420 301.997 C 408.428 306.145, 386.419 313.878, 343 329.050 C 330.075 333.567, 318.889 337.991, 318.142 338.881 C 317.026 340.211, 316.889 347.458, 317.372 379.500 C 317.995 420.876, 319.086 443.057, 321.574 465 C 331.226 550.090, 352.408 599.505, 403.181 655.376 L 408.521 661.252 424.777 653.112 C 443.777 643.598, 469.016 628.667, 495 611.570 C 525.391 591.572, 546.378 575.440, 563.353 559.027 C 580.949 542.012, 588.199 530.162, 588.351 518.167 C 588.557 501.829, 577.263 492.832, 528.500 470.488 C 499.390 457.150, 488.926 450.946, 479.669 441.540 C 462.193 423.783, 462.775 396.221, 481.111 373.200 C 488.680 363.697, 509.661 346.879, 527.730 335.832 C 548.575 323.088, 558.148 318.109, 560.014 319.043 C 562.719 320.396, 576.147 323.025, 577.334 322.433 C 581.392 320.410, 551.750 342.472, 535.570 353.517 C 511.517 369.936, 493.712 385.765, 489.639 394.349 C 486.473 401.020, 485.450 408.348, 486.792 414.745 C 489.412 427.235, 497.287 433.239, 531.235 448.625 C 554.353 459.103, 576.388 470.468, 585 476.355 C 595.616 483.612, 604.056 493.779, 607.553 503.523 C 610.348 511.312, 609.969 526.478, 606.747 535.701 C 598.848 558.315, 571.161 587.296, 525 621.268 C 519.225 625.518, 499.425 640.093, 481 653.656 C 462.575 667.219, 444.924 680.157, 441.777 682.408 C 438.629 684.659, 436.072 686.950, 436.094 687.500 C 436.183 689.654, 462.889 710.853, 480.500 722.747 C 490.048 729.196, 511.025 742, 512.042 742 C 513.293 742, 536.607 727.727, 547.341 720.390 C 572.977 702.867, 606.026 673.426, 625.705 650.582 C 664.531 605.509, 684.481 565.890, 695.495 511.988 C 702.971 475.399, 705.952 440.982, 706.715 382.426 L 707.290 338.352 697.895 335.074 C 670.192 325.407, 582.585 294.574, 577 292.525 C 555.792 284.744, 513.119 270.008, 511.919 270.051 C 511.138 270.079, 500.375 273.689, 488 278.074"
            fill="#E10600"
            fillRule="evenodd"
          />
        </svg>
        <div>
          <p className="text-[15px] font-semibold text-text-primary tracking-tight leading-none">SafeRoute</p>
          <p className="text-[11px] text-text-quaternary mt-1 tracking-wide uppercase">Operations</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <p className="label-caps px-2 mb-2">Navigation</p>
        {NAV_ITEMS.map((item) => {
          const active = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-accent-red-subtle text-accent-red'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <span className="shrink-0 opacity-90">{item.icon}</span>
              <span className="text-[13px] font-medium">{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-red shadow-[0_0_6px_rgba(225,6,0,0.5)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme toggle + status footer */}
      <div className="px-5 py-4 border-t border-surface-border space-y-3 shrink-0">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 w-full group cursor-pointer"
        >
          <span className="h-7 w-7 rounded-lg bg-surface-hover flex items-center justify-center text-text-tertiary group-hover:text-text-secondary transition-colors">
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </span>
          <span className="text-[12px] text-text-tertiary group-hover:text-text-secondary transition-colors">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          <StatusIndicator status={firestoreMetric?.status === 'healthy' ? 'healthy' : 'degraded'} />
          <span className="text-[11px] text-text-tertiary">
            {firestoreMetric?.status === 'healthy' ? 'Synced with app' : 'Local mode'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <StatusIndicator status={wsConnected ? 'healthy' : 'down'} />
          <span className="text-[11px] text-text-tertiary">
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </aside>
  );
}
