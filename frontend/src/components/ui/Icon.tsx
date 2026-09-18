import React from 'react';
import {
  Map as LucideMap,
  FilePlus,
  LayoutDashboard,
  User,
  Search,
  Mic,
  Accessibility,
  X,
  Camera,
  Download,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Image as LucideImage,
  Route,
  Bell,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  HelpCircle,
  Info,
  Flag,
  RotateCcw,
  Save,
  Compass,
  Crosshair,
  Loader2,
  Volume2,
  Eye,
  List,
  Clock,
  Sparkles,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'map'
  | 'report'
  | 'dashboard'
  | 'user'
  | 'search'
  | 'mic'
  | 'access'
  | 'wheelchair'
  | 'close'
  | 'x'
  | 'camera'
  | 'download'
  | 'location'
  | 'chevron'
  | 'shield'
  | 'photo'
  | 'route'
  | 'bell'
  | 'check'
  | 'check-circle'
  | 'warning'
  | 'alert-circle'
  | 'x-circle'
  | 'help-circle'
  | 'info'
  | 'flag'
  | 'history'
  | 'refresh'
  | 'save'
  | 'compass'
  | 'target'
  | 'spinner'
  | 'volume'
  | 'eye'
  | 'list'
  | 'clock'
  | 'sparkles'
  | 'filter';

const iconMap: Record<string, LucideIcon> = {
  map: LucideMap,
  report: FilePlus,
  dashboard: LayoutDashboard,
  user: User,
  search: Search,
  mic: Mic,
  access: Accessibility,
  wheelchair: Accessibility,
  close: X,
  x: X,
  camera: Camera,
  download: Download,
  location: MapPin,
  chevron: ChevronRight,
  shield: ShieldCheck,
  photo: LucideImage,
  route: Route,
  bell: Bell,
  check: Check,
  'check-circle': CheckCircle2,
  warning: AlertTriangle,
  'alert-circle': AlertCircle,
  'x-circle': XCircle,
  'help-circle': HelpCircle,
  info: Info,
  flag: Flag,
  history: RotateCcw,
  refresh: RotateCcw,
  save: Save,
  compass: Compass,
  target: Crosshair,
  spinner: Loader2,
  volume: Volume2,
  eye: Eye,
  list: List,
  clock: Clock,
  sparkles: Sparkles,
  filter: SlidersHorizontal,
};

export type IconProps = {
  name: IconName | string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 20,
  className = '',
  style,
  strokeWidth = 1.8,
}: IconProps) {
  const Component = iconMap[name] ?? LayoutDashboard;
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
}
