import {
  ArrowRight,
  AudioLines,
  Briefcase,
  Check,
  CircleHelp,
  CircleX,
  ClipboardPaste,
  Contact,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Forward,
  Gift,
  Image as ImageGlyph,
  IndianRupee,
  KeyRound,
  Landmark,
  Link,
  Lock,
  MessageSquareText,
  Phone,
  PhoneCall,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smartphone,
  Timer,
  Upload,
  UserRound,
  UserX,
  Video,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

// Every icon in the app comes from Lucide (https://lucide.dev) through this file, so
// they share one stroke weight. They're decorative: each one sits next to visible text.
export type IconComponent = (props: LucideProps) => React.JSX.Element;

function icon(Glyph: LucideIcon): IconComponent {
  const Wrapped = (props: LucideProps) => <Glyph strokeWidth={1.75} aria-hidden="true" focusable="false" {...props} />;
  Wrapped.displayName = `${Glyph.displayName ?? "Icon"}Icon`;
  return Wrapped;
}

// General
export const ShieldIcon = icon(ShieldCheck);
export const AlertIcon = icon(ShieldAlert);
export const HelpIcon = icon(CircleHelp);
export const XCircleIcon = icon(CircleX);
export const CheckIcon = icon(Check);
export const ArrowIcon = icon(ArrowRight);
export const FlagIcon = icon(Flag);
export const LockIcon = icon(Lock);
export const EyeIcon = icon(Eye);
export const PhoneIcon = icon(Phone);
export const ShareIcon = icon(Share2);
export const UploadIcon = icon(Upload);
export const PasteIcon = icon(ClipboardPaste);

// What you can check
export const MessageIcon = icon(MessageSquareText);
export const ImageIcon = icon(ImageGlyph);
export const AudioIcon = icon(AudioLines);
export const VideoIcon = icon(Video);
export const DocumentIcon = icon(FileText);

// Warning signs, by the key the backend sends (backend/app/questions.py SIGNS).
export const SIGN_ICONS: Record<string, IconComponent> = {
  ask_secret: icon(KeyRound),
  ask_money: icon(IndianRupee),
  ask_install: icon(Smartphone),
  ask_card_info: icon(CreditCard),
  ask_click: icon(Link),
  rush_or_threat: icon(Timer),
  keep_secret: icon(EyeOff),
  too_good: icon(Gift),
  cant_verify: icon(UserX),
};
export const SignFallbackIcon = FlagIcon;

// Example messages in the checker
export const BankIcon = icon(Landmark);
export const PoliceIcon = icon(Siren);
export const CardIcon = icon(CreditCard);
export const JobIcon = icon(Briefcase);
export const PersonIcon = icon(UserRound);

// Quick questions
export const SavedContactIcon = icon(Contact);
export const ForwardedIcon = icon(Forward);
export const CalledIcon = icon(PhoneCall);
export const SenderIcon = icon(MessageSquareText);
