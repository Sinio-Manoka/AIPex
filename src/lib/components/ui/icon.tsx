import { cn } from "@/lib/utils";
import {
  ClockIcon,
  CopyIcon,
  RefreshCcwIcon,
  SettingsIcon,
  PlusIcon,
  LayersIcon,
  FileTextIcon,
  SearchIcon,
  DollarSignIcon,
  GlobeIcon,
  BookmarkIcon,
  ClipboardIcon,
  CameraIcon,
  FileIcon,
  BotIcon,
  CheckIcon,
  MessageSquareIcon,
  UsersIcon,
  ShoppingCartIcon,
  BarChartIcon,
  HomeIcon,
  StarIcon,
  HeartIcon,
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MenuIcon,
  XIcon,
  InfoIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  HelpCircleIcon,
  ExternalLinkIcon,
  LinkIcon,
  LockIcon,
  UnlockIcon,
  ShieldIcon,
  KeyIcon,
  UserIcon,
  UserPlusIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react";

// Unified icon sizes for consistent design
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClasses: Record<IconSize, string> = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
  "2xl": "size-12",
};

// Icon variants for different use cases
export type IconVariant = "default" | "primary" | "secondary" | "success" | "warning" | "error" | "muted";

const variantClasses: Record<IconVariant, string> = {
  default: "text-foreground",
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
  muted: "text-muted-foreground",
};

// Available icons mapping
export const Icons = {
  // Core UI
  clock: ClockIcon,
  copy: CopyIcon,
  refresh: RefreshCcwIcon,
  settings: SettingsIcon,
  plus: PlusIcon,
  layers: LayersIcon,
  fileText: FileTextIcon,
  search: SearchIcon,
  dollar: DollarSignIcon,
  globe: GlobeIcon,
  bookmark: BookmarkIcon,
  clipboard: ClipboardIcon,
  camera: CameraIcon,
  file: FileIcon,
  bot: BotIcon,
  check: CheckIcon,
  message: MessageSquareIcon,
  users: UsersIcon,
  shoppingCart: ShoppingCartIcon,
  chart: BarChartIcon,
  home: HomeIcon,
  star: StarIcon,
  heart: HeartIcon,
  download: DownloadIcon,
  upload: UploadIcon,
  trash: TrashIcon,
  edit: EditIcon,
  eye: EyeIcon,
  eyeOff: EyeOffIcon,

  // Navigation
  chevronDown: ChevronDownIcon,
  chevronUp: ChevronUpIcon,
  chevronLeft: ChevronLeftIcon,
  chevronRight: ChevronRightIcon,
  menu: MenuIcon,
  x: XIcon,

  // Status
  info: InfoIcon,
  alert: AlertCircleIcon,
  checkCircle: CheckCircleIcon,
  xCircle: XCircleIcon,
  help: HelpCircleIcon,

  // Actions
  externalLink: ExternalLinkIcon,
  link: LinkIcon,
  lock: LockIcon,
  unlock: UnlockIcon,
  shield: ShieldIcon,
  key: KeyIcon,
  send: SendIcon,

  // User
  user: UserIcon,
  userPlus: UserPlusIcon,
  logout: LogOutIcon,

  // Theme
  sun: SunIcon,
  moon: MoonIcon,
  monitor: MonitorIcon,
} as const;

export type IconName = keyof typeof Icons;

interface IconProps {
  name: IconName;
  size?: IconSize;
  variant?: IconVariant;
  className?: string;
}

export const Icon = ({ name, size = "md", variant = "default", className }: IconProps) => {
  const IconComponent = Icons[name] as LucideIcon;

  return (
    <IconComponent
      className={cn(
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
};

// Context-specific icon helper
export const getContextIcon = (contextType: string) => {
  switch (contextType) {
    case "page":
      return <Icon name="globe" size="sm" variant="primary" />;
    case "tab":
      return <Icon name="file" size="sm" variant="primary" />;
    case "bookmark":
      return <Icon name="bookmark" size="sm" variant="primary" />;
    case "clipboard":
      return <Icon name="clipboard" size="sm" variant="primary" />;
    case "screenshot":
      return <Icon name="camera" size="sm" variant="primary" />;
    default:
      return <Icon name="fileText" size="sm" variant="primary" />;
  }
};

// Welcome screen suggestion icons
export const getSuggestionIcon = (suggestionType: string) => {
  switch (suggestionType) {
    case "organizeTabs":
      return { icon: "layers", color: "text-blue-600", bgColor: "bg-blue-100" };
    case "analyzePage":
      return { icon: "fileText", color: "text-green-600", bgColor: "bg-green-100" };
    case "research":
      return { icon: "search", color: "text-purple-600", bgColor: "bg-purple-100" };
    case "comparePrice":
      return { icon: "dollar", color: "text-orange-600", bgColor: "bg-orange-100" };
    default:
      return { icon: "message", color: "text-gray-600", bgColor: "bg-gray-100" };
  }
};