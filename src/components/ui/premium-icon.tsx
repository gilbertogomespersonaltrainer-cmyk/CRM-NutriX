import * as React from "react";
import { cn } from "@/lib/utils";

const BRAND = "#22c55e";
const BRAND_LIGHT = "#4ade80";

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="1.2" strokeOpacity={0.7} />
      <rect x="3" y="4" width="18" height="7" rx="3" fill={BRAND} fillOpacity={0.5} />
      <rect x="7.5" y="14" width="2.5" height="2.5" rx="0.5" fill={BRAND_LIGHT} fillOpacity={0.9} />
      <rect x="14" y="14" width="2.5" height="2.5" rx="0.5" fill={BRAND_LIGHT} fillOpacity={0.55} />
      <rect x="7" y="1.5" width="1.5" height="4" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.85} />
      <rect x="15.5" y="1.5" width="1.5" height="4" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.85} />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3.5" fill={BRAND} fillOpacity={0.5} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <path d="M2 20c0-3.5 3.1-6.5 7-6.5s7 3 7 6.5" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <circle cx="17" cy="9" r="2.5" fill={BRAND} fillOpacity={0.35} />
      <path d="M22 20c0-2.5-1.8-4.5-4-4.5-.7 0-1.4.2-2 .5" stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.5} />
    </svg>
  );
}

function UserXIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3.5" fill={BRAND} fillOpacity={0.5} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <path d="M2 20c0-3.5 3.1-6.5 7-6.5s7 3 7 6.5" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <path d="M17 9l4 4m0-4l-4 4" stroke={BRAND_LIGHT} strokeWidth="1.8" strokeLinecap="round" strokeOpacity={0.85} />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" fill={BRAND} fillOpacity={0.2} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.5} />
      <path d="M12 6.5v11M9 9.5c0-1.1 1.3-2 3-2s3 .9 3 2-1.3 2-3 2-3 .9-3 2 1.3 2 3 2 3-.9 3-2" stroke={BRAND_LIGHT} strokeWidth="1.5" strokeLinecap="round" strokeOpacity={0.85} />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="19" rx="2" fill={BRAND} fillOpacity={0.2} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.5} />
      <rect x="8" y="1" width="8" height="3.5" rx="1.5" fill={BRAND} fillOpacity={0.5} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.6} />
      <rect x="8" y="10" width="8" height="1.5" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.6} />
      <rect x="8" y="13.5" width="5" height="1.5" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.4} />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="5" height="18" rx="1.5" fill={BRAND} fillOpacity={0.55} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.45} />
      <rect x="9.5" y="3" width="5" height="12" rx="1.5" fill={BRAND} fillOpacity={0.4} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.45} />
      <rect x="16" y="3" width="5" height="15" rx="1.5" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.45} />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 18L9 13l4 4 7-9" stroke={BRAND_LIGHT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.85} />
      <path d="M4 18L9 13l4 4 7-9v9H4z" fill={BRAND} fillOpacity={0.15} />
      <circle cx="20" cy="8" r="2" fill={BRAND} fillOpacity={0.55} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.6} />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 6L9 11l4-4 7 9" stroke={BRAND_LIGHT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.85} />
      <path d="M4 6L9 11l4-4 7 9v-6H4z" fill={BRAND} fillOpacity={0.15} />
      <circle cx="20" cy="16" r="2" fill={BRAND} fillOpacity={0.55} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.6} />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill={BRAND} fillOpacity={0.45} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.7} />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" fill={BRAND} fillOpacity={0.15} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.55} />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <circle cx="8.5" cy="12" r="1" fill={BRAND_LIGHT} fillOpacity={0.8} />
      <circle cx="12" cy="12" r="1" fill={BRAND_LIGHT} fillOpacity={0.8} />
      <circle cx="15.5" cy="12" r="1" fill={BRAND_LIGHT} fillOpacity={0.8} />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" fill={BRAND} fillOpacity={0.5} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.45} />
      <rect x="13" y="3" width="8" height="8" rx="2" fill={BRAND} fillOpacity={0.35} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.45} />
      <rect x="3" y="13" width="8" height="8" rx="2" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.45} />
      <rect x="13" y="13" width="8" height="8" rx="2" fill={BRAND} fillOpacity={0.15} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.45} />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3.5" fill={BRAND} fillOpacity={0.5} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <path d="M2 20c0-3.5 3.1-6.5 7-6.5s7 3 7 6.5" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <path d="M19 8v5m2.5-2.5h-5" stroke={BRAND_LIGHT} strokeWidth="1.5" strokeLinecap="round" strokeOpacity={0.8} />
    </svg>
  );
}

function UserCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3.5" fill={BRAND} fillOpacity={0.5} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <path d="M2 20c0-3.5 3.1-6.5 7-6.5s7 3 7 6.5" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <path d="M16 11l2 2 4-4" stroke={BRAND_LIGHT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.8} />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke={BRAND_LIGHT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.8} />
      <path d="M21 3v5h-5" stroke={BRAND_LIGHT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.8} />
      <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke={BRAND_LIGHT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.8} />
      <path d="M3 21v-5h5" stroke={BRAND_LIGHT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.8} />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 2l2 1.5L8 2l2 1.5L12 2l2 1.5L16 2l2 1.5L20 2v20l-2-1.5L16 22l-2-1.5L12 22l-2-1.5L8 22l-2-1.5L4 22V2z" fill={BRAND} fillOpacity={0.2} stroke={BRAND_LIGHT} strokeWidth="0.8" strokeOpacity={0.5} />
      <rect x="8" y="7" width="8" height="1.5" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.7} />
      <rect x="8" y="11" width="6" height="1.5" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.5} />
      <rect x="8" y="15" width="4" height="1.5" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.35} />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill={BRAND} fillOpacity={0.2} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.55} />
      <rect x="11.25" y="9" width="1.5" height="4.5" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.8} />
      <circle cx="12" cy="16.5" r="0.8" fill={BRAND_LIGHT} fillOpacity={0.8} />
    </svg>
  );
}

function MessageCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill={BRAND} fillOpacity={0.25} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.6} />
      <circle cx="9" cy="12" r="0.9" fill={BRAND_LIGHT} fillOpacity={0.85} />
      <circle cx="12.5" cy="12" r="0.9" fill={BRAND_LIGHT} fillOpacity={0.85} />
      <circle cx="16" cy="12" r="0.9" fill={BRAND_LIGHT} fillOpacity={0.85} />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill={BRAND} fillOpacity={0.2} stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.55} />
      <path d="M14 2v6h6" stroke={BRAND_LIGHT} strokeWidth="1" strokeOpacity={0.5} />
      <rect x="8" y="13" width="8" height="1.5" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.7} />
      <rect x="8" y="16.5" width="5" height="1.5" rx="0.75" fill={BRAND_LIGHT} fillOpacity={0.5} />
    </svg>
  );
}

export const filledIcons = {
  calendar: CalendarIcon,
  users: UsersIcon,
  userX: UserXIcon,
  dollar: DollarIcon,
  clipboard: ClipboardIcon,
  kanban: KanbanIcon,
  trendingUp: TrendUpIcon,
  trendingDown: TrendDownIcon,
  settings: SettingsIcon,
  message: MessageIcon,
  layout: LayoutIcon,
  userPlus: UserPlusIcon,
  userCheck: UserCheckIcon,
  refresh: RefreshIcon,
  receipt: ReceiptIcon,
  alert: AlertIcon,
  messageCircle: MessageCircleIcon,
  fileText: FileTextIcon,
} as const;

type FilledIconName = keyof typeof filledIcons;

interface GlassIconProps {
  icon: FilledIconName;
  variant?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function GlassIcon({ icon, size = "md", className }: GlassIconProps) {
  const IconComponent = filledIcons[icon];
  const sizeClass = size === "sm" ? "w-9 h-9" : size === "md" ? "w-11 h-11" : "w-14 h-14";

  return (
    <div
      className={cn(
        sizeClass,
        "rounded-xl flex items-center justify-center",
        "bg-[#22c55e]/[0.1] border border-[#22c55e]/[0.2]",
        className
      )}
    >
      <IconComponent />
    </div>
  );
}

export function StatCardIcon({ icon }: { icon: FilledIconName; variant?: string }) {
  return <GlassIcon icon={icon} size="md" />;
}
