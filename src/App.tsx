import {
  BookOpenText,
  CalendarDays,
  Check,
  ClipboardCheck,
  ChevronRight,
  CircleDot,
  Copy,
  Eye,
  EyeOff,
  FilePlus2,
  Flag,
  GitBranch,
  HandHeart,
  HeartHandshake,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  LockKeyhole,
  Maximize2,
  MessageCircle,
  Minimize2,
  Network,
  PanelTop,
  Pin,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  User,
  UserPlus,
  Users,
  Video,
  VideoOff,
  Vote,
  Wifi,
  X,
} from "lucide-react";
import { createClient, type Session } from "@supabase/supabase-js";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  annotateDeviceKeysWithTrust,
  canUseDeviceKeyForEncryption,
  deriveDeviceAesKey,
  ensureDeviceIdentity,
  fingerprintPublicKey,
  getBrowserDeviceLabel,
  importPublicDeviceKey,
  trustDeviceKey,
  type DeviceIdentity,
  type DeviceKey,
} from "./crypto/keys";

type MemberStatus = "online" | "offline";
type MemberRole = "nova pessoa" | "membro" | "admin";
type GroupPrivacy = "aberto" | "convite" | "secreto";
type NavKey = "hoje" | "chat" | "agenda" | "comunidade" | "memoria" | "nocturno" | "cuidado" | "admin";
type EventVibe = "social" | "discussão" | "festa" | "íntimo" | "público";
type PhotoPolicy = "sem fotos" | "perguntar primeiro" | "zonas comuns ok";
type DecisionStatus = "rascunho" | "aberta" | "decidida";
type DecisionVoteValue = "sim" | "não" | "abstenção" | "bloqueio";
type CheckInMood = "bem" | "misto" | "atenção";
type CheckInVisibility = "admins" | "sponsor" | "comunidade";
type IntentionKind = "amizades" | "dates" | "flirt" | "eventos" | "indisponível" | "só intro";
type InterestKind = "amizade" | "date" | "flirt" | "evento";
type IntroductionStatus = "pedido" | "aceite" | "recusado" | "aberto";
type RelationshipVisibility = "privado" | "conexões" | "comunidade";
type EncryptionStatus = "plain" | "encrypted" | "locked";
type DeviceSecurityStatus = "off" | "creating" | "ready" | "error";
type DirectPeerState = "connecting" | "open" | "closed" | "failed";
type ConnectionTab = "intencoes" | "intros" | "interesses" | "privacidade";
type CommunityTab = "perfil" | "conexoes" | "grupos" | "entradas" | "compersao";
type MemoryTab = "docs" | "acordos" | "leituras" | "rituais";
type NocturnoTab = "eroteca" | "provocacoes" | "tensao" | "fantasias" | "confessionario" | "video";
type CareTab = "ciume" | "reparacao" | "saude" | "mediacao";
type VideoRoomMode = "gallery" | "focus";
type ReportCategory = "assedio" | "consentimento" | "conteudo" | "seguranca" | "outro";
type ReportSeverity = "baixa" | "media" | "alta" | "urgente";
type ReportStatus = "aberto" | "triagem" | "resolvido" | "arquivado";

type Member = {
  id: string;
  name: string;
  pronouns: string;
  avatarPath?: string;
  avatarUrl?: string;
  joinedAt: string;
  sponsorId: string | null;
  role: MemberRole;
  groupIds: string[];
  status: MemberStatus;
  consentAvailableFor: string;
  consentLimits: string;
  mediaPreference: string;
  relationshipContext: string;
  eventComfort: string;
  suspendedUntil?: string | null;
};

type Group = {
  id: string;
  name: string;
  focus: string;
  privacy: GroupPrivacy;
  stewardId: string;
  color: string;
};

type EventItem = {
  id: string;
  title: string;
  startsAt: string;
  place: string;
  groupId: string;
  capacity: number;
  createdBy: string | null;
  attendeeIds: string[];
  vibe: EventVibe;
  photoPolicy: PhotoPolicy;
  boundaryNotes: string;
  aftercarePrompt: string;
};

type EventRoom = {
  id: string;
  eventId: string;
  name: string;
  purpose: string;
  expiresAt: string;
  createdBy: string | null;
  memberIds: string[];
};

type CommunityDoc = {
  id: string;
  code: string;
  title: string;
  summary: string;
  ownerId: string | null;
  updatedAt: string;
  tags: string[];
};

type ChatMessage = {
  id: string;
  roomId: string;
  authorId: string;
  body: string;
  createdAt: string;
  recipientsAtSend: string[];
  citationCode?: string;
  encryptionVersion: number;
  encryptedPayloads?: Record<string, EncryptedPayload>;
  senderDeviceId?: string | null;
  encryptionStatus: EncryptionStatus;
  encryptedDeviceCount: number;
  imagePath?: string;
  imageUrl?: string;
  imageName?: string;
  imageMimeType?: string;
  imageEncrypted: boolean;
  imageEncryptionVersion: number;
  imageDecryption?: EncryptedMediaMetadata;
  imageViewOnce: boolean;
  imageOpenedBy: string[];
  imageConsentRequired: boolean;
  imageExpiresAt?: string;
};

type CommunityState = {
  members: Member[];
  groups: Group[];
  events: EventItem[];
  eventRooms: EventRoom[];
  docs: CommunityDoc[];
  decisions: DecisionRecord[];
  eventCheckIns: EventCheckIn[];
  intentions: MemberIntention[];
  introductions: WarmIntroduction[];
  interests: MutualInterest[];
  relationships: RelationshipLink[];
  privacySettings: PrivacySettings;
  messages: ChatMessage[];
  reports: SafetyReport[];
  auditLogs: AdminAuditLog[];
};

type SafetyReport = {
  id: string;
  reporterId: string;
  subjectMemberId: string | null;
  roomId: string | null;
  messageId: string | null;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  assigneeId: string | null;
  summary: string;
  details: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
};

type AdminAuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type EncryptedPayload = {
  version: 1;
  iv: string;
  ciphertext: string;
};

type EncryptedMessageBody = {
  body: string;
  citationCode: string | null;
  image?: EncryptedMediaMetadata | null;
};

type EncryptedMediaMetadata = {
  key: string;
  iv: string;
  name: string;
  mimeType: string;
  size: number;
};

type EncryptedMediaResult = {
  blob: Blob;
  metadata: EncryptedMediaMetadata;
};

type DirectPeerStatus = {
  peerKey: string;
  memberId: string;
  deviceId: string;
  roomId: string;
  state: DirectPeerState;
  updatedAt: string;
};

type MemberIntention = {
  memberId: string;
  kinds: IntentionKind[];
  note: string;
  updatedAt: string;
};

type WarmIntroduction = {
  id: string;
  requesterId: string;
  targetId: string;
  connectorId: string;
  note: string;
  status: IntroductionStatus;
  createdAt: string;
};

type MutualInterest = {
  id: string;
  fromId: string;
  toId: string;
  kind: InterestKind;
  createdAt: string;
};

type RelationshipLink = {
  id: string;
  memberId: string;
  relatedMemberId: string;
  label: string;
  visibility: RelationshipVisibility;
  createdAt: string;
};

type PrivacySettings = {
  deviceOnlyMessages: boolean;
  localMediaVault: boolean;
  metadataStripping: boolean;
  p2pReady: boolean;
  relayPlan: string;
};

type DecisionVote = {
  memberId: string;
  value: DecisionVoteValue;
  note: string;
};

type DecisionRecord = {
  id: string;
  code: string;
  title: string;
  summary: string;
  outcome: string;
  status: DecisionStatus;
  createdBy: string | null;
  createdAt: string;
  votes: DecisionVote[];
};

type EventCheckIn = {
  id: string;
  eventId: string;
  memberId: string;
  mood: CheckInMood;
  note: string;
  visibility: CheckInVisibility;
  createdAt: string;
};

type CitationTarget = {
  id: string;
  code: string;
  title: string;
  tags: string[];
  kind: string;
};

type InviteCode = {
  code: string;
  sponsorId: string | null;
  role: MemberRole;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
};

type MessageInput = {
  body: string;
  citationCode?: string;
  imageFile?: File | null;
  imageViewOnce?: boolean;
  imageConsentRequired?: boolean;
  imageExpiresInHours?: number;
};

type ProfileUpdateInput = {
  name: string;
  pronouns: string;
  status: MemberStatus;
  consentAvailableFor: string;
  consentLimits: string;
  mediaPreference: string;
  relationshipContext: string;
  eventComfort: string;
};

type ProfileRow = {
  id: string;
  name: string;
  pronouns: string | null;
  avatar_path: string | null;
  joined_at: string;
  sponsor_id: string | null;
  role: MemberRole;
  status: MemberStatus;
  consent_available_for: string | null;
  consent_limits: string | null;
  media_preference: string | null;
  relationship_context: string | null;
  event_comfort: string | null;
  suspended_until: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  focus: string;
  privacy: GroupPrivacy;
  steward_id: string | null;
  color: string;
};

type GroupMemberRow = {
  group_id: string;
  member_id: string;
};

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  place: string;
  group_id: string;
  capacity: number;
  created_by: string | null;
  vibe: EventVibe | null;
  photo_policy: PhotoPolicy | null;
  boundary_notes: string | null;
  aftercare_prompt: string | null;
};

type EventAttendeeRow = {
  event_id: string;
  member_id: string;
};

type EventRoomRow = {
  id: string;
  event_id: string;
  name: string;
  purpose: string;
  expires_at: string;
  created_by: string | null;
  member_ids: string[] | null;
};

type DocRow = {
  id: string;
  code: string;
  title: string;
  summary: string;
  owner_id: string | null;
  updated_at: string;
  tags: string[] | null;
};

type MessageRow = {
  id: string;
  room_id: string;
  author_id: string;
  body: string;
  created_at: string;
  recipients_at_send: string[] | null;
  citation_code: string | null;
  encryption_version: number | null;
  encrypted_payloads: Record<string, EncryptedPayload> | null;
  sender_device_id: string | null;
  image_path: string | null;
  image_name: string | null;
  image_mime_type: string | null;
  image_encryption_version: number | null;
  image_cipher_iv: string | null;
  image_view_once: boolean | null;
  image_opened_by: string[] | null;
  image_consent_required: boolean | null;
  image_expires_at: string | null;
};

type DecisionRow = {
  id: string;
  code: string;
  title: string;
  summary: string;
  outcome: string;
  status: DecisionStatus;
  created_by: string | null;
  created_at: string;
  votes: DecisionVote[] | null;
};

type EventCheckInRow = {
  id: string;
  event_id: string;
  member_id: string;
  mood: CheckInMood;
  note: string | null;
  visibility: CheckInVisibility;
  created_at: string;
};

type IntentionRow = {
  member_id: string;
  kinds: IntentionKind[] | null;
  note: string | null;
  updated_at: string;
};

type IntroductionRow = {
  id: string;
  requester_id: string;
  target_id: string;
  connector_id: string;
  note: string | null;
  status: IntroductionStatus;
  created_at: string;
};

type InterestRow = {
  id: string;
  from_id: string;
  to_id: string;
  kind: InterestKind;
  created_at: string;
};

type RelationshipRow = {
  id: string;
  member_id: string;
  related_member_id: string;
  label: string;
  visibility: RelationshipVisibility;
  created_at: string;
};

type PrivacySettingsRow = {
  id: string;
  device_only_messages: boolean | null;
  local_media_vault: boolean | null;
  metadata_stripping: boolean | null;
  p2p_ready: boolean | null;
  relay_plan: string | null;
};

type InviteRow = {
  code: string;
  sponsor_id: string | null;
  role: MemberRole;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  created_at: string;
};

type DeviceKeyRow = {
  id: string;
  member_id: string;
  device_label: string | null;
  public_key: JsonWebKey;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  subject_member_id: string | null;
  room_id: string | null;
  message_id: string | null;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  assignee_id: string | null;
  summary: string;
  details: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type P2PSignalType = "offer" | "answer" | "ice" | "close";

type P2PSignalRow = {
  id: string;
  room_id: string;
  from_member_id: string;
  from_device_id: string;
  to_member_id: string;
  to_device_id: string;
  signal_type: P2PSignalType;
  payload: Record<string, unknown>;
  created_at: string;
  expires_at: string;
};

type VideoSignalPayload = {
  kind: "video-call";
  callId: string;
  callTitle: string;
  relayEnabled: boolean;
  participantIds?: string[];
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type ActiveVideoCall = {
  id: string;
  title: string;
  roomId: string;
  relayEnabled: boolean;
  participantIds: string[];
  startedAt: string;
};

type IncomingVideoOffer = {
  signalId: string;
  roomId: string;
  fromMemberId: string;
  fromDeviceId: string;
  payload: VideoSignalPayload;
  createdAt: string;
};

type VideoPeerSession = {
  peerKey: string;
  callId: string;
  memberId: string;
  deviceId: string;
  peer: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
};

type RemoteVideoStream = {
  id: string;
  memberId: string;
  deviceId: string;
  stream: MediaStream;
  state: DirectPeerState;
};

type DirectChatPayload = {
  type: "chat-message";
  messageId: string;
  roomId: string;
  authorId: string;
  body: string;
  citationCode: string | null;
  createdAt: string;
  encryptedDeviceCount: number;
  imagePath?: string;
  imageName?: string;
  imageMimeType?: string;
  imageEncrypted?: boolean;
  imageDecryption?: EncryptedMediaMetadata;
  imageViewOnce?: boolean;
  imageConsentRequired?: boolean;
  imageExpiresAt?: string;
};

type DirectPeerConnection = {
  peerKey: string;
  memberId: string;
  deviceId: string;
  roomId: string;
  peer: RTCPeerConnection;
  channel?: RTCDataChannel;
  pendingIce: RTCIceCandidateInit[];
};

const storeKey = "porto-nm-community-v1";
const p2pConnectionConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const turnUrls = ((import.meta.env.VITE_TURN_URLS as string | undefined) ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const turnUsername = import.meta.env.VITE_TURN_USERNAME as string | undefined;
const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
const turnRelayAvailable = turnUrls.length > 0 && Boolean(turnUsername && turnCredential);
const communityRealtimeTables = [
  "profiles",
  "groups",
  "group_members",
  "events",
  "event_attendees",
  "event_rooms",
  "docs",
  "decisions",
  "event_checkins",
  "member_intentions",
  "warm_introductions",
  "mutual_interests",
  "relationship_links",
  "privacy_settings",
  "messages",
  "invite_codes",
  "device_keys",
  "reports",
  "admin_audit_log",
];
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const demoAvatarUrlsById: Record<string, string> = {
  m_di: "/avatars/di.svg",
  m_ana: "/avatars/ana.svg",
  m_miguel: "/avatars/miguel.svg",
  m_lia: "/avatars/lia.svg",
  demo_ines: "/avatars/ines.svg",
  demo_joao: "/avatars/joao.svg",
  demo_carolina: "/avatars/carolina.svg",
  demo_rita: "/avatars/rita.svg",
  demo_nuno: "/avatars/nuno.svg",
};

const demoAvatarUrlsByName: Record<string, string> = {
  "Admin Porto NM": "/avatars/admin.svg",
  "Teste Porto NM": "/avatars/tester.svg",
  Di: "/avatars/di.svg",
  "Ana R.": "/avatars/ana.svg",
  "Miguel S.": "/avatars/miguel.svg",
  "Lia P.": "/avatars/lia.svg",
  "Inês Faria": "/avatars/ines.svg",
  "João Matos": "/avatars/joao.svg",
  "Carolina Vale": "/avatars/carolina.svg",
  "Rita Lopes": "/avatars/rita.svg",
  "Nuno Seabra": "/avatars/nuno.svg",
};

const reportCategoryLabels: Record<ReportCategory, string> = {
  assedio: "assédio",
  consentimento: "consentimento",
  conteudo: "conteúdo",
  seguranca: "segurança",
  outro: "outro",
};

const reportSeverityLabels: Record<ReportSeverity, string> = {
  baixa: "baixa",
  media: "média",
  alta: "alta",
  urgente: "urgente",
};

const reportStatusLabels: Record<ReportStatus, string> = {
  aberto: "aberto",
  triagem: "em triagem",
  resolvido: "resolvido",
  arquivado: "arquivado",
};

const reportCategoryOptions = (Object.keys(reportCategoryLabels) as ReportCategory[]).map((value) => ({
  value,
  label: reportCategoryLabels[value],
}));

const reportSeverityOptions = (Object.keys(reportSeverityLabels) as ReportSeverity[]).map((value) => ({
  value,
  label: reportSeverityLabels[value],
}));

const reportStatusOptions = (Object.keys(reportStatusLabels) as ReportStatus[]).map((value) => ({
  value,
  label: reportStatusLabels[value],
}));

type SyncStatus = "local" | "auth" | "loading" | "connected" | "saving" | "error";

const seedState: CommunityState = {
  members: [
    {
      id: "m_di",
      name: "Di",
      pronouns: "elu/delu",
      joinedAt: "2026-03-02",
      sponsorId: null,
      role: "admin",
      groupIds: ["g_geral", "g_eventos", "g_cuidados"],
      status: "online",
      consentAvailableFor: "conversas diretas, organização de eventos, mediação",
      consentLimits: "não partilhar prints; perguntar antes de toque físico",
      mediaPreference: "nudes só em envelope privado e com contexto explícito",
      relationshipContext: "poliam, com acordos vivos",
      eventComfort: "prefere encontros com política de fotos clara",
    },
    {
      id: "m_ana",
      name: "Ana R.",
      pronouns: "ela/dela",
      joinedAt: "2026-03-19",
      sponsorId: "m_di",
      role: "membro",
      groupIds: ["g_geral", "g_eventos"],
      status: "online",
      consentAvailableFor: "cafés, dança, conversas sobre relações",
      consentLimits: "sem mensagens sexuais sem convite claro",
      mediaPreference: "fotos normais ok; íntimas apenas ver uma vez",
      relationshipContext: "solo poly, dating devagar",
      eventComfort: "gosta de eventos newcomer-friendly",
    },
    {
      id: "m_miguel",
      name: "Miguel S.",
      pronouns: "ele/dele",
      joinedAt: "2026-04-04",
      sponsorId: "m_di",
      role: "membro",
      groupIds: ["g_geral", "g_cuidados"],
      status: "offline",
      consentAvailableFor: "conversas de cuidado, facilitação, logística",
      consentLimits: "não gosta de flirt em grupos públicos",
      mediaPreference: "não receber nudes sem pergunta prévia",
      relationshipContext: "relação aberta com acordos fixos",
      eventComfort: "prefere eventos pequenos e sem fotografia",
    },
    {
      id: "m_lia",
      name: "Lia P.",
      pronouns: "ela/dela",
      joinedAt: "2026-05-11",
      sponsorId: "m_ana",
      role: "nova pessoa",
      groupIds: ["g_geral"],
      status: "online",
      consentAvailableFor: "conhecer pessoas em contexto de grupo",
      consentLimits: "quer ir devagar; sem convites privados no primeiro contacto",
      mediaPreference: "sem media íntima por agora",
      relationshipContext: "a explorar não-monogamia",
      eventComfort: "precisa de anfitriã/o visível no início",
    },
    {
      id: "demo_ines",
      name: "Inês Faria",
      pronouns: "ela/dela",
      joinedAt: "2026-04-09",
      sponsorId: "m_di",
      role: "membro",
      groupIds: ["g_geral", "g_eventos", "g_cuidados"],
      status: "online",
      consentAvailableFor: "cafés, caminhadas, conversas sobre acordos e apresentação de pessoas novas",
      consentLimits: "sem prints; flirt só depois de convite claro",
      mediaPreference: "media íntima só com envelope privado e expiração curta",
      relationshipContext: "poliam, com uma relação âncora e espaço para conhecer devagar",
      eventComfort: "gosta de anfitriã/o identificado e política de fotos visível",
    },
    {
      id: "demo_joao",
      name: "João Matos",
      pronouns: "ele/dele",
      joinedAt: "2026-04-21",
      sponsorId: "demo_ines",
      role: "membro",
      groupIds: ["g_geral", "g_eventos"],
      status: "online",
      consentAvailableFor: "eventos pequenos, logística, conversas sobre comunicação não violenta",
      consentLimits: "não quer convites sexuais em canais de grupo",
      mediaPreference: "prefere pedir contexto antes de qualquer imagem íntima",
      relationshipContext: "relação aberta, acordos revistos mensalmente",
      eventComfort: "prefere grupos até 12 pessoas e sem fotografias espontâneas",
    },
    {
      id: "demo_carolina",
      name: "Carolina Vale",
      pronouns: "ela/elu",
      joinedAt: "2026-05-03",
      sponsorId: "m_di",
      role: "membro",
      groupIds: ["g_geral", "g_eventos"],
      status: "offline",
      consentAvailableFor: "amizades queer, dates leves e companhia para eventos culturais",
      consentLimits: "precisa de tempo antes de conversas privadas intensas",
      mediaPreference: "não recebe nudes sem pergunta explícita no momento",
      relationshipContext: "solo poly, com foco em autonomia",
      eventComfort: "gosta de eventos com check-in e saída fácil",
    },
    {
      id: "demo_rita",
      name: "Rita Lopes",
      pronouns: "ela/dela",
      joinedAt: "2026-05-19",
      sponsorId: "demo_joao",
      role: "nova pessoa",
      groupIds: ["g_geral"],
      status: "online",
      consentAvailableFor: "conhecer pessoas em grupo, aprender acordos de consentimento",
      consentLimits: "sem mensagens privadas no primeiro contacto sem apresentação",
      mediaPreference: "sem media íntima por agora",
      relationshipContext: "a explorar não-monogamia com curiosidade e cautela",
      eventComfort: "precisa de saber quem pode apoiar se ficar desconfortável",
    },
    {
      id: "demo_nuno",
      name: "Nuno Seabra",
      pronouns: "ele/dele",
      joinedAt: "2026-06-02",
      sponsorId: "demo_ines",
      role: "membro",
      groupIds: ["g_geral", "g_eventos", "g_cuidados"],
      status: "offline",
      consentAvailableFor: "amizades, eventos ao ar livre e conversas sobre ciúme e autonomia",
      consentLimits: "sem contacto físico sem pergunta verbal",
      mediaPreference: "fotografias normais ok; íntimas só em ver uma vez",
      relationshipContext: "casal aberto, com acordos de transparência",
      eventComfort: "prefere eventos com propósito claro",
    },
  ],
  groups: [
    {
      id: "g_geral",
      name: "Comunidade geral",
      focus: "conversas, acolhimento e anúncios",
      privacy: "convite",
      stewardId: "m_di",
      color: "#176b63",
    },
    {
      id: "g_eventos",
      name: "Eventos Porto",
      focus: "jantares, cafés, caminhadas e assembleias",
      privacy: "convite",
      stewardId: "m_ana",
      color: "#c4493d",
    },
    {
      id: "g_cuidados",
      name: "Cuidados e acordos",
      focus: "consentimento, limites e mediação",
      privacy: "secreto",
      stewardId: "m_miguel",
      color: "#5457a6",
    },
  ],
  events: [
    {
      id: "e_1",
      title: "Café de boas-vindas",
      startsAt: "2026-06-22T19:00",
      place: "Bonfim",
      groupId: "g_eventos",
      capacity: 12,
      createdBy: "m_di",
      attendeeIds: ["m_di", "m_ana", "m_lia"],
      vibe: "social",
      photoPolicy: "perguntar primeiro",
      boundaryNotes: "Ronda inicial de nomes/pronomes. Sem fotos sem consentimento explícito.",
      aftercarePrompt: "Enviar check-in breve no dia seguinte a novas pessoas.",
    },
    {
      id: "e_2",
      title: "Assembleia de verão",
      startsAt: "2026-07-03T20:30",
      place: "Cedofeita",
      groupId: "g_geral",
      capacity: 24,
      createdBy: "m_ana",
      attendeeIds: ["m_di", "m_miguel"],
      vibe: "discussão",
      photoPolicy: "sem fotos",
      boundaryNotes: "Falar de acordos em formato de decisão, não debate infinito.",
      aftercarePrompt: "Recolher sinais de desconforto e propostas de melhoria.",
    },
    {
      id: "demo_event_matosinhos",
      title: "Caminhada consentida em Matosinhos",
      startsAt: "2026-06-28T10:30",
      place: "Matosinhos, junto ao mar",
      groupId: "g_eventos",
      capacity: 14,
      createdBy: "demo_ines",
      attendeeIds: ["demo_ines", "demo_joao", "demo_carolina", "demo_rita", "demo_nuno"],
      vibe: "social",
      photoPolicy: "perguntar primeiro",
      boundaryNotes: "Check-in inicial, pares de caminhada opcionais e saída fácil a meio.",
      aftercarePrompt: "Mensagem curta no dia seguinte para perceber energia e limites.",
    },
    {
      id: "demo_event_jantar_sem_fotos",
      title: "Jantar pequeno sem fotos",
      startsAt: "2026-07-05T20:00",
      place: "Cedofeita",
      groupId: "g_cuidados",
      capacity: 8,
      createdBy: "demo_joao",
      attendeeIds: ["demo_ines", "demo_joao", "demo_nuno"],
      vibe: "íntimo",
      photoPolicy: "sem fotos",
      boundaryNotes: "Telemóveis pousados durante a ronda inicial; cada pessoa escolhe o nível de partilha.",
      aftercarePrompt: "Ronda de saída e canal de aftercare aberto por 48h.",
    },
  ],
  eventRooms: [
    {
      id: "room_e1_logistica",
      eventId: "e_1",
      name: "Logística café",
      purpose: "combinar chegada, anfitriã/o e dúvidas de última hora",
      expiresAt: "2026-06-23T19:00:00",
      createdBy: "m_di",
      memberIds: ["m_di", "m_ana", "m_lia"],
    },
    {
      id: "room_e1_aftercare",
      eventId: "e_1",
      name: "Aftercare",
      purpose: "check-ins e notas depois do encontro",
      expiresAt: "2026-06-25T12:00:00",
      createdBy: "m_di",
      memberIds: ["m_di", "m_ana", "m_lia"],
    },
    {
      id: "demo_room_matosinhos_logistica",
      eventId: "demo_event_matosinhos",
      name: "Logística Matosinhos",
      purpose: "combinar comboios, ponto de encontro e quem acompanha novas pessoas",
      expiresAt: "2026-06-29T12:00:00",
      createdBy: "demo_ines",
      memberIds: ["demo_ines", "demo_joao", "demo_carolina", "demo_rita", "demo_nuno"],
    },
    {
      id: "demo_room_jantar_aftercare",
      eventId: "demo_event_jantar_sem_fotos",
      name: "Aftercare jantar",
      purpose: "check-ins privados e notas para melhorar próximos encontros íntimos",
      expiresAt: "2026-07-07T20:00:00",
      createdBy: "demo_joao",
      memberIds: ["demo_ines", "demo_joao", "demo_nuno"],
    },
  ],
  docs: [
    {
      id: "d_1",
      code: "DOC-001",
      title: "Acordos de consentimento",
      summary:
        "Qualquer encontro da comunidade assume consentimento explícito, reversível, informado, entusiasmado e específico.",
      ownerId: "m_di",
      updatedAt: "2026-06-12",
      tags: ["consentimento", "eventos"],
    },
    {
      id: "d_2",
      code: "DOC-002",
      title: "Entradas por apadrinhamento",
      summary:
        "Cada nova entrada fica vinculada a quem convidou, com responsabilidade inicial de acolhimento e orientação.",
      ownerId: "m_ana",
      updatedAt: "2026-06-14",
      tags: ["entradas", "confiança"],
    },
    {
      id: "d_3",
      code: "DOC-003",
      title: "Gestão de subgrupos",
      summary:
        "Subgrupos têm admin definido, visibilidade própria e uma lista de membros revista periodicamente.",
      ownerId: "m_miguel",
      updatedAt: "2026-06-16",
      tags: ["grupos", "moderação"],
    },
    {
      id: "demo_doc_intro",
      code: "DOC-DEMO-01",
      title: "Como pedir uma apresentação quente",
      summary:
        "Antes de abordar alguém novo, pede-se contexto a uma pessoa ponte. A ponte só faz a apresentação se as duas partes disserem sim.",
      ownerId: "demo_ines",
      updatedAt: "2026-06-18",
      tags: ["entradas", "consentimento", "confiança"],
    },
    {
      id: "demo_doc_media",
      code: "DOC-DEMO-02",
      title: "Media íntima e envelopes privados",
      summary:
        "Imagens íntimas precisam de convite explícito, prazo curto, opção de ver uma vez e nunca devem ser reenviadas fora do contexto original.",
      ownerId: "demo_joao",
      updatedAt: "2026-06-18",
      tags: ["media", "privacidade", "segurança"],
    },
  ],
  decisions: [
    {
      id: "dec_1",
      code: "DEC-001",
      title: "Política de fotografias em eventos",
      summary: "Fotos de grupo só com consentimento explícito e indicação clara de onde serão partilhadas.",
      outcome: "Sem fotos em eventos íntimos; em eventos sociais, perguntar primeiro e aceitar um não sem conversa.",
      status: "decidida",
      createdBy: "m_di",
      createdAt: "2026-06-17T18:30:00",
      votes: [
        { memberId: "m_di", value: "sim", note: "protege confiança" },
        { memberId: "m_ana", value: "sim", note: "bom para acolhimento" },
        { memberId: "m_miguel", value: "sim", note: "essencial" },
      ],
    },
    {
      id: "demo_decision_aftercare",
      code: "DEC-DEMO-01",
      title: "Aftercare obrigatório em eventos íntimos",
      summary: "A comunidade discutiu como evitar que eventos pequenos terminem sem acompanhamento emocional.",
      outcome:
        "Eventos íntimos passam a ter sala temporária de aftercare durante 48h, com uma pessoa responsável por recolher sinais de desconforto.",
      status: "decidida",
      createdBy: "demo_ines",
      createdAt: "2026-06-18T13:10:00",
      votes: [
        { memberId: "demo_ines", value: "sim", note: "dá segurança às novas pessoas" },
        { memberId: "demo_joao", value: "sim", note: "ajuda a aprender com cada evento" },
        { memberId: "demo_nuno", value: "abstenção", note: "quero rever carga de trabalho" },
      ],
    },
  ],
  eventCheckIns: [
    {
      id: "chk_1",
      eventId: "e_1",
      memberId: "m_lia",
      mood: "bem",
      note: "Gostei de saber quem era anfitriã/o logo no início.",
      visibility: "admins",
      createdAt: "2026-06-23T11:00:00",
    },
    {
      id: "demo_checkin_matosinhos_rita",
      eventId: "demo_event_matosinhos",
      memberId: "demo_rita",
      mood: "bem",
      note: "Foi bom ter ponto de encontro claro e saber quem era a pessoa ponte.",
      visibility: "comunidade",
      createdAt: "2026-06-29T10:30:00",
    },
    {
      id: "demo_checkin_jantar_nuno",
      eventId: "demo_event_jantar_sem_fotos",
      memberId: "demo_nuno",
      mood: "misto",
      note: "Gostei do ambiente sem fotos; a ronda inicial podia ter sido mais curta.",
      visibility: "admins",
      createdAt: "2026-07-06T11:00:00",
    },
  ],
  intentions: [
    {
      memberId: "m_di",
      kinds: ["amizades", "eventos", "só intro"],
      note: "Disponível para apresentar pessoas e apoiar novas entradas.",
      updatedAt: "2026-06-18T10:00:00",
    },
    {
      memberId: "m_ana",
      kinds: ["amizades", "dates", "eventos"],
      note: "Aberta a conhecer devagar, especialmente em eventos.",
      updatedAt: "2026-06-18T10:10:00",
    },
    {
      memberId: "m_miguel",
      kinds: ["amizades", "só intro"],
      note: "Prefere que novas conversas venham com contexto.",
      updatedAt: "2026-06-18T10:20:00",
    },
    {
      memberId: "m_lia",
      kinds: ["amizades", "eventos"],
      note: "Procura companhia para eventos e conversas em grupo.",
      updatedAt: "2026-06-18T10:30:00",
    },
    {
      memberId: "demo_ines",
      kinds: ["amizades", "eventos", "só intro"],
      note: "Disponível para fazer pontes e ajudar novas pessoas a chegar com contexto.",
      updatedAt: "2026-06-18T11:45:00",
    },
    {
      memberId: "demo_joao",
      kinds: ["amizades", "eventos"],
      note: "Aberto a amizades e companhia para organizar eventos pequenos.",
      updatedAt: "2026-06-18T11:50:00",
    },
    {
      memberId: "demo_carolina",
      kinds: ["amizades", "dates", "flirt"],
      note: "Curiosa por dates lentos, com humor e muita clareza.",
      updatedAt: "2026-06-18T11:55:00",
    },
    {
      memberId: "demo_rita",
      kinds: ["amizades", "só intro"],
      note: "Prefere primeiras conversas por apresentação quente.",
      updatedAt: "2026-06-18T12:00:00",
    },
    {
      memberId: "demo_nuno",
      kinds: ["amizades", "eventos", "dates"],
      note: "Procura eventos ao ar livre e conversas sem pressa.",
      updatedAt: "2026-06-18T12:05:00",
    },
  ],
  introductions: [
    {
      id: "intro_1",
      requesterId: "m_lia",
      targetId: "m_miguel",
      connectorId: "m_di",
      note: "Gostava de falar sobre acordos de eventos pequenos.",
      status: "pedido",
      createdAt: "2026-06-18T11:15:00",
    },
    {
      id: "demo_intro_rita_nuno",
      requesterId: "demo_rita",
      targetId: "demo_nuno",
      connectorId: "demo_ines",
      note: "A Rita gostava de falar com o Nuno sobre eventos ao ar livre, mas prefere uma ponte primeiro.",
      status: "pedido",
      createdAt: "2026-06-18T12:15:00",
    },
  ],
  interests: [
    {
      id: "interest_1",
      fromId: "m_ana",
      toId: "m_lia",
      kind: "evento",
      createdAt: "2026-06-18T11:00:00",
    },
    {
      id: "interest_2",
      fromId: "m_lia",
      toId: "m_ana",
      kind: "evento",
      createdAt: "2026-06-18T11:05:00",
    },
    {
      id: "demo_interest_ines_nuno_evento",
      fromId: "demo_ines",
      toId: "demo_nuno",
      kind: "evento",
      createdAt: "2026-06-18T12:40:00",
    },
    {
      id: "demo_interest_nuno_ines_evento",
      fromId: "demo_nuno",
      toId: "demo_ines",
      kind: "evento",
      createdAt: "2026-06-18T12:41:00",
    },
    {
      id: "demo_interest_caro_joao_amizade",
      fromId: "demo_carolina",
      toId: "demo_joao",
      kind: "amizade",
      createdAt: "2026-06-18T12:42:00",
    },
    {
      id: "demo_interest_joao_caro_amizade",
      fromId: "demo_joao",
      toId: "demo_carolina",
      kind: "amizade",
      createdAt: "2026-06-18T12:43:00",
    },
  ],
  relationships: [
    {
      id: "rel_1",
      memberId: "m_di",
      relatedMemberId: "m_ana",
      label: "parceria de organização",
      visibility: "comunidade",
      createdAt: "2026-06-18T10:40:00",
    },
    {
      id: "rel_2",
      memberId: "m_ana",
      relatedMemberId: "m_lia",
      label: "padrinha",
      visibility: "comunidade",
      createdAt: "2026-06-18T10:45:00",
    },
    {
      id: "demo_rel_ines_joao",
      memberId: "demo_ines",
      relatedMemberId: "demo_joao",
      label: "padrinha",
      visibility: "comunidade",
      createdAt: "2026-06-18T12:45:00",
    },
    {
      id: "demo_rel_joao_rita",
      memberId: "demo_joao",
      relatedMemberId: "demo_rita",
      label: "padrinho",
      visibility: "comunidade",
      createdAt: "2026-06-18T12:50:00",
    },
    {
      id: "demo_rel_ines_nuno",
      memberId: "demo_ines",
      relatedMemberId: "demo_nuno",
      label: "equipa de eventos",
      visibility: "comunidade",
      createdAt: "2026-06-18T12:55:00",
    },
  ],
  privacySettings: {
    deviceOnlyMessages: false,
    localMediaVault: true,
    metadataStripping: true,
    p2pReady: false,
    relayPlan: "Servidor apenas como ponte temporária; media íntima deve migrar para envio direto entre dispositivos.",
  },
  reports: [
    {
      id: "report_demo_1",
      reporterId: "demo_rita",
      subjectMemberId: "demo_joao",
      roomId: "g_geral",
      messageId: null,
      category: "consentimento",
      severity: "media",
      status: "triagem",
      assigneeId: "m_di",
      summary: "Pedido de ajuda para definir limites em mensagens privadas.",
      details: "A Rita quer apoio para responder sem escalar conflito e prefere que uma admin acompanhe.",
      internalNotes: "Confirmar com a pessoa ponte antes de contactar o João.",
      createdAt: "2026-06-18T15:20:00",
      updatedAt: "2026-06-18T15:45:00",
    },
  ],
  auditLogs: [
    {
      id: "audit_demo_1",
      actorId: "m_di",
      action: "report.updated",
      targetType: "report",
      targetId: "report_demo_1",
      metadata: { status: "triagem", severity: "media" },
      createdAt: "2026-06-18T15:45:00",
    },
  ],
  messages: [
    {
      id: "msg_1",
      roomId: "g_geral",
      authorId: "m_di",
      body: "Vou abrir o café de boas-vindas com uma ronda curta de expectativas.",
      createdAt: "2026-06-18T09:36:00",
      recipientsAtSend: ["m_ana", "m_lia"],
      citationCode: "DOC-001",
      encryptionVersion: 0,
      encryptionStatus: "plain",
      encryptedDeviceCount: 0,
      imageEncrypted: false,
      imageEncryptionVersion: 0,
      imageViewOnce: false,
      imageOpenedBy: [],
      imageConsentRequired: false,
    },
    {
      id: "demo_msg_geral_intro",
      roomId: "g_geral",
      authorId: "demo_ines",
      body:
        "Deixei um resumo curto sobre como pedir apresentações quentes. Usem @DOC-DEMO-01 quando alguém novo perguntar como funciona.",
      createdAt: "2026-06-18T13:00:00",
      recipientsAtSend: ["m_di", "m_ana", "m_lia", "demo_joao", "demo_carolina", "demo_rita", "demo_nuno"],
      citationCode: "DOC-DEMO-01",
      encryptionVersion: 0,
      encryptionStatus: "plain",
      encryptedDeviceCount: 0,
      imageEncrypted: false,
      imageEncryptionVersion: 0,
      imageViewOnce: false,
      imageOpenedBy: [],
      imageConsentRequired: false,
    },
    {
      id: "demo_msg_eventos_matosinhos",
      roomId: "g_eventos",
      authorId: "demo_joao",
      body: "A sala temporária da caminhada já está aberta para combinar chegada e pares opcionais.",
      createdAt: "2026-06-18T13:05:00",
      recipientsAtSend: ["m_di", "m_ana", "demo_ines", "demo_carolina", "demo_nuno"],
      encryptionVersion: 0,
      encryptionStatus: "plain",
      encryptedDeviceCount: 0,
      imageEncrypted: false,
      imageEncryptionVersion: 0,
      imageViewOnce: false,
      imageOpenedBy: [],
      imageConsentRequired: false,
    },
    {
      id: "demo_msg_media",
      roomId: "g_geral",
      authorId: "demo_carolina",
      body: "Gostei da regra dos envelopes privados. Ajuda a falar de nudes sem tornar a conversa pesada.",
      createdAt: "2026-06-18T13:12:00",
      recipientsAtSend: ["m_di", "m_ana", "m_lia", "demo_ines", "demo_joao", "demo_rita", "demo_nuno"],
      citationCode: "DOC-DEMO-02",
      encryptionVersion: 0,
      encryptionStatus: "plain",
      encryptedDeviceCount: 0,
      imageEncrypted: false,
      imageEncryptionVersion: 0,
      imageViewOnce: false,
      imageOpenedBy: [],
      imageConsentRequired: false,
    },
  ],
};

function App() {
  const usingBackend = Boolean(supabase);
  const [state, setState] = useState<CommunityState>(() => loadState());
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(usingBackend);
  const [profile, setProfile] = useState<Member | null>(null);
  const [communityHasFounder, setCommunityHasFounder] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(usingBackend ? "auth" : "local");
  const [syncMessage, setSyncMessage] = useState("");
  const [activeNav, setActiveNav] = useState<NavKey>("hoje");
  const [currentMemberId, setCurrentMemberId] = useState("m_di");
  const [activeGroupId, setActiveGroupId] = useState("g_geral");
  const [selectedCitation, setSelectedCitation] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [deviceIdentity, setDeviceIdentity] = useState<DeviceIdentity | null>(null);
  const [deviceKeys, setDeviceKeys] = useState<DeviceKey[]>([]);
  const [deviceSecurityStatus, setDeviceSecurityStatus] = useState<DeviceSecurityStatus>("off");
  const [directPeerStatuses, setDirectPeerStatuses] = useState<DirectPeerStatus[]>([]);
  const stateRef = useRef(state);
  const profileRef = useRef(profile);
  const activeGroupIdRef = useRef(activeGroupId);
  const deviceIdentityRef = useRef(deviceIdentity);
  const deviceKeysRef = useRef(deviceKeys);
  const directPeersRef = useRef(new Map<string, DirectPeerConnection>());
  const seenSignalIdsRef = useRef(new Set<string>());

  const fetchBackendData = useCallback(async () => {
    if (!supabase || !session) return;
    setSyncStatus("loading");

    const [
      profilesResult,
      groupsResult,
      groupMembersResult,
      eventsResult,
      attendeesResult,
      eventRoomsResult,
      docsResult,
      decisionsResult,
      checkInsResult,
      intentionsResult,
      introductionsResult,
      interestsResult,
      relationshipsResult,
      privacyResult,
      messagesResult,
      invitesResult,
      deviceKeysResult,
      reportsResult,
      auditLogsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("joined_at", { ascending: true }),
      supabase.from("groups").select("*").order("name", { ascending: true }),
      supabase.from("group_members").select("*"),
      supabase.from("events").select("*").order("starts_at", { ascending: true }),
      supabase.from("event_attendees").select("*"),
      supabase.from("event_rooms").select("*").order("expires_at", { ascending: true }),
      supabase.from("docs").select("*").order("updated_at", { ascending: false }),
      supabase.from("decisions").select("*").order("created_at", { ascending: false }),
      supabase.from("event_checkins").select("*").order("created_at", { ascending: false }),
      supabase.from("member_intentions").select("*").order("updated_at", { ascending: false }),
      supabase.from("warm_introductions").select("*").order("created_at", { ascending: false }),
      supabase.from("mutual_interests").select("*").order("created_at", { ascending: false }),
      supabase.from("relationship_links").select("*").order("created_at", { ascending: false }),
      supabase.from("privacy_settings").select("*").eq("id", "main").maybeSingle(),
      supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(200),
      supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("device_keys").select("*").order("last_seen_at", { ascending: false }),
      supabase.from("reports").select("*").order("updated_at", { ascending: false }),
      supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    const firstError = [
      profilesResult.error,
      groupsResult.error,
      groupMembersResult.error,
      eventsResult.error,
      attendeesResult.error,
      eventRoomsResult.error,
      docsResult.error,
      decisionsResult.error,
      checkInsResult.error,
      intentionsResult.error,
      introductionsResult.error,
      interestsResult.error,
      relationshipsResult.error,
      privacyResult.error,
      messagesResult.error,
      invitesResult.error,
      deviceKeysResult.error,
      reportsResult.error,
      auditLogsResult.error,
    ].find(Boolean);

    if (firstError) {
      setSyncStatus("error");
      setSyncMessage(firstError.message);
      return;
    }

    const groupIdsByMember = new Map<string, string[]>();
    (groupMembersResult.data as GroupMemberRow[] | null)?.forEach((row) => {
      const groupIds = groupIdsByMember.get(row.member_id) ?? [];
      groupIds.push(row.group_id);
      groupIdsByMember.set(row.member_id, groupIds);
    });

    const attendeeIdsByEvent = new Map<string, string[]>();
    (attendeesResult.data as EventAttendeeRow[] | null)?.forEach((row) => {
      const attendeeIds = attendeeIdsByEvent.get(row.event_id) ?? [];
      attendeeIds.push(row.member_id);
      attendeeIdsByEvent.set(row.event_id, attendeeIds);
    });

    const members = await Promise.all(
      ((profilesResult.data ?? []) as ProfileRow[]).map(async (row) => {
        let avatarUrl: string | undefined;
        if (row.avatar_path) {
          const { data } = await supabase.storage.from("profile-photos").createSignedUrl(row.avatar_path, 60 * 60);
          avatarUrl = data?.signedUrl;
        }

        return {
          id: row.id,
          name: row.name,
          pronouns: row.pronouns ?? "por definir",
          avatarPath: row.avatar_path ?? undefined,
          avatarUrl,
          joinedAt: row.joined_at,
          sponsorId: row.sponsor_id,
          role: row.role,
          groupIds: groupIdsByMember.get(row.id) ?? [],
          status: row.status,
          consentAvailableFor: row.consent_available_for ?? "",
          consentLimits: row.consent_limits ?? "",
          mediaPreference: row.media_preference ?? "",
          relationshipContext: row.relationship_context ?? "",
          eventComfort: row.event_comfort ?? "",
          suspendedUntil: row.suspended_until,
        };
      }),
    );

    const groups = ((groupsResult.data ?? []) as GroupRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      focus: row.focus,
      privacy: row.privacy,
      stewardId: row.steward_id ?? "",
      color: row.color,
    }));

    const events = ((eventsResult.data ?? []) as EventRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      place: row.place,
      groupId: row.group_id,
      capacity: row.capacity,
      createdBy: row.created_by,
      attendeeIds: attendeeIdsByEvent.get(row.id) ?? [],
      vibe: row.vibe ?? "social",
      photoPolicy: row.photo_policy ?? "perguntar primeiro",
      boundaryNotes: row.boundary_notes ?? "",
      aftercarePrompt: row.aftercare_prompt ?? "",
    }));

    const eventRooms = ((eventRoomsResult.data ?? []) as EventRoomRow[]).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      purpose: row.purpose,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      memberIds: row.member_ids ?? [],
    }));

    const docs = ((docsResult.data ?? []) as DocRow[]).map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      summary: row.summary,
      ownerId: row.owner_id,
      updatedAt: row.updated_at,
      tags: row.tags ?? [],
    }));

    const decisions = ((decisionsResult.data ?? []) as DecisionRow[]).map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      summary: row.summary,
      outcome: row.outcome,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      votes: row.votes ?? [],
    }));

    const eventCheckIns = ((checkInsResult.data ?? []) as EventCheckInRow[]).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      memberId: row.member_id,
      mood: row.mood,
      note: row.note ?? "",
      visibility: row.visibility,
      createdAt: row.created_at,
    }));

    const intentions = ((intentionsResult.data ?? []) as IntentionRow[]).map((row) => ({
      memberId: row.member_id,
      kinds: row.kinds ?? [],
      note: row.note ?? "",
      updatedAt: row.updated_at,
    }));

    const introductions = ((introductionsResult.data ?? []) as IntroductionRow[]).map((row) => ({
      id: row.id,
      requesterId: row.requester_id,
      targetId: row.target_id,
      connectorId: row.connector_id,
      note: row.note ?? "",
      status: row.status,
      createdAt: row.created_at,
    }));

    const interests = ((interestsResult.data ?? []) as InterestRow[]).map((row) => ({
      id: row.id,
      fromId: row.from_id,
      toId: row.to_id,
      kind: row.kind,
      createdAt: row.created_at,
    }));

    const relationships = ((relationshipsResult.data ?? []) as RelationshipRow[]).map((row) => ({
      id: row.id,
      memberId: row.member_id,
      relatedMemberId: row.related_member_id,
      label: row.label,
      visibility: row.visibility,
      createdAt: row.created_at,
    }));

    const privacyRow = privacyResult.data as PrivacySettingsRow | null;
    const privacySettings: PrivacySettings = {
      deviceOnlyMessages: privacyRow?.device_only_messages ?? seedState.privacySettings.deviceOnlyMessages,
      localMediaVault: privacyRow?.local_media_vault ?? seedState.privacySettings.localMediaVault,
      metadataStripping: privacyRow?.metadata_stripping ?? seedState.privacySettings.metadataStripping,
      p2pReady: privacyRow?.p2p_ready ?? seedState.privacySettings.p2pReady,
      relayPlan: privacyRow?.relay_plan ?? seedState.privacySettings.relayPlan,
    };

    const rawDeviceKeys = ((deviceKeysResult.data ?? []) as DeviceKeyRow[]).map(deviceKeyFromRow);
    const nextDeviceKeys = await annotateDeviceKeysWithTrust(rawDeviceKeys, deviceIdentity);
    setDeviceKeys(nextDeviceKeys);

    const messages = await Promise.all(
      ((messagesResult.data ?? []) as MessageRow[]).map(async (row) => {
        const imageOpenedBy = row.image_opened_by ?? [];
        const imageViewOnce = Boolean(row.image_view_once);
        const isAuthor = row.author_id === session.user.id;
        const encryptionVersion = row.encryption_version ?? 0;
        const encryptedPayloads = row.encrypted_payloads ?? {};
        const encryptedDeviceCount = Object.keys(encryptedPayloads).length;
        const imageEncryptionVersion = row.image_encryption_version ?? 0;
        const imageEncrypted = imageEncryptionVersion > 0;
        let body = row.body;
        let citationCode = row.citation_code ?? undefined;
        let imageName = row.image_name ?? undefined;
        let imageMimeType = row.image_mime_type ?? undefined;
        let imageDecryption: EncryptedMediaMetadata | undefined;
        let encryptionStatus: EncryptionStatus = "plain";
        let imageUrl: string | undefined;

        if (encryptionVersion > 0) {
          body = "Mensagem cifrada neste dispositivo.";
          citationCode = undefined;
          encryptionStatus = "locked";

          if (deviceIdentity) {
            const decrypted = await decryptMessageEnvelope(
              encryptedPayloads,
              row.sender_device_id,
              deviceIdentity,
              nextDeviceKeys,
            );
            if (decrypted) {
              body = decrypted.body;
              citationCode = decrypted.citationCode ?? undefined;
              imageDecryption = decrypted.image ?? undefined;
              if (imageDecryption) {
                imageName = imageDecryption.name;
                imageMimeType = imageDecryption.mimeType;
              }
              encryptionStatus = "encrypted";
            }
          }
        }

        if (row.image_path && !imageEncrypted && (isAuthor || !imageViewOnce)) {
          const { data } = await supabase.storage
            .from("message-images")
            .createSignedUrl(row.image_path, 60 * 60);
          imageUrl = data?.signedUrl;
        }

        return {
          id: row.id,
          roomId: row.room_id,
          authorId: row.author_id,
          body,
          createdAt: row.created_at,
          recipientsAtSend: row.recipients_at_send ?? [],
          citationCode,
          encryptionVersion,
          encryptedPayloads,
          senderDeviceId: row.sender_device_id,
          encryptionStatus,
          encryptedDeviceCount,
          imagePath: row.image_path ?? undefined,
          imageUrl,
          imageName,
          imageMimeType,
          imageEncrypted,
          imageEncryptionVersion,
          imageDecryption,
          imageViewOnce,
          imageOpenedBy,
          imageConsentRequired: row.image_consent_required ?? false,
          imageExpiresAt: row.image_expires_at ?? undefined,
        };
      }),
    );

    const invites = ((invitesResult.data ?? []) as InviteRow[]).map((row) => ({
      code: row.code,
      sponsorId: row.sponsor_id,
      role: row.role,
      maxUses: row.max_uses,
      uses: row.uses,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));

    const reports = ((reportsResult.data ?? []) as ReportRow[]).map((row) => ({
      id: row.id,
      reporterId: row.reporter_id,
      subjectMemberId: row.subject_member_id,
      roomId: row.room_id,
      messageId: row.message_id,
      category: row.category,
      severity: row.severity,
      status: row.status,
      assigneeId: row.assignee_id,
      summary: row.summary,
      details: row.details ?? "",
      internalNotes: row.internal_notes ?? "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const auditLogs = ((auditLogsResult.data ?? []) as AuditLogRow[]).map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    }));

    setState({
      members,
      groups,
      events,
      eventRooms,
      docs,
      decisions,
      eventCheckIns,
      intentions,
      introductions,
      interests,
      relationships,
      privacySettings,
      messages,
      reports,
      auditLogs,
    });
    setInviteCodes(invites);
    setSyncStatus("connected");
    setSyncMessage("");
  }, [deviceIdentity, session]);

  const loadProfile = useCallback(async (currentSession: Session | null) => {
    if (!supabase || !currentSession) return null;

    const { data: hasFounder, error: founderError } = await supabase.rpc("community_has_founder");
    if (!founderError) {
      setCommunityHasFounder(Boolean(hasFounder));
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentSession.user.id)
      .maybeSingle();

    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return null;
    }

    if (!data) {
      setProfile(null);
      setSyncStatus("auth");
      return null;
    }

    const row = data as ProfileRow;
    let avatarUrl: string | undefined;
    if (row.avatar_path) {
      const { data: signedAvatar } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(row.avatar_path, 60 * 60);
      avatarUrl = signedAvatar?.signedUrl;
    }

    const member: Member = {
      id: row.id,
      name: row.name,
      pronouns: row.pronouns ?? "por definir",
      avatarPath: row.avatar_path ?? undefined,
      avatarUrl,
      joinedAt: row.joined_at,
      sponsorId: row.sponsor_id,
      role: row.role,
      groupIds: [],
      status: row.status,
      consentAvailableFor: row.consent_available_for ?? "",
      consentLimits: row.consent_limits ?? "",
      mediaPreference: row.media_preference ?? "",
      relationshipContext: row.relationship_context ?? "",
      eventComfort: row.event_comfort ?? "",
      suspendedUntil: row.suspended_until,
    };
    setProfile(member);
    setCurrentMemberId(member.id);
    return member;
  }, []);

  const refreshSignedInData = useCallback(async () => {
    if (!session) return;
    const member = await loadProfile(session);
    if (member && !isMemberSuspended(member)) {
      await fetchBackendData();
    }
  }, [fetchBackendData, loadProfile, session]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
      setAuthLoading(false);
      setSyncStatus(nextSession ? "loading" : "auth");
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (!session) {
      setProfile(null);
      setDeviceIdentity(null);
      setDeviceKeys([]);
      setDeviceSecurityStatus("off");
      setSyncStatus("auth");
      return;
    }
    refreshSignedInData();
  }, [refreshSignedInData, session]);

  useEffect(() => {
    if (!supabase || !session || !profile || isMemberSuspended(profile)) {
      setDeviceIdentity(null);
      setDeviceKeys([]);
      setDeviceSecurityStatus("off");
      return;
    }

    let cancelled = false;
    setDeviceIdentity(null);
    setDeviceKeys([]);
    setDeviceSecurityStatus("creating");

    ensureDeviceIdentity(supabase, profile.id)
      .then((identity) => {
        if (cancelled) return;
        setDeviceIdentity(identity);
        setDeviceSecurityStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDeviceIdentity(null);
        setDeviceSecurityStatus("error");
        setSyncStatus("error");
        setSyncMessage(error instanceof Error ? error.message : "Não foi possível preparar a chave deste dispositivo.");
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.id, session?.user.id]);

  useEffect(() => {
    if (!deviceIdentity || !profile || !session) return;
    fetchBackendData();
  }, [deviceIdentity?.deviceId, fetchBackendData, profile?.id, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session || !profile) return;
    let reloadHandle: number | undefined;
    const channel = supabase.channel("community-tables");

    communityRealtimeTables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        if (reloadHandle) window.clearTimeout(reloadHandle);
        reloadHandle = window.setTimeout(() => {
          fetchBackendData();
        }, 200);
      });
    });

    channel.subscribe();

    return () => {
      if (reloadHandle) window.clearTimeout(reloadHandle);
      supabase.removeChannel(channel);
    };
  }, [fetchBackendData, profile, session]);

  useEffect(() => {
    if (!usingBackend) {
      localStorage.setItem(storeKey, JSON.stringify(state));
    }
  }, [state, usingBackend]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  useEffect(() => {
    deviceIdentityRef.current = deviceIdentity;
  }, [deviceIdentity]);

  useEffect(() => {
    deviceKeysRef.current = deviceKeys;
  }, [deviceKeys]);

  useEffect(() => {
    if (!supabase || !deviceIdentity) return;

    const updateLastSeen = () => {
      supabase
        .from("device_keys")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", deviceIdentity.deviceId)
        .then(() => undefined);
    };

    updateLastSeen();
    const interval = window.setInterval(updateLastSeen, 30_000);
    return () => window.clearInterval(interval);
  }, [deviceIdentity?.deviceId]);

  useEffect(() => {
    if (!notice) return;
    const handle = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(handle);
  }, [notice]);

  useEffect(() => {
    if (profile) {
      setProfile((current) => state.members.find((member) => member.id === current?.id) ?? current);
    }
    if (!state.members.some((member) => member.id === currentMemberId)) {
      setCurrentMemberId(usingBackend ? profile?.id ?? state.members[0]?.id ?? "" : state.members[0]?.id ?? "");
    }
    if (!state.groups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(state.groups[0]?.id ?? "");
    }
    if (
      selectedCitation &&
      !state.docs.some((doc) => doc.code === selectedCitation) &&
      !state.decisions.some((decision) => decision.code === selectedCitation)
    ) {
      setSelectedCitation(state.docs[0]?.code ?? "");
    }
  }, [
    activeGroupId,
    currentMemberId,
    profile,
    selectedCitation,
    state.decisions,
    state.docs,
    state.groups,
    state.members,
    usingBackend,
  ]);

  const memberById = useMemo(
    () => new Map(state.members.map((member) => [member.id, member])),
    [state.members],
  );
  const groupById = useMemo(
    () => new Map(state.groups.map((group) => [group.id, group])),
    [state.groups],
  );
  const docsByCode = useMemo(
    () => new Map(state.docs.map((doc) => [doc.code, doc])),
    [state.docs],
  );
  const decisionsByCode = useMemo(
    () => new Map(state.decisions.map((decision) => [decision.code, decision])),
    [state.decisions],
  );

  const activeGroup = groupById.get(activeGroupId) ?? state.groups[0];
  const currentMember = memberById.get(currentMemberId) ?? state.members[0];
  const syncCopy = getSyncCopy(syncStatus);
  const onlineMembers = state.members.filter((member) => member.status === "online");
  const directPeerCount = directPeerStatuses.filter(
    (status) => status.roomId === activeGroupId && status.state === "open",
  ).length;
  const upcomingEvents = [...state.events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  useEffect(() => {
    if (activeNav === "admin" && currentMember.role !== "admin") {
      setActiveNav("hoje");
    }
  }, [activeNav, currentMember.role]);

  const filteredDocs = state.docs.filter((doc) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [doc.title, doc.summary, doc.code, ...doc.tags].some((value) =>
      value.toLowerCase().includes(term),
    );
  });
  const filteredDecisions = state.decisions.filter((decision) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [decision.code, decision.title, decision.summary, decision.outcome, decision.status].some((value) =>
      value.toLowerCase().includes(term),
    );
  });

  function updateState(updater: (draft: CommunityState) => CommunityState) {
    if (usingBackend) return;
    setState((current) => updater(current));
  }

  function showNotice(message: string) {
    setNotice(message);
  }

  function updateDirectPeerStatus(connection: DirectPeerConnection, state: DirectPeerState) {
    setDirectPeerStatuses((current) => {
      const next = current.filter((status) => status.peerKey !== connection.peerKey);
      if (state !== "closed") {
        next.push({
          peerKey: connection.peerKey,
          memberId: connection.memberId,
          deviceId: connection.deviceId,
          roomId: connection.roomId,
          state,
          updatedAt: new Date().toISOString(),
        });
      }
      return next;
    });
  }

  function closeDirectPeer(peerKey: string) {
    const connection = directPeersRef.current.get(peerKey);
    if (!connection) return;
    connection.channel?.close();
    connection.peer.close();
    directPeersRef.current.delete(peerKey);
    updateDirectPeerStatus(connection, "closed");
  }

  async function sendP2PSignal(
    toMemberId: string,
    toDeviceId: string,
    roomId: string,
    signalType: P2PSignalType,
    payload: Record<string, unknown>,
  ) {
    const currentProfile = profileRef.current;
    const currentIdentity = deviceIdentityRef.current;
    if (!supabase || !currentProfile || !currentIdentity) return;

    await supabase.from("p2p_signals").insert({
      id: `sig_${crypto.randomUUID()}`,
      room_id: roomId,
      from_member_id: currentProfile.id,
      from_device_id: currentIdentity.deviceId,
      to_member_id: toMemberId,
      to_device_id: toDeviceId,
      signal_type: signalType,
      payload,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }

  function setupDirectChannel(connection: DirectPeerConnection, channel: RTCDataChannel) {
    connection.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => updateDirectPeerStatus(connection, "open");
    channel.onclose = () => updateDirectPeerStatus(connection, "closed");
    channel.onerror = () => updateDirectPeerStatus(connection, "failed");
    channel.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        const payload = JSON.parse(event.data) as DirectChatPayload;
        if (payload.type === "chat-message") {
          handleDirectChatPayload(payload);
        }
      } catch {
        // Ignore malformed direct packets.
      }
    };
  }

  async function createDirectPeer(remoteDevice: DeviceKey, roomId: string, shouldOffer: boolean) {
    if (!("RTCPeerConnection" in window)) return null;
    const currentProfile = profileRef.current;
    const currentIdentity = deviceIdentityRef.current;
    if (!currentProfile || !currentIdentity || remoteDevice.memberId === currentProfile.id) return null;

    const peerKey = remoteDevice.id;
    const existing = directPeersRef.current.get(peerKey);
    if (existing && existing.peer.connectionState !== "closed") return existing;

    const peer = new RTCPeerConnection(p2pConnectionConfig);
    const connection: DirectPeerConnection = {
      peerKey,
      memberId: remoteDevice.memberId,
      deviceId: remoteDevice.id,
      roomId,
      peer,
      pendingIce: [],
    };
    directPeersRef.current.set(peerKey, connection);
    updateDirectPeerStatus(connection, "connecting");

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendP2PSignal(
        remoteDevice.memberId,
        remoteDevice.id,
        roomId,
        "ice",
        event.candidate.toJSON() as unknown as Record<string, unknown>,
      );
    };
    peer.ondatachannel = (event) => setupDirectChannel(connection, event.channel);
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") updateDirectPeerStatus(connection, "open");
      if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
        updateDirectPeerStatus(connection, "failed");
      }
      if (peer.connectionState === "closed") updateDirectPeerStatus(connection, "closed");
    };

    if (shouldOffer) {
      setupDirectChannel(connection, peer.createDataChannel("porto-nm-direct"));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendP2PSignal(remoteDevice.memberId, remoteDevice.id, roomId, "offer", offer as unknown as Record<string, unknown>);
    }

    return connection;
  }

  async function applyQueuedIce(connection: DirectPeerConnection) {
    if (!connection.peer.remoteDescription) return;
    const queued = [...connection.pendingIce];
    connection.pendingIce = [];
    for (const candidate of queued) {
      try {
        await connection.peer.addIceCandidate(candidate);
      } catch {
        // ICE candidates can legitimately go stale while peers reconnect.
      }
    }
  }

  async function handleP2PSignal(row: P2PSignalRow) {
    const currentIdentity = deviceIdentityRef.current;
    const currentProfile = profileRef.current;
    if (!currentIdentity || !currentProfile || row.to_device_id !== currentIdentity.deviceId) return;
    if (seenSignalIdsRef.current.has(row.id)) return;
    seenSignalIdsRef.current.add(row.id);
    if (new Date(row.expires_at).getTime() < Date.now()) return;
    if (isVideoSignalPayload(row.payload)) return;

    const remoteDevice =
      deviceKeysRef.current.find((deviceKey) => deviceKey.id === row.from_device_id) ?? {
        id: row.from_device_id,
        memberId: row.from_member_id,
        deviceLabel: "browser",
        publicKey: {},
        createdAt: row.created_at,
        lastSeenAt: row.created_at,
        revokedAt: null,
      };

    if (row.signal_type === "offer") {
      const offer = row.payload as unknown as RTCSessionDescriptionInit;
      if (offer.type !== "offer") return;
      const connection = await createDirectPeer(remoteDevice, row.room_id, false);
      if (!connection) return;
      if (!hasPeerSignalingState(connection.peer, "stable")) return;
      await connection.peer.setRemoteDescription(offer);
      if (!hasPeerSignalingState(connection.peer, "have-remote-offer")) return;
      await applyQueuedIce(connection);
      const answer = await connection.peer.createAnswer();
      await connection.peer.setLocalDescription(answer);
      await sendP2PSignal(row.from_member_id, row.from_device_id, row.room_id, "answer", answer as unknown as Record<string, unknown>);
      return;
    }

    const connection = directPeersRef.current.get(row.from_device_id);
    if (!connection) return;

    if (row.signal_type === "answer") {
      const answer = row.payload as unknown as RTCSessionDescriptionInit;
      if (answer.type !== "answer" || !hasPeerSignalingState(connection.peer, "have-local-offer")) return;
      await connection.peer.setRemoteDescription(answer);
      await applyQueuedIce(connection);
      return;
    }

    if (row.signal_type === "ice") {
      const candidate = row.payload as RTCIceCandidateInit;
      if (!connection.peer.remoteDescription) {
        connection.pendingIce.push(candidate);
        return;
      }
      try {
        await connection.peer.addIceCandidate(candidate);
      } catch {
        // Candidate may refer to an older negotiation.
      }
      return;
    }

    if (row.signal_type === "close") {
      closeDirectPeer(row.from_device_id);
    }
  }

  function handleDirectChatPayload(payload: DirectChatPayload) {
    const currentProfile = profileRef.current;
    if (!currentProfile || payload.authorId === currentProfile.id) return;

    setState((current) => {
      if (current.messages.some((message) => message.id === payload.messageId)) return current;
      return {
        ...current,
        messages: [
          ...current.messages,
          {
            id: payload.messageId,
            roomId: payload.roomId,
            authorId: payload.authorId,
            body: payload.body,
            createdAt: payload.createdAt,
            recipientsAtSend: [currentProfile.id],
            citationCode: payload.citationCode ?? undefined,
            encryptionVersion: 1,
            encryptionStatus: "encrypted",
            encryptedDeviceCount: payload.encryptedDeviceCount,
            imagePath: payload.imagePath,
            imageName: payload.imageName,
            imageMimeType: payload.imageMimeType,
            imageEncrypted: Boolean(payload.imageEncrypted),
            imageEncryptionVersion: payload.imageEncrypted ? 1 : 0,
            imageDecryption: payload.imageDecryption,
            imageViewOnce: Boolean(payload.imageViewOnce),
            imageOpenedBy: [],
            imageConsentRequired: Boolean(payload.imageConsentRequired),
            imageExpiresAt: payload.imageExpiresAt,
          },
        ],
      };
    });
  }

  function sendDirectChatMessage(payload: DirectChatPayload) {
    let sent = 0;
    directPeersRef.current.forEach((connection) => {
      if (connection.roomId !== payload.roomId || connection.channel?.readyState !== "open") return;
      try {
        connection.channel.send(JSON.stringify(payload));
        sent += 1;
      } catch {
        updateDirectPeerStatus(connection, "failed");
      }
    });
    return sent;
  }

  useEffect(() => {
    if (!supabase || !profile || !deviceIdentity) return;

    const loadPendingSignals = async () => {
      const { data } = await supabase
        .from("p2p_signals")
        .select("*")
        .eq("to_device_id", deviceIdentity.deviceId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(100);

      ((data ?? []) as P2PSignalRow[]).forEach((row) => {
        void handleP2PSignal(row).catch(() => undefined);
      });
    };

    loadPendingSignals();
    const channel = supabase
      .channel(`p2p-signals-${deviceIdentity.deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "p2p_signals",
          filter: `to_device_id=eq.${deviceIdentity.deviceId}`,
        },
        (payload) => {
          void handleP2PSignal(payload.new as P2PSignalRow).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceIdentity?.deviceId, profile?.id]);

  useEffect(() => {
    if (!supabase || !profile || !deviceIdentity || !("RTCPeerConnection" in window)) {
      directPeersRef.current.forEach((connection) => closeDirectPeer(connection.peerKey));
      return;
    }

    const roomMemberIds = new Set(
      state.members
        .filter((member) => member.groupIds.includes(activeGroupId) && member.status === "online")
        .map((member) => member.id),
    );
    const activeDeviceKeys = deviceKeys.filter(
      (deviceKey) =>
        deviceKey.id !== deviceIdentity.deviceId &&
        canUseDeviceKeyForEncryption(deviceKey) &&
        roomMemberIds.has(deviceKey.memberId) &&
        isRecentlySeenDevice(deviceKey),
    );
    const desiredPeerKeys = new Set(activeDeviceKeys.map((deviceKey) => deviceKey.id));

    directPeersRef.current.forEach((connection) => {
      if (connection.roomId !== activeGroupId || !desiredPeerKeys.has(connection.peerKey)) {
        closeDirectPeer(connection.peerKey);
      }
    });

    activeDeviceKeys.forEach((deviceKey) => {
      if (deviceIdentity.deviceId < deviceKey.id) {
        createDirectPeer(deviceKey, activeGroupId, true);
      }
    });
  }, [activeGroupId, deviceIdentity?.deviceId, deviceKeys, profile?.id, state.members]);

  useEffect(() => {
    return () => {
      directPeersRef.current.forEach((connection) => {
        connection.channel?.close();
        connection.peer.close();
      });
      directPeersRef.current.clear();
    };
  }, []);

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      showNotice(message);
    } catch {
      showNotice("Não foi possível copiar automaticamente.");
    }
  }

  async function confirmTrustDevice(deviceId: string) {
    const deviceKey = deviceKeys.find((candidate) => candidate.id === deviceId);
    if (!deviceKey) return;

    try {
      await trustDeviceKey(deviceKey);
      const nextDeviceKeys = await annotateDeviceKeysWithTrust(deviceKeys, deviceIdentity);
      setDeviceKeys(nextDeviceKeys);
      showNotice("Chave deste dispositivo marcada como confiável.");
    } catch {
      showNotice("Não consegui actualizar a confiança deste dispositivo.");
    }
  }

  function resetState() {
    if (usingBackend) {
      fetchBackendData();
      return;
    }
    setState(seedState);
    setCurrentMemberId("m_di");
    setActiveGroupId("g_geral");
    setSelectedCitation("DOC-001");
    showNotice("Exemplo reposto.");
  }

  async function toggleMemberStatus(memberId: string) {
    if (usingBackend && supabase && profile) {
      if (memberId !== profile.id && profile.role !== "admin") return;
      const target = state.members.find((member) => member.id === memberId);
      if (!target) return;
      setSyncStatus("saving");
      const nextStatus = target.status === "online" ? "offline" : "online";
      const { error } =
        memberId === profile.id
          ? await supabase.rpc("set_my_status", { next_status: nextStatus })
          : await supabase.from("profiles").update({ status: nextStatus }).eq("id", memberId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Presença atualizada.");
      return;
    }

    updateState((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId
          ? { ...member, status: member.status === "online" ? "offline" : "online" }
          : member,
      ),
    }));
    showNotice("Presença atualizada.");
  }

  async function updateMemberRole(memberId: string, role: MemberRole) {
    if (currentMember.role !== "admin") {
      showNotice("Só admins podem alterar papéis.");
      return;
    }

    if (memberId === currentMember.id && role !== "admin") {
      showNotice("Não removas o teu próprio acesso admin.");
      return;
    }

    if (usingBackend && supabase && profile?.role === "admin") {
      setSyncStatus("saving");
      const { error } = await supabase.rpc("admin_update_member_role", { _member_id: memberId, _role: role });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Papel atualizado.");
      return;
    }

    updateState((current) => ({
      ...current,
      members: current.members.map((member) => (member.id === memberId ? { ...member, role } : member)),
      auditLogs: [
        makeLocalAudit(currentMember.id, "member.role_updated", "profile", memberId, { role }),
        ...current.auditLogs,
      ],
    }));
    showNotice("Papel atualizado.");
  }

  async function updateOwnProfile(input: ProfileUpdateInput) {
    const nextProfile = {
      name: input.name.trim(),
      pronouns: input.pronouns.trim() || "por definir",
      status: input.status,
      consentAvailableFor: input.consentAvailableFor.trim(),
      consentLimits: input.consentLimits.trim(),
      mediaPreference: input.mediaPreference.trim(),
      relationshipContext: input.relationshipContext.trim(),
      eventComfort: input.eventComfort.trim(),
    };

    if (!nextProfile.name) {
      showNotice("O nome não pode ficar vazio.");
      return false;
    }

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase
        .from("profiles")
        .update({
          name: nextProfile.name,
          pronouns: nextProfile.pronouns,
          status: nextProfile.status,
          consent_available_for: nextProfile.consentAvailableFor,
          consent_limits: nextProfile.consentLimits,
          media_preference: nextProfile.mediaPreference,
          relationship_context: nextProfile.relationshipContext,
          event_comfort: nextProfile.eventComfort,
        })
        .eq("id", profile.id);

      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }

      await fetchBackendData();
      showNotice("Perfil atualizado.");
      return true;
    }

    updateState((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === currentMember.id ? { ...member, ...nextProfile } : member,
      ),
    }));
    showNotice("Perfil atualizado.");
    return true;
  }

  async function uploadProfilePhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      showNotice("Escolhe uma imagem.");
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotice("A fotografia deve ter menos de 5 MB.");
      return false;
    }

    if (usingBackend && supabase && profile) {
      const previousPath = currentMember.avatarPath;
      const avatarPath = `${profile.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      setSyncStatus("saving");
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(avatarPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setSyncStatus("error");
        setSyncMessage(uploadError.message);
        return false;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_path: avatarPath })
        .eq("id", profile.id);

      if (updateError) {
        setSyncStatus("error");
        setSyncMessage(updateError.message);
        return false;
      }

      if (previousPath && previousPath !== avatarPath) {
        await supabase.storage.from("profile-photos").remove([previousPath]);
      }

      await fetchBackendData();
      showNotice("Fotografia atualizada.");
      return true;
    }

    const avatarUrl = await fileToDataUrl(file);
    updateState((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === currentMember.id ? { ...member, avatarUrl, avatarPath: undefined } : member,
      ),
    }));
    showNotice("Fotografia atualizada.");
    return true;
  }

  async function sendMessage(input: MessageInput) {
    const trimmed = input.body.trim();
    const citationCode = input.citationCode?.trim() || undefined;
    const imageFile = input.imageFile ?? null;
    const hasImage = Boolean(imageFile);
    const imageConsentRequired = hasImage ? input.imageConsentRequired ?? Boolean(input.imageViewOnce) : false;
    const imageExpiresAt =
      hasImage && input.imageExpiresInHours
        ? new Date(Date.now() + input.imageExpiresInHours * 60 * 60 * 1000).toISOString()
        : undefined;
    if (!trimmed && !imageFile && !citationCode) return false;

    if (imageFile && !imageFile.type.startsWith("image/")) {
      showNotice("Escolhe um ficheiro de imagem.");
      return false;
    }

    if (imageFile && imageFile.size > 10 * 1024 * 1024) {
      showNotice("A imagem deve ter menos de 10 MB.");
      return false;
    }

    const groupMembers = state.members.filter((member) => member.groupIds.includes(activeGroup.id));
    const recipientsAtSend = groupMembers
      .filter((member) => member.status === "online" && member.id !== currentMember.id)
      .map((member) => member.id);
    const messageBody = trimmed || (hasImage ? "Imagem" : "Referência");

    if (usingBackend && supabase && profile) {
      if (!deviceIdentity || deviceSecurityStatus !== "ready") {
        showNotice("A preparar a cifragem deste dispositivo. Tenta novamente dentro de instantes.");
        return false;
      }

      setSyncStatus("saving");
      const messageId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      let imagePath: string | undefined;
      let encryptedMedia: EncryptedMediaResult | undefined;

      if (imageFile) {
        encryptedMedia = await encryptMediaFile(imageFile);
        imagePath = `${profile.id}/${messageId}-${safeFileName(imageFile.name)}.enc`;
        const { error: uploadError } = await supabase.storage
          .from("message-images")
          .upload(imagePath, encryptedMedia.blob, {
            cacheControl: "3600",
            contentType: "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          setSyncStatus("error");
          setSyncMessage(uploadError.message);
          return false;
        }
      }

      const { data: freshDeviceRows, error: deviceKeyError } = await supabase
        .from("device_keys")
        .select("*")
        .order("last_seen_at", { ascending: false });

      if (deviceKeyError) {
        setSyncStatus("error");
        setSyncMessage(deviceKeyError.message);
        return false;
      }

      const rawFreshDeviceKeys = ((freshDeviceRows ?? []) as DeviceKeyRow[]).map(deviceKeyFromRow);
      const freshDeviceKeys = await annotateDeviceKeysWithTrust(rawFreshDeviceKeys, deviceIdentity);
      const roomMemberIds = new Set(groupMembers.map((member) => member.id));
      const changedDeviceKeys = freshDeviceKeys.filter(
        (deviceKey) => roomMemberIds.has(deviceKey.memberId) && deviceKey.trustStatus === "changed",
      );
      const targetDeviceKeys = freshDeviceKeys.filter(
        (deviceKey) => roomMemberIds.has(deviceKey.memberId) && canUseDeviceKeyForEncryption(deviceKey),
      );

      if (!targetDeviceKeys.some((deviceKey) => deviceKey.id === deviceIdentity.deviceId)) {
        targetDeviceKeys.push({
          id: deviceIdentity.deviceId,
          memberId: deviceIdentity.memberId,
          deviceLabel: getBrowserDeviceLabel(),
          publicKey: deviceIdentity.publicJwk,
          createdAt: deviceIdentity.createdAt,
          lastSeenAt: new Date().toISOString(),
          revokedAt: null,
          fingerprint: await fingerprintPublicKey(deviceIdentity.publicJwk),
          trustStatus: "own",
        });
      }

      const encryptedPayloads = await encryptMessageEnvelope(
        {
          body: messageBody,
          citationCode: citationCode ?? null,
          image: encryptedMedia?.metadata ?? null,
        },
        deviceIdentity,
        targetDeviceKeys,
      );
      const encryptedDeviceCount = Object.keys(encryptedPayloads).length;

      if (!encryptedDeviceCount) {
        setSyncStatus("error");
        setSyncMessage("Não foi possível cifrar a mensagem para nenhum dispositivo.");
        return false;
      }

      setDeviceKeys(freshDeviceKeys);

      const encryptedRecipients = Array.from(
        new Set(
          targetDeviceKeys
            .filter((deviceKey) => encryptedPayloads[deviceKey.id] && deviceKey.memberId !== profile.id)
            .map((deviceKey) => deviceKey.memberId),
        ),
      );

      const { error } = await supabase.from("messages").insert({
        id: messageId,
        room_id: activeGroup.id,
        author_id: profile.id,
        created_at: createdAt,
        body: "Mensagem cifrada",
        recipients_at_send: encryptedRecipients,
        citation_code: null,
        encryption_version: 1,
        encrypted_payloads: encryptedPayloads,
        sender_device_id: deviceIdentity.deviceId,
        image_path: imagePath ?? null,
        image_name: imageFile ? "media-cifrada.enc" : null,
        image_mime_type: imageFile ? "application/octet-stream" : null,
        image_encryption_version: imageFile ? 1 : 0,
        image_cipher_iv: encryptedMedia?.metadata.iv ?? null,
        image_view_once: Boolean(input.imageViewOnce),
        image_consent_required: imageConsentRequired,
        image_expires_at: imageExpiresAt ?? null,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      const directCount = sendDirectChatMessage({
        type: "chat-message",
        messageId,
        roomId: activeGroup.id,
        authorId: profile.id,
        body: messageBody,
        citationCode: citationCode ?? null,
        createdAt,
        encryptedDeviceCount,
        imagePath,
        imageName: encryptedMedia?.metadata.name,
        imageMimeType: encryptedMedia?.metadata.mimeType,
        imageEncrypted: Boolean(encryptedMedia),
        imageDecryption: encryptedMedia?.metadata,
        imageViewOnce: Boolean(input.imageViewOnce),
        imageConsentRequired,
        imageExpiresAt,
      });
      await fetchBackendData();
      const skippedCopy = changedDeviceKeys.length
        ? ` ${changedDeviceKeys.length} dispositivo(s) com chave alterada ficaram fora até confirmação.`
        : "";
      showNotice(
        hasImage
          ? directCount
            ? `Imagem cifrada enviada; ${directCount} ligação directa.${skippedCopy}`
            : `Imagem cifrada enviada.${skippedCopy}`
          : directCount
            ? `Mensagem cifrada enviada; ${directCount} ligação directa.${skippedCopy}`
            : `Mensagem cifrada enviada.${skippedCopy}`,
      );
      return true;
    }

    const imageUrl = imageFile ? await fileToDataUrl(imageFile) : undefined;

    updateState((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: crypto.randomUUID(),
          roomId: activeGroup.id,
          authorId: currentMember.id,
          body: messageBody,
          createdAt: new Date().toISOString(),
          recipientsAtSend,
          citationCode,
          encryptionVersion: 0,
          encryptionStatus: "plain",
          encryptedDeviceCount: 0,
          imageUrl,
          imageName: imageFile?.name,
          imageMimeType: imageFile?.type,
          imageEncrypted: false,
          imageEncryptionVersion: 0,
          imageViewOnce: Boolean(input.imageViewOnce),
          imageOpenedBy: [],
          imageConsentRequired,
          imageExpiresAt,
        },
      ],
    }));
    showNotice(hasImage ? "Imagem enviada." : "Mensagem enviada.");
    return true;
  }

  async function markImageOpened(messageId: string) {
    if (usingBackend && supabase && profile) {
      const { error } = await supabase.rpc("mark_message_image_opened", { _message_id: messageId });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      showNotice("Imagem aberta uma vez.");
      return true;
    }

    updateState((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.id === messageId && !message.imageOpenedBy.includes(currentMember.id)
          ? { ...message, imageOpenedBy: [...message.imageOpenedBy, currentMember.id] }
          : message,
      ),
    }));
    showNotice("Imagem aberta uma vez.");
    return true;
  }

  async function getMessageImageUrl(message: ChatMessage) {
    if (message.imageUrl) return message.imageUrl;
    if (!usingBackend || !supabase || !message.imagePath) return null;

    const { data, error } = await supabase.storage
      .from("message-images")
      .createSignedUrl(message.imagePath, message.imageViewOnce ? 60 : 60 * 60);

    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return null;
    }

    if (!data?.signedUrl) return null;

    if (!message.imageEncrypted) {
      return data.signedUrl;
    }

    if (!message.imageDecryption) {
      showNotice("Este dispositivo não tem a chave desta imagem.");
      return null;
    }

    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      setSyncStatus("error");
      setSyncMessage("Não foi possível descarregar a imagem cifrada.");
      return null;
    }

    try {
      const decryptedBlob = await decryptMediaBlob(await response.blob(), message.imageDecryption);
      return URL.createObjectURL(decryptedBlob);
    } catch {
      showNotice("Não foi possível decifrar esta imagem neste dispositivo.");
      return null;
    }
  }

  async function deleteMessage(messageId: string) {
    const message = state.messages.find((candidate) => candidate.id === messageId);
    if (!message) return;
    const canDelete = currentMember.role === "admin" || message.authorId === currentMember.id;
    if (!canDelete) {
      showNotice("Só admins ou quem enviou a mensagem podem eliminar.");
      return;
    }

    if (usingBackend && supabase) {
      setSyncStatus("saving");
      if (message.imagePath) {
        await supabase.storage.from("message-images").remove([message.imagePath]);
      }
      const { error } =
        currentMember.role === "admin"
          ? await supabase.rpc("admin_delete_message", { _message_id: messageId })
          : await supabase.from("messages").delete().eq("id", messageId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Mensagem eliminada.");
      return;
    }

    updateState((current) => ({
      ...current,
      messages: current.messages.filter((candidate) => candidate.id !== messageId),
      auditLogs:
        currentMember.role === "admin"
          ? [
              makeLocalAudit(currentMember.id, "message.deleted", "message", messageId, {
                roomId: message.roomId,
                authorId: message.authorId,
              }),
              ...current.auditLogs,
            ]
          : current.auditLogs,
    }));
    showNotice("Mensagem eliminada.");
  }

  function addMember(input: {
    name: string;
    pronouns: string;
    sponsorId: string;
    groupIds: string[];
  }) {
    const member: Member = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      pronouns: input.pronouns.trim() || "por definir",
      joinedAt: formatDateInput(new Date()),
      sponsorId: input.sponsorId,
      role: "nova pessoa",
      groupIds: input.groupIds.length ? input.groupIds : ["g_geral"],
      status: "offline",
      consentAvailableFor: "conhecer pessoas em contexto de grupo",
      consentLimits: "",
      mediaPreference: "sem media íntima por agora",
      relationshipContext: "",
      eventComfort: "",
    };
    updateState((current) => ({ ...current, members: [...current.members, member] }));
    showNotice("Entrada vinculada.");
  }

  async function addEvent(input: {
    title: string;
    startsAt: string;
    place: string;
    groupId: string;
    capacity: number;
    vibe: EventVibe;
    photoPolicy: PhotoPolicy;
    boundaryNotes: string;
    aftercarePrompt: string;
  }) {
    if (usingBackend && supabase && profile) {
      const eventId = crypto.randomUUID();
      setSyncStatus("saving");
      const { error } = await supabase.from("events").insert({
        id: eventId,
        title: input.title.trim(),
        starts_at: new Date(input.startsAt).toISOString(),
        place: input.place.trim(),
        group_id: input.groupId,
        capacity: input.capacity,
        vibe: input.vibe,
        photo_policy: input.photoPolicy,
        boundary_notes: input.boundaryNotes.trim(),
        aftercare_prompt: input.aftercarePrompt.trim(),
        created_by: profile.id,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await supabase.from("event_attendees").insert({ event_id: eventId, member_id: profile.id });
      await fetchBackendData();
      showNotice("Evento criado.");
      return true;
    }

    const event: EventItem = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      startsAt: input.startsAt,
      place: input.place.trim(),
      groupId: input.groupId,
      capacity: input.capacity,
      createdBy: currentMember.id,
      attendeeIds: [currentMember.id],
      vibe: input.vibe,
      photoPolicy: input.photoPolicy,
      boundaryNotes: input.boundaryNotes.trim(),
      aftercarePrompt: input.aftercarePrompt.trim(),
    };
    updateState((current) => ({ ...current, events: [...current.events, event] }));
    showNotice("Evento criado.");
    return true;
  }

  async function deleteEvent(eventId: string) {
    const event = state.events.find((candidate) => candidate.id === eventId);
    if (!event) return;
    const canDelete = currentMember.role === "admin" || event.createdBy === currentMember.id;
    if (!canDelete) {
      showNotice("Só admins ou quem criou o evento podem eliminar.");
      return;
    }

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } =
        currentMember.role === "admin"
          ? await supabase.rpc("admin_delete_event", { _event_id: eventId })
          : await supabase.from("events").delete().eq("id", eventId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Evento eliminado.");
      return;
    }

    updateState((current) => ({
      ...current,
      events: current.events.filter((candidate) => candidate.id !== eventId),
      eventRooms: current.eventRooms.filter((candidate) => candidate.eventId !== eventId),
      eventCheckIns: current.eventCheckIns.filter((candidate) => candidate.eventId !== eventId),
      auditLogs:
        currentMember.role === "admin"
          ? [makeLocalAudit(currentMember.id, "event.deleted", "event", eventId, { title: event.title }), ...current.auditLogs]
          : current.auditLogs,
    }));
    showNotice("Evento eliminado.");
  }

  async function toggleRsvp(eventId: string) {
    if (usingBackend && supabase && profile) {
      const event = state.events.find((candidate) => candidate.id === eventId);
      if (!event) return;
      const attending = event.attendeeIds.includes(profile.id);
      setSyncStatus("saving");
      const { error } = attending
        ? await supabase
            .from("event_attendees")
            .delete()
            .eq("event_id", eventId)
            .eq("member_id", profile.id)
        : await supabase.from("event_attendees").insert({ event_id: eventId, member_id: profile.id });

      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Confirmação atualizada.");
      return;
    }

    updateState((current) => ({
      ...current,
      events: current.events.map((event) => {
        if (event.id !== eventId) return event;
        const attending = event.attendeeIds.includes(currentMember.id);
        return {
          ...event,
          attendeeIds: attending
            ? event.attendeeIds.filter((id) => id !== currentMember.id)
            : [...event.attendeeIds, currentMember.id],
        };
      }),
    }));
    showNotice("Confirmação atualizada.");
  }

  async function addDoc(input: { title: string; summary: string; tags: string }) {
    const nextNumber = state.docs.length + 1;
    const code = `DOC-${String(nextNumber).padStart(3, "0")}`;
    const tags = input.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase.from("docs").insert({
        id: crypto.randomUUID(),
        code,
        title: input.title.trim(),
        summary: input.summary.trim(),
        owner_id: profile.id,
        tags,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      setSelectedCitation(code);
      await fetchBackendData();
      showNotice(`${code} guardado e pronto para citar.`);
      return true;
    }

    const doc: CommunityDoc = {
      id: crypto.randomUUID(),
      code,
      title: input.title.trim(),
      summary: input.summary.trim(),
      ownerId: currentMember.id,
      updatedAt: formatDateInput(new Date()),
      tags,
    };
    updateState((current) => ({ ...current, docs: [...current.docs, doc] }));
    setSelectedCitation(doc.code);
    showNotice(`${doc.code} guardado e pronto para citar.`);
    return true;
  }

  async function deleteDoc(docId: string) {
    const doc = state.docs.find((candidate) => candidate.id === docId);
    if (!doc) return;
    const canDelete = currentMember.role === "admin" || doc.ownerId === currentMember.id;
    if (!canDelete) {
      showNotice("Só admins ou quem criou o doc podem eliminar.");
      return;
    }

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } =
        currentMember.role === "admin"
          ? await supabase.rpc("admin_delete_doc", { _doc_id: docId })
          : await supabase.from("docs").delete().eq("id", docId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      if (selectedCitation === doc.code) {
        setSelectedCitation("");
      }
      await fetchBackendData();
      showNotice(`${doc.code} eliminado.`);
      return;
    }

    updateState((current) => ({
      ...current,
      docs: current.docs.filter((candidate) => candidate.id !== docId),
      messages: current.messages.map((message) =>
        message.citationCode === doc.code ? { ...message, citationCode: undefined } : message,
      ),
      auditLogs:
        currentMember.role === "admin"
          ? [makeLocalAudit(currentMember.id, "doc.deleted", "doc", docId, { code: doc.code, title: doc.title }), ...current.auditLogs]
          : current.auditLogs,
    }));
    if (selectedCitation === doc.code) {
      setSelectedCitation("");
    }
    showNotice(`${doc.code} eliminado.`);
  }

  async function addDecision(input: {
    title: string;
    summary: string;
    outcome: string;
    status: DecisionStatus;
  }) {
    const nextNumber = state.decisions.length + 1;
    const code = `DEC-${String(nextNumber).padStart(3, "0")}`;
    const decision: DecisionRecord = {
      id: crypto.randomUUID(),
      code,
      title: input.title.trim(),
      summary: input.summary.trim(),
      outcome: input.outcome.trim(),
      status: input.status,
      createdBy: currentMember.id,
      createdAt: new Date().toISOString(),
      votes: [],
    };

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase.from("decisions").insert({
        id: decision.id,
        code,
        title: decision.title,
        summary: decision.summary,
        outcome: decision.outcome,
        status: decision.status,
        created_by: profile.id,
        votes: decision.votes,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      setSelectedCitation(code);
      await fetchBackendData();
      showNotice(`${code} guardada e citável.`);
      return true;
    }

    updateState((current) => ({ ...current, decisions: [decision, ...current.decisions] }));
    setSelectedCitation(code);
    showNotice(`${code} guardada e citável.`);
    return true;
  }

  async function voteDecision(decisionId: string, vote: DecisionVote) {
    const decision = state.decisions.find((candidate) => candidate.id === decisionId);
    if (!decision) return;
    const nextVotes = [
      ...decision.votes.filter((candidate) => candidate.memberId !== vote.memberId),
      vote,
    ];

    if (usingBackend && supabase) {
      setSyncStatus("saving");
      const { error } = await supabase.from("decisions").update({ votes: nextVotes }).eq("id", decisionId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Voto registado.");
      return;
    }

    updateState((current) => ({
      ...current,
      decisions: current.decisions.map((candidate) =>
        candidate.id === decisionId ? { ...candidate, votes: nextVotes } : candidate,
      ),
    }));
    showNotice("Voto registado.");
  }

  async function deleteDecision(decisionId: string) {
    const decision = state.decisions.find((candidate) => candidate.id === decisionId);
    if (!decision) return;
    const canDelete = currentMember.role === "admin" || decision.createdBy === currentMember.id;
    if (!canDelete) {
      showNotice("Só admins ou quem criou a decisão podem eliminar.");
      return;
    }

    if (usingBackend && supabase) {
      setSyncStatus("saving");
      const { error } =
        currentMember.role === "admin"
          ? await supabase.rpc("admin_delete_decision", { _decision_id: decisionId })
          : await supabase.from("decisions").delete().eq("id", decisionId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice(`${decision.code} eliminada.`);
      return;
    }

    updateState((current) => ({
      ...current,
      decisions: current.decisions.filter((candidate) => candidate.id !== decisionId),
      messages: current.messages.map((message) =>
        message.citationCode === decision.code ? { ...message, citationCode: undefined } : message,
      ),
      auditLogs:
        currentMember.role === "admin"
          ? [
              makeLocalAudit(currentMember.id, "decision.deleted", "decision", decisionId, {
                code: decision.code,
                title: decision.title,
              }),
              ...current.auditLogs,
            ]
          : current.auditLogs,
    }));
    showNotice(`${decision.code} eliminada.`);
  }

  async function updateConsentCard(input: {
    memberId: string;
    consentAvailableFor: string;
    consentLimits: string;
    mediaPreference: string;
    relationshipContext: string;
    eventComfort: string;
  }) {
    const canEdit = currentMember.role === "admin" || currentMember.id === input.memberId;
    if (!canEdit) {
      showNotice("Só podes editar o teu cartão, ou fazê-lo como admin.");
      return false;
    }

    if (usingBackend && supabase) {
      setSyncStatus("saving");
      const { error } = await supabase
        .from("profiles")
        .update({
          consent_available_for: input.consentAvailableFor.trim(),
          consent_limits: input.consentLimits.trim(),
          media_preference: input.mediaPreference.trim(),
          relationship_context: input.relationshipContext.trim(),
          event_comfort: input.eventComfort.trim(),
        })
        .eq("id", input.memberId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice("Cartão de consentimento atualizado.");
      return true;
    }

    updateState((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === input.memberId
          ? {
              ...member,
              consentAvailableFor: input.consentAvailableFor.trim(),
              consentLimits: input.consentLimits.trim(),
              mediaPreference: input.mediaPreference.trim(),
              relationshipContext: input.relationshipContext.trim(),
              eventComfort: input.eventComfort.trim(),
            }
          : member,
      ),
    }));
    showNotice("Cartão de consentimento atualizado.");
    return true;
  }

  async function submitReport(input: {
    subjectMemberId?: string | null;
    roomId?: string | null;
    messageId?: string | null;
    category: ReportCategory;
    severity: ReportSeverity;
    summary: string;
    details: string;
  }) {
    const summary = input.summary.trim();
    const details = input.details.trim();
    if (!summary) {
      showNotice("Escreve um resumo curto para o pedido.");
      return false;
    }

    const report: SafetyReport = {
      id: crypto.randomUUID(),
      reporterId: currentMember.id,
      subjectMemberId: input.subjectMemberId ?? null,
      roomId: input.roomId ?? null,
      messageId: input.messageId ?? null,
      category: input.category,
      severity: input.severity,
      status: "aberto",
      assigneeId: null,
      summary,
      details,
      internalNotes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase.from("reports").insert({
        id: report.id,
        reporter_id: profile.id,
        subject_member_id: report.subjectMemberId,
        room_id: report.roomId,
        message_id: report.messageId,
        category: report.category,
        severity: report.severity,
        summary: report.summary,
        details: report.details,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice("Pedido enviado aos admins.");
      return true;
    }

    updateState((current) => ({ ...current, reports: [report, ...current.reports] }));
    showNotice("Pedido enviado aos admins.");
    return true;
  }

  async function updateReport(reportId: string, patch: Partial<Pick<SafetyReport, "status" | "severity" | "assigneeId" | "internalNotes">>) {
    if (currentMember.role !== "admin") {
      showNotice("Só admins podem actualizar casos.");
      return;
    }

    if (usingBackend && supabase && profile?.role === "admin") {
      setSyncStatus("saving");
      const { error } = await supabase.rpc("admin_update_report", {
        _report_id: reportId,
        _status: patch.status ?? null,
        _severity: patch.severity ?? null,
        _assignee_id: patch.assigneeId ?? null,
        _internal_notes: patch.internalNotes ?? null,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Caso atualizado.");
      return;
    }

    updateState((current) => ({
      ...current,
      reports: current.reports.map((report) =>
        report.id === reportId ? { ...report, ...patch, updatedAt: new Date().toISOString() } : report,
      ),
      auditLogs: [
        makeLocalAudit(currentMember.id, "report.updated", "report", reportId, patch),
        ...current.auditLogs,
      ],
    }));
    showNotice("Caso atualizado.");
  }

  async function setMemberSuspension(memberId: string, suspendedUntil: string | null) {
    if (currentMember.role !== "admin") {
      showNotice("Só admins podem suspender contas.");
      return;
    }

    if (memberId === currentMember.id) {
      showNotice("Não suspendas a tua própria conta.");
      return;
    }

    if (usingBackend && supabase && profile?.role === "admin") {
      setSyncStatus("saving");
      const { error } = await supabase.rpc("set_member_suspension", {
        _member_id: memberId,
        _suspended_until: suspendedUntil,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice(suspendedUntil ? "Conta suspensa temporariamente." : "Suspensão removida.");
      return;
    }

    updateState((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId ? { ...member, suspendedUntil } : member,
      ),
      auditLogs: [
        makeLocalAudit(
          currentMember.id,
          suspendedUntil ? "member.suspended" : "member.suspension_cleared",
          "profile",
          memberId,
          { until: suspendedUntil },
        ),
        ...current.auditLogs,
      ],
    }));
    showNotice(suspendedUntil ? "Conta suspensa temporariamente." : "Suspensão removida.");
  }

  async function addEventCheckIn(input: {
    eventId: string;
    mood: CheckInMood;
    note: string;
    visibility: CheckInVisibility;
  }) {
    const checkIn: EventCheckIn = {
      id: crypto.randomUUID(),
      eventId: input.eventId,
      memberId: currentMember.id,
      mood: input.mood,
      note: input.note.trim(),
      visibility: input.visibility,
      createdAt: new Date().toISOString(),
    };

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase.from("event_checkins").upsert({
        id: checkIn.id,
        event_id: input.eventId,
        member_id: profile.id,
        mood: input.mood,
        note: checkIn.note,
        visibility: input.visibility,
      }, { onConflict: "event_id,member_id" });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice("Check-in guardado.");
      return true;
    }

    updateState((current) => ({
      ...current,
      eventCheckIns: [
        checkIn,
        ...current.eventCheckIns.filter(
          (candidate) => !(candidate.eventId === input.eventId && candidate.memberId === currentMember.id),
        ),
      ],
    }));
    showNotice("Check-in guardado.");
    return true;
  }

  async function updateIntention(input: { kinds: IntentionKind[]; note: string }) {
    const intention: MemberIntention = {
      memberId: currentMember.id,
      kinds: input.kinds,
      note: input.note.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase.from("member_intentions").upsert({
        member_id: profile.id,
        kinds: input.kinds,
        note: intention.note,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice("Intenções atualizadas.");
      return true;
    }

    updateState((current) => ({
      ...current,
      intentions: [
        intention,
        ...current.intentions.filter((candidate) => candidate.memberId !== currentMember.id),
      ],
    }));
    showNotice("Intenções atualizadas.");
    return true;
  }

  async function requestIntroduction(input: { targetId: string; connectorId: string; note: string }) {
    if (!input.targetId || !input.connectorId || input.targetId === currentMember.id) return false;
    const introduction: WarmIntroduction = {
      id: crypto.randomUUID(),
      requesterId: currentMember.id,
      targetId: input.targetId,
      connectorId: input.connectorId,
      note: input.note.trim(),
      status: "pedido",
      createdAt: new Date().toISOString(),
    };

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase.from("warm_introductions").insert({
        id: introduction.id,
        requester_id: profile.id,
        target_id: input.targetId,
        connector_id: input.connectorId,
        note: introduction.note,
        status: introduction.status,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice("Pedido de apresentação criado.");
      return true;
    }

    updateState((current) => ({ ...current, introductions: [introduction, ...current.introductions] }));
    showNotice("Pedido de apresentação criado.");
    return true;
  }

  async function updateIntroductionStatus(introductionId: string, status: IntroductionStatus) {
    if (usingBackend && supabase) {
      setSyncStatus("saving");
      const { error } = await supabase.from("warm_introductions").update({ status }).eq("id", introductionId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Apresentação atualizada.");
      return;
    }

    updateState((current) => ({
      ...current,
      introductions: current.introductions.map((introduction) =>
        introduction.id === introductionId ? { ...introduction, status } : introduction,
      ),
    }));
    showNotice("Apresentação atualizada.");
  }

  async function toggleInterest(input: { targetId: string; kind: InterestKind }) {
    if (!input.targetId || input.targetId === currentMember.id) return;
    const existing = state.interests.find(
      (interest) =>
        interest.fromId === currentMember.id &&
        interest.toId === input.targetId &&
        interest.kind === input.kind,
    );

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = existing
        ? await supabase.from("mutual_interests").delete().eq("id", existing.id)
        : await supabase.from("mutual_interests").insert({
            id: crypto.randomUUID(),
            from_id: profile.id,
            to_id: input.targetId,
            kind: input.kind,
          });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice(existing ? "Interesse removido." : "Interesse guardado.");
      return;
    }

    updateState((current) => ({
      ...current,
      interests: existing
        ? current.interests.filter((interest) => interest.id !== existing.id)
        : [
            {
              id: crypto.randomUUID(),
              fromId: currentMember.id,
              toId: input.targetId,
              kind: input.kind,
              createdAt: new Date().toISOString(),
            },
            ...current.interests,
          ],
    }));
    showNotice(existing ? "Interesse removido." : "Interesse guardado.");
  }

  async function addRelationship(input: {
    relatedMemberId: string;
    label: string;
    visibility: RelationshipVisibility;
  }) {
    if (!input.relatedMemberId || input.relatedMemberId === currentMember.id || !input.label.trim()) return false;
    const relationship: RelationshipLink = {
      id: crypto.randomUUID(),
      memberId: currentMember.id,
      relatedMemberId: input.relatedMemberId,
      label: input.label.trim(),
      visibility: input.visibility,
      createdAt: new Date().toISOString(),
    };

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase.from("relationship_links").insert({
        id: relationship.id,
        member_id: profile.id,
        related_member_id: input.relatedMemberId,
        label: relationship.label,
        visibility: input.visibility,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice("Ligação adicionada.");
      return true;
    }

    updateState((current) => ({ ...current, relationships: [relationship, ...current.relationships] }));
    showNotice("Ligação adicionada.");
    return true;
  }

  async function deleteRelationship(relationshipId: string) {
    if (usingBackend && supabase) {
      setSyncStatus("saving");
      const { error } = await supabase.from("relationship_links").delete().eq("id", relationshipId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Ligação removida.");
      return;
    }

    updateState((current) => ({
      ...current,
      relationships: current.relationships.filter((relationship) => relationship.id !== relationshipId),
    }));
    showNotice("Ligação removida.");
  }

  async function addEventRoom(input: {
    eventId: string;
    name: string;
    purpose: string;
    expiresAt: string;
    memberIds: string[];
  }) {
    if (!input.eventId || !input.name.trim() || !input.expiresAt) return false;
    const room: EventRoom = {
      id: crypto.randomUUID(),
      eventId: input.eventId,
      name: input.name.trim(),
      purpose: input.purpose.trim(),
      expiresAt: new Date(input.expiresAt).toISOString(),
      createdBy: currentMember.id,
      memberIds: input.memberIds.length ? input.memberIds : [currentMember.id],
    };

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const { error } = await supabase.from("event_rooms").insert({
        id: room.id,
        event_id: input.eventId,
        name: room.name,
        purpose: room.purpose,
        expires_at: room.expiresAt,
        created_by: profile.id,
        member_ids: room.memberIds,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice("Sala temporária criada.");
      return true;
    }

    updateState((current) => ({ ...current, eventRooms: [room, ...current.eventRooms] }));
    showNotice("Sala temporária criada.");
    return true;
  }

  async function deleteEventRoom(roomId: string) {
    const room = state.eventRooms.find((candidate) => candidate.id === roomId);
    if (!room) return;
    const canDelete = currentMember.role === "admin" || room.createdBy === currentMember.id;
    if (!canDelete) {
      showNotice("Só admins ou quem criou a sala podem eliminar.");
      return;
    }

    if (usingBackend && supabase) {
      setSyncStatus("saving");
      const { error } =
        currentMember.role === "admin"
          ? await supabase.rpc("admin_delete_event_room", { _room_id: roomId })
          : await supabase.from("event_rooms").delete().eq("id", roomId);
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Sala temporária eliminada.");
      return;
    }

    updateState((current) => ({
      ...current,
      eventRooms: current.eventRooms.filter((candidate) => candidate.id !== roomId),
      auditLogs:
        currentMember.role === "admin"
          ? [
              makeLocalAudit(currentMember.id, "event_room.deleted", "event_room", roomId, {
                eventId: room.eventId,
                name: room.name,
              }),
              ...current.auditLogs,
            ]
          : current.auditLogs,
    }));
    showNotice("Sala temporária eliminada.");
  }

  async function updatePrivacySettings(input: PrivacySettings) {
    if (usingBackend && supabase) {
      setSyncStatus("saving");
      const { error } = await supabase.from("privacy_settings").upsert({
        id: "main",
        device_only_messages: input.deviceOnlyMessages,
        local_media_vault: input.localMediaVault,
        metadata_stripping: input.metadataStripping,
        p2p_ready: input.p2pReady,
        relay_plan: input.relayPlan.trim(),
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice("Privacidade atualizada.");
      return true;
    }

    updateState((current) => ({
      ...current,
      privacySettings: { ...input, relayPlan: input.relayPlan.trim() },
    }));
    showNotice("Privacidade atualizada.");
    return true;
  }

  async function addGroup(input: {
    name: string;
    focus: string;
    privacy: GroupPrivacy;
    stewardId: string;
  }) {
    const palette = ["#176b63", "#c4493d", "#5457a6", "#9a5a20", "#2d6f9f"];
    const groupId = `g_${crypto.randomUUID()}`;
    const groupColor = palette[state.groups.length % palette.length];

    if (usingBackend && profile?.role !== "admin") {
      setSyncStatus("error");
      setSyncMessage("Só admins podem criar subgrupos.");
      return false;
    }

    if (usingBackend && supabase && profile?.role === "admin") {
      setSyncStatus("saving");
      const { error } = await supabase.from("groups").insert({
        id: groupId,
        name: input.name.trim(),
        focus: input.focus.trim(),
        privacy: input.privacy,
        steward_id: input.stewardId,
        color: groupColor,
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await supabase.from("group_members").insert({ group_id: groupId, member_id: input.stewardId });
      setActiveGroupId(groupId);
      await fetchBackendData();
      showNotice("Subgrupo criado.");
      return true;
    }

    const group: Group = {
      id: groupId,
      name: input.name.trim(),
      focus: input.focus.trim(),
      privacy: input.privacy,
      stewardId: input.stewardId,
      color: groupColor,
    };
    updateState((current) => ({
      ...current,
      groups: [...current.groups, group],
      members: current.members.map((member) =>
        member.id === input.stewardId && !member.groupIds.includes(group.id)
          ? { ...member, groupIds: [...member.groupIds, group.id] }
          : member,
      ),
    }));
    setActiveGroupId(group.id);
    showNotice("Subgrupo criado.");
    return true;
  }

  async function toggleGroupMember(groupId: string, memberId: string) {
    if (usingBackend && profile?.role !== "admin") {
      setSyncStatus("error");
      setSyncMessage("Só admins podem gerir membros de subgrupos.");
      return;
    }

    if (usingBackend && supabase && profile?.role === "admin") {
      const member = state.members.find((candidate) => candidate.id === memberId);
      if (!member) return;
      const hasGroup = member.groupIds.includes(groupId);
      setSyncStatus("saving");
      const { error } = hasGroup
        ? await supabase
            .from("group_members")
            .delete()
            .eq("group_id", groupId)
            .eq("member_id", memberId)
        : await supabase.from("group_members").insert({ group_id: groupId, member_id: memberId });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return;
      }
      await fetchBackendData();
      showNotice("Membros do grupo atualizados.");
      return;
    }

    updateState((current) => ({
      ...current,
      members: current.members.map((member) => {
        if (member.id !== memberId) return member;
        const hasGroup = member.groupIds.includes(groupId);
        return {
          ...member,
          groupIds: hasGroup
            ? member.groupIds.filter((id) => id !== groupId)
            : [...member.groupIds, groupId],
        };
      }),
    }));
    showNotice("Membros do grupo atualizados.");
  }

  async function createInvite(input: { code: string; role: MemberRole; maxUses: number }) {
    if (!supabase || !profile) return false;
    const code = (input.code.trim() || makeInviteCode()).toUpperCase();
    setSyncStatus("saving");
    const { error } = await supabase.rpc("issue_invite", {
      _code: code,
      _role: input.role,
      _max_uses: input.maxUses,
    });
    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return false;
    }
    await fetchBackendData();
    showNotice("Convite criado.");
    return true;
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setState(seedState);
    setInviteCodes([]);
  }

  async function handleOnboarding(input: {
    mode: "founder" | "invite";
    name: string;
    pronouns: string;
    inviteCode: string;
  }) {
    if (!supabase) return;
    setSyncStatus("saving");
    const rpcName = input.mode === "founder" ? "claim_founder" : "accept_invite";
    const payload =
      input.mode === "founder"
        ? { display_name: input.name.trim(), display_pronouns: input.pronouns.trim() }
        : {
            _invite_code: input.inviteCode.trim().toUpperCase(),
            display_name: input.name.trim(),
            display_pronouns: input.pronouns.trim(),
          };
    const { error } = await supabase.rpc(rpcName, payload);
    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return;
    }
    await refreshSignedInData();
    showNotice(input.mode === "founder" ? "Comunidade criada." : "Entrada concluída.");
  }

  if (usingBackend && authLoading) {
    return <LoadingScreen label="A abrir comunidade" />;
  }

  if (usingBackend && !session) {
    return <AuthView />;
  }

  if (usingBackend && session && !profile) {
    return (
      <OnboardingView
        hasFounder={communityHasFounder}
        syncMessage={syncStatus === "error" ? syncMessage : ""}
        onSubmit={handleOnboarding}
        onSignOut={handleSignOut}
      />
    );
  }

  if (usingBackend && profile && isMemberSuspended(profile)) {
    return <SuspendedScreen member={profile} onSignOut={handleSignOut} />;
  }

  return (
    <div className={`app-shell ${activeNav === "chat" ? "chat-mode" : ""}`}>
      {notice && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={17} aria-hidden />
          {notice}
        </div>
      )}
      <aside className="sidebar">
        <div className="brand-block">
          <div>
            <h1>entra.</h1>
            <p>com sentimento</p>
          </div>
        </div>

        <nav className={currentMember.role === "admin" ? "nav-list admin-nav" : "nav-list"} aria-label="Navegação principal">
          <NavButton id="hoje" active={activeNav} setActive={setActiveNav} icon={<CircleDot />} label="Hoje" />
          <NavButton id="chat" active={activeNav} setActive={setActiveNav} icon={<MessageCircle />} label="Chat" />
          <NavButton id="agenda" active={activeNav} setActive={setActiveNav} icon={<CalendarDays />} label="Agenda" />
          <NavButton id="comunidade" active={activeNav} setActive={setActiveNav} icon={<Users />} label="Comunidade" />
          <NavButton id="memoria" active={activeNav} setActive={setActiveNav} icon={<BookOpenText />} label="Memória" />
          <NavButton id="nocturno" active={activeNav} setActive={setActiveNav} icon={<Sparkles />} label="Nocturno" />
          <NavButton id="cuidado" active={activeNav} setActive={setActiveNav} icon={<HeartHandshake />} label="Cuidado" />
          {currentMember.role === "admin" && (
            <NavButton id="admin" active={activeNav} setActive={setActiveNav} icon={<ShieldCheck />} label="Admin" />
          )}
        </nav>

        {usingBackend && profile ? (
          <div className="actor-box account-box">
            <MemberAvatar member={profile} className="account-avatar" />
            <label>Conta</label>
            <strong>{profile.name}</strong>
            <span>{profile.role}</span>
          </div>
        ) : (
          <div className="actor-box">
            <label htmlFor="current-member">Ver como</label>
            <select
              id="current-member"
              value={currentMemberId}
              onChange={(event) => setCurrentMemberId(event.target.value)}
            >
              {state.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button className="ghost-button" type="button" onClick={usingBackend ? handleSignOut : resetState}>
          <RefreshCw size={16} aria-hidden />
          {usingBackend ? "Sair" : "Repor exemplo"}
        </button>
      </aside>

      <main className={`workspace ${activeNav === "chat" ? "chat-workspace" : ""}`}>
        <header className="topbar">
          <div>
            <p className="eyebrow">quinta, 18 junho 2026</p>
            <h2>{navTitle(activeNav)}</h2>
          </div>
          <div className="status-strip" aria-label="Estado da comunidade">
            <span className={`sync-pill ${syncStatus}`} title={syncMessage || syncCopy.description}>
              <ShieldCheck size={16} aria-hidden />
              {syncCopy.label}
            </span>
            <span>
              <Wifi size={16} aria-hidden />
              {onlineMembers.length} online
            </span>
            <span>
              <ShieldCheck size={16} aria-hidden />
              {state.members.length} membros
            </span>
            <button
              className="status-action"
              type="button"
              onClick={() => copyText(window.location.origin, "Link da app copiado.")}
            >
              <Copy size={16} aria-hidden />
              Link
            </button>
          </div>
        </header>

        {activeNav === "hoje" && (
          <Overview
            members={state.members}
            groups={state.groups}
            events={upcomingEvents}
            decisions={state.decisions}
            memberById={memberById}
            groupById={groupById}
            setActiveNav={setActiveNav}
          />
        )}

        {activeNav === "chat" && (
          <ChatView
            members={state.members}
            groups={state.groups}
            docs={state.docs}
            decisions={state.decisions}
            messages={state.messages}
            activeGroupId={activeGroup.id}
            currentMember={currentMember}
            memberById={memberById}
            docsByCode={docsByCode}
            decisionsByCode={decisionsByCode}
            setActiveGroupId={setActiveGroupId}
            setSelectedCitation={setSelectedCitation}
            sendMessage={sendMessage}
            markImageOpened={markImageOpened}
            getMessageImageUrl={getMessageImageUrl}
            deviceSecurityStatus={deviceSecurityStatus}
            deviceKeys={deviceKeys}
            directPeerCount={directPeerCount}
            confirmTrustDevice={confirmTrustDevice}
            submitReport={submitReport}
            toggleMemberStatus={toggleMemberStatus}
            addGroup={addGroup}
            copyText={copyText}
            showNotice={showNotice}
          />
        )}

        {activeNav === "agenda" && (
          <EventsView
            events={upcomingEvents}
            eventRooms={state.eventRooms}
            eventCheckIns={state.eventCheckIns}
            groups={state.groups}
            currentMember={currentMember}
            memberById={memberById}
            groupById={groupById}
            addEvent={addEvent}
            addEventRoom={addEventRoom}
            deleteEventRoom={deleteEventRoom}
            addEventCheckIn={addEventCheckIn}
            deleteEvent={deleteEvent}
            toggleRsvp={toggleRsvp}
          />
        )}

        {activeNav === "comunidade" && (
          <CommunityHub
            members={state.members}
            groups={state.groups}
            memberById={memberById}
            currentMember={currentMember}
            backendMode={usingBackend}
            inviteCodes={inviteCodes}
            intentions={state.intentions}
            introductions={state.introductions}
            interests={state.interests}
            relationships={state.relationships}
            privacySettings={state.privacySettings}
            deviceKeys={deviceKeys}
            updateOwnProfile={updateOwnProfile}
            uploadProfilePhoto={uploadProfilePhoto}
            updateIntention={updateIntention}
            requestIntroduction={requestIntroduction}
            updateIntroductionStatus={updateIntroductionStatus}
            toggleInterest={toggleInterest}
            addRelationship={addRelationship}
            deleteRelationship={deleteRelationship}
            updatePrivacySettings={updatePrivacySettings}
            addGroup={addGroup}
            toggleGroupMember={toggleGroupMember}
            addMember={addMember}
            createInvite={createInvite}
            updateConsentCard={updateConsentCard}
            copyText={copyText}
          />
        )}

        {activeNav === "memoria" && (
          <MemoryHub
            docs={filteredDocs}
            decisions={filteredDecisions}
            members={state.members}
            currentMember={currentMember}
            memberById={memberById}
            search={search}
            setSearch={setSearch}
            selectedCitation={selectedCitation}
            setSelectedCitation={setSelectedCitation}
            addDoc={addDoc}
            addDecision={addDecision}
            voteDecision={voteDecision}
            deleteDecision={deleteDecision}
            deleteDoc={deleteDoc}
            copyText={copyText}
            showNotice={showNotice}
          />
        )}

        {activeNav === "nocturno" && (
          <NocturnoView
            members={state.members}
            groups={state.groups}
            currentMember={currentMember}
            memberById={memberById}
            deviceIdentity={deviceIdentity}
            deviceKeys={deviceKeys}
            deviceSecurityStatus={deviceSecurityStatus}
            interests={state.interests}
            toggleInterest={toggleInterest}
            showNotice={showNotice}
          />
        )}

        {activeNav === "cuidado" && (
          <CareHub
            members={state.members}
            currentMember={currentMember}
            memberById={memberById}
            events={upcomingEvents}
            eventCheckIns={state.eventCheckIns}
            reports={state.reports}
            submitReport={submitReport}
            showNotice={showNotice}
          />
        )}

        {activeNav === "admin" && currentMember.role === "admin" && (
          <AdminView
            members={state.members}
            groups={state.groups}
            events={upcomingEvents}
            eventRooms={state.eventRooms}
            eventCheckIns={state.eventCheckIns}
            docs={state.docs}
            decisions={state.decisions}
            messages={state.messages}
            reports={state.reports}
            auditLogs={state.auditLogs}
            inviteCodes={inviteCodes}
            introductions={state.introductions}
            privacySettings={state.privacySettings}
            currentMember={currentMember}
            memberById={memberById}
            groupById={groupById}
            updateMemberRole={updateMemberRole}
            toggleMemberStatus={toggleMemberStatus}
            updateIntroductionStatus={updateIntroductionStatus}
            deleteMessage={deleteMessage}
            deleteEvent={deleteEvent}
            deleteEventRoom={deleteEventRoom}
            deleteDoc={deleteDoc}
            deleteDecision={deleteDecision}
            updateReport={updateReport}
            setMemberSuspension={setMemberSuspension}
            setActiveNav={setActiveNav}
          />
        )}
      </main>
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel surface entry-auth-panel">
        <div className="entry-orb" aria-hidden="true" />
        <div className="brand-block compact entry-lockup">
          <div>
            <h1>entra.</h1>
            <p>{label}</p>
          </div>
        </div>
        <p>A preparar a ligação segura à comunidade.</p>
      </section>
    </main>
  );
}

function SuspendedScreen({ member, onSignOut }: { member: Member; onSignOut: () => Promise<void> }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel surface">
        <div className="brand-mark">
          <ShieldCheck size={22} aria-hidden />
        </div>
        <h2>Conta suspensa temporariamente</h2>
        <p>
          {member.name}, o acesso à comunidade está pausado
          {member.suspendedUntil ? ` até ${formatClock(member.suspendedUntil)}` : ""}. Se precisares de contexto,
          fala com uma pessoa admin fora da app.
        </p>
        <button className="primary-button" type="button" onClick={() => void onSignOut()}>
          Sair
        </button>
      </section>
    </main>
  );
}

function AuthView() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !email.trim() || !password.trim()) return;
    setSubmitting(true);
    setMessage("");

    const loginEmail = mode === "login" ? resolveLoginIdentifier(email) : email.trim();
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: loginEmail, password })
        : await supabase.auth.signUp({ email: loginEmail, password });

    setSubmitting(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Conta criada. Confirma o email antes de entrar.");
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel surface entry-auth-panel">
        <div className="entry-orb" aria-hidden="true" />
        <div className="brand-block compact entry-lockup">
          <div>
            <h1>entra.</h1>
            <p>com sentimento</p>
          </div>
        </div>

        <div className="segmented-control" role="tablist" aria-label="Modo de acesso">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            Entrar
          </button>
          <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>
            Criar conta
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="auth-email">{mode === "login" ? "Email ou acesso de teste" : "Email"}</label>
            <input
              id="auth-email"
              type={mode === "login" ? "text" : "email"}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="auth-password">Palavra-passe</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {message && <p className="form-alert">{message}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>
            <ShieldCheck size={17} aria-hidden />
            {submitting ? "Aguarda" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </section>
    </main>
  );
}

function OnboardingView({
  hasFounder,
  syncMessage,
  onSubmit,
  onSignOut,
}: {
  hasFounder: boolean;
  syncMessage: string;
  onSubmit: (input: {
    mode: "founder" | "invite";
    name: string;
    pronouns: string;
    inviteCode: string;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mode = hasFounder ? "invite" : "founder";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    if (mode === "invite" && !inviteCode.trim()) return;
    setSubmitting(true);
    await onSubmit({ mode, name, pronouns, inviteCode });
    setSubmitting(false);
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel surface">
        <div className="brand-block compact">
          <div>
            <h1>{mode === "founder" ? "Primeiro admin" : "Convite"}</h1>
            <p>{mode === "founder" ? "Criar a raiz da comunidade" : "Vincular entrada a quem convidou"}</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="onboard-name">Nome</label>
            <input id="onboard-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="onboard-pronouns">Pronomes</label>
            <input id="onboard-pronouns" value={pronouns} onChange={(event) => setPronouns(event.target.value)} />
          </div>
          {mode === "invite" && (
            <div className="field-group">
              <label htmlFor="invite-code">Código de convite</label>
              <input
                id="invite-code"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              />
            </div>
          )}
          {syncMessage && <p className="form-alert">{syncMessage}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>
            <HandHeart size={17} aria-hidden />
            {submitting ? "A guardar" : mode === "founder" ? "Criar admin" : "Entrar com convite"}
          </button>
          <button className="secondary-button full-width" type="button" onClick={onSignOut}>
            Sair
          </button>
        </form>
      </section>
    </main>
  );
}

function Overview({
  members,
  groups,
  events,
  decisions,
  memberById,
  groupById,
  setActiveNav,
}: {
  members: Member[];
  groups: Group[];
  events: EventItem[];
  decisions: DecisionRecord[];
  memberById: Map<string, Member>;
  groupById: Map<string, Group>;
  setActiveNav: (nav: NavKey) => void;
}) {
  const newMembers = members.filter((member) => member.role === "nova pessoa");
  return (
    <section className="dashboard-grid">
      <div className="metric-row">
        <Metric icon={<Users />} label="Membros" value={members.length} accent="#176b63" />
        <Metric icon={<CalendarDays />} label="Eventos marcados" value={events.length} accent="#c4493d" />
        <Metric icon={<Vote />} label="Decisões" value={decisions.length} accent="#5457a6" />
        <Metric icon={<HandHeart />} label="Novas entradas" value={newMembers.length} accent="#9a5a20" />
      </div>

      <div className="split-layout">
        <section className="surface agenda-surface">
          <SurfaceHeader
            icon={<CalendarDays />}
            title="Próximos eventos"
            actionLabel="Gerir"
            onAction={() => setActiveNav("agenda")}
          />
          <div className="item-list">
            {events.slice(0, 4).map((event) => (
              <article className="event-item" key={event.id}>
                <time dateTime={event.startsAt}>
                  <strong>{formatDay(event.startsAt)}</strong>
                  <span>{formatMonth(event.startsAt)}</span>
                </time>
                <div>
                  <h3>{event.title}</h3>
                  <p>
                    {formatTime(event.startsAt)} · {event.place} ·{" "}
                    {groupById.get(event.groupId)?.name}
                  </p>
                </div>
                <span className="small-pill">{event.attendeeIds.length}/{event.capacity}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="surface">
          <SurfaceHeader
            icon={<HandHeart />}
            title="Apadrinhamento"
            actionLabel="Entrada"
            onAction={() => setActiveNav("comunidade")}
          />
          <div className="sponsor-chain">
            {members.map((member) => (
              <article className="sponsor-node" key={member.id}>
                <MemberAvatar member={member} />
                <div>
                  <h3>{member.name}</h3>
                  <p>
                    {member.sponsorId
                      ? `convidade por ${memberById.get(member.sponsorId)?.name}`
                      : "raiz da comunidade"}
                  </p>
                </div>
                <span className="small-pill">
                  {members.filter((candidate) => candidate.sponsorId === member.id).length} vinc.
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="split-layout three">
        {groups.map((group) => (
          <article className="group-tile" key={group.id} style={{ "--group-color": group.color } as React.CSSProperties}>
            <div className="tile-bar" />
            <h3>{group.name}</h3>
            <p>{group.focus}</p>
            <footer>
              <span>{group.privacy}</span>
              <span>{members.filter((member) => member.groupIds.includes(group.id)).length} membros</span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChatView({
  members,
  groups,
  docs,
  decisions,
  messages,
  activeGroupId,
  currentMember,
  memberById,
  docsByCode,
  decisionsByCode,
  setActiveGroupId,
  setSelectedCitation,
  sendMessage,
  markImageOpened,
  getMessageImageUrl,
  deviceSecurityStatus,
  deviceKeys,
  directPeerCount,
  confirmTrustDevice,
  submitReport,
  toggleMemberStatus,
  addGroup,
  copyText,
  showNotice,
}: {
  members: Member[];
  groups: Group[];
  docs: CommunityDoc[];
  decisions: DecisionRecord[];
  messages: ChatMessage[];
  activeGroupId: string;
  currentMember: Member;
  memberById: Map<string, Member>;
  docsByCode: Map<string, CommunityDoc>;
  decisionsByCode: Map<string, DecisionRecord>;
  setActiveGroupId: (id: string) => void;
  setSelectedCitation: (code: string) => void;
  sendMessage: (input: MessageInput) => Promise<boolean>;
  markImageOpened: (messageId: string) => Promise<boolean>;
  getMessageImageUrl: (message: ChatMessage) => Promise<string | null>;
  deviceSecurityStatus: DeviceSecurityStatus;
  deviceKeys: DeviceKey[];
  directPeerCount: number;
  confirmTrustDevice: (deviceId: string) => Promise<void>;
  submitReport: (input: {
    subjectMemberId?: string | null;
    roomId?: string | null;
    messageId?: string | null;
    category: ReportCategory;
    severity: ReportSeverity;
    summary: string;
    details: string;
  }) => Promise<boolean>;
  toggleMemberStatus: (id: string) => void;
  addGroup: (input: { name: string; focus: string; privacy: GroupPrivacy; stewardId: string }) => Promise<boolean>;
  copyText: (value: string, message: string) => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [draftCitationCode, setDraftCitationCode] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageViewOnce, setImageViewOnce] = useState(false);
  const [imageConsentRequired, setImageConsentRequired] = useState(true);
  const [imageExpiresInHours, setImageExpiresInHours] = useState(24);
  const [revealedImageUrls, setRevealedImageUrls] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: "",
    focus: "",
    privacy: "convite" as GroupPrivacy,
  });
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const encryptionReady = deviceSecurityStatus === "ready";
  const visibleMessages = messages.filter((message) => {
    if (message.roomId !== activeGroup.id) return false;
    return (
      message.authorId === currentMember.id || message.recipientsAtSend.includes(currentMember.id)
    );
  });
  const roomRows = groups.map((group) => {
    const latestMessage = messages
      .filter((message) => message.roomId === group.id)
      .reduce<ChatMessage | undefined>(
        (latest, message) => (!latest || message.createdAt > latest.createdAt ? message : latest),
        undefined,
      );
    const latestAuthor = latestMessage ? memberById.get(latestMessage.authorId)?.name ?? "Pessoa" : "";
    const latestBody = latestMessage
      ? latestMessage.imagePath || latestMessage.imageUrl
        ? "imagem privada · ver uma vez"
        : latestMessage.body
      : group.focus;
    const preview = latestMessage ? `${latestAuthor}: ${latestBody}` : latestBody;
    const memberCount = members.filter((member) => member.groupIds.includes(group.id)).length;
    return { group, latestMessage, preview, memberCount };
  });
  const groupMembers = members.filter((member) => member.groupIds.includes(activeGroup.id));
  const onlineCount = groupMembers.filter((member) => member.status === "online").length;
  const groupMemberIds = new Set(groupMembers.map((member) => member.id));
  const changedDeviceKeys = deviceKeys.filter(
    (deviceKey) => groupMemberIds.has(deviceKey.memberId) && deviceKey.trustStatus === "changed",
  );
  const newDeviceKeys = deviceKeys.filter(
    (deviceKey) => groupMemberIds.has(deviceKey.memberId) && deviceKey.trustStatus === "new",
  );
  const citationTargets = [
    ...decisions.map((decision) => ({
      id: decision.id,
      code: decision.code,
      title: decision.title,
      tags: [decision.status],
      kind: "decisão",
    })),
    ...docs.map((doc) => ({
      id: doc.id,
      code: doc.code,
      title: doc.title,
      tags: doc.tags,
      kind: "doc",
    })),
  ];
  const activeMentionQuery = getActiveMentionQuery(draft);
  const citationSuggestions =
    activeMentionQuery === null
      ? []
      : citationTargets
          .filter((target) => {
            const query = activeMentionQuery.toLowerCase();
            if (!query) return true;
            return [target.code, target.title, target.kind, ...target.tags].some((value) =>
              value.toLowerCase().includes(query),
            );
          })
          .slice(0, 5);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/")) {
      showNotice("Escolhe um ficheiro de imagem.");
      return;
    }

    if (nextFile.size > 10 * 1024 * 1024) {
      showNotice("A imagem deve ter menos de 10 MB.");
      return;
    }

    setImageFile(nextFile);
  }

  function clearImage() {
    setImageFile(null);
    setImageViewOnce(false);
    setImageConsentRequired(true);
    setImageExpiresInHours(24);
  }

  function insertCitationMention(target: CitationTarget) {
    const mention = `@${getCitationMentionLabel(target)}`;
    const nextDraft = draft.match(/(^|\s)@[^@]*$/)
      ? draft.replace(/(^|\s)@[^@]*$/, `$1${mention} `)
      : `${draft.trimEnd()} ${mention} `;
    setDraftCitationCode(target.code);
    setDraft(nextDraft);
  }

  async function revealImage(message: ChatMessage) {
    const imageUrl = await getMessageImageUrl(message);
    if (!imageUrl) {
      showNotice("Imagem indisponível.");
      return;
    }

    const opened = await markImageOpened(message.id);
    if (!opened) return;

    setRevealedImageUrls((current) => ({ ...current, [message.id]: imageUrl }));
  }

  function renderMessageImage(message: ChatMessage) {
    if (!message.imagePath && !message.imageUrl) return null;

    const isOwn = message.authorId === currentMember.id;
    const openedByMe = message.imageOpenedBy.includes(currentMember.id);
    const revealedUrl = revealedImageUrls[message.id];
    const expired = message.imageExpiresAt ? new Date(message.imageExpiresAt).getTime() <= Date.now() : false;
    const visibleImageUrl = message.imageViewOnce && !isOwn ? revealedUrl : revealedUrl || message.imageUrl;
    const needsConsent = message.imageConsentRequired && !isOwn && !openedByMe && !revealedUrl;
    const encryptedLocked = message.imageEncrypted && !message.imageDecryption;
    const needsEncryptedReveal = message.imageEncrypted && !visibleImageUrl && !encryptedLocked;

    if (expired) {
      return (
        <div className="image-placeholder">
          <Timer size={18} aria-hidden />
          <span>Imagem expirada</span>
        </div>
      );
    }

    if (encryptedLocked) {
      return (
        <div className="image-placeholder encrypted-media">
          <LockKeyhole size={18} aria-hidden />
          <span>Media cifrada sem chave neste dispositivo</span>
        </div>
      );
    }

    if ((message.imageViewOnce || needsConsent) && !isOwn && !revealedUrl) {
      if (openedByMe) {
        return (
          <div className="image-placeholder">
            <EyeOff size={18} aria-hidden />
            <span>Imagem já aberta</span>
          </div>
        );
      }

      return (
        <button className="image-reveal consent-envelope" type="button" onClick={() => revealImage(message)}>
          <LockKeyhole size={18} aria-hidden />
          <span>{message.imageViewOnce ? "Abrir imagem uma vez" : "Abrir com consentimento"}</span>
          <small>{message.imageEncrypted ? "Decifra neste dispositivo." : "Sem guardar, reenviar ou mostrar a terceiros."}</small>
        </button>
      );
    }

    if (needsEncryptedReveal) {
      return (
        <button className="image-reveal encrypted-media" type="button" onClick={() => revealImage(message)}>
          <LockKeyhole size={18} aria-hidden />
          <span>Abrir media cifrada</span>
          <small>A chave fica apenas neste dispositivo.</small>
        </button>
      );
    }

    if (!visibleImageUrl) {
      return (
        <div className="image-placeholder">
          <ImageIcon size={18} aria-hidden />
          <span>Imagem indisponível</span>
        </div>
      );
    }

    return (
      <figure className="message-image">
        <img src={visibleImageUrl} alt={message.imageName ?? "Imagem enviada"} />
        {message.imageConsentRequired && <span className="image-watermark">{currentMember.name}</span>}
        <figcaption>
          {message.imageViewOnce ? <EyeOff size={14} aria-hidden /> : <ShieldCheck size={14} aria-hidden />}
          {message.imageEncrypted
            ? "Media E2EE"
            : message.imageViewOnce
              ? "Ver uma vez"
              : message.imageConsentRequired
                ? "Envelope privado"
                : "Imagem"}
          {message.imageExpiresAt ? ` · expira ${formatExpiry(message.imageExpiresAt)}` : ""}
        </figcaption>
      </figure>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCitation = citationTargets.find((target) => target.code === draftCitationCode);
    const citationCode =
      selectedCitation && hasDocMention(draft, selectedCitation)
        ? selectedCitation.code
        : findReferencedDocCode(draft, citationTargets);
    const citedTarget = citationCode ? citationTargets.find((target) => target.code === citationCode) : undefined;
    const body = citedTarget ? stripCitationMention(draft, citedTarget) : draft;
    setSending(true);
    const sent = await sendMessage({
      body,
      citationCode,
      imageFile,
      imageViewOnce,
      imageConsentRequired,
      imageExpiresInHours,
    }).finally(() => setSending(false));
    if (sent) {
      setDraft("");
      setDraftCitationCode("");
      clearImage();
    }
  }

  async function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomForm.name.trim() || !roomForm.focus.trim()) return;
    const created = await addGroup({ ...roomForm, stewardId: currentMember.id });
    if (created) {
      setRoomForm({ name: "", focus: "", privacy: "convite" });
      setShowRoomForm(false);
    }
  }

  return (
    <section className="chat-layout">
      <aside className="surface live-sidebar">
        <div className="room-picker-block">
          <div className="room-list-header">
            <h3>Salas</h3>
            {currentMember.role === "admin" && (
              <button
                className="room-add-button"
                type="button"
                onClick={() => setShowRoomForm((current) => !current)}
                title="Nova sala"
              >
                <Plus size={16} aria-hidden />
              </button>
            )}
          </div>
          <div className="room-list" role="listbox" aria-label="Salas">
            {roomRows.map(({ group, latestMessage, preview, memberCount }) => (
              <button
                className={`room-row ${group.id === activeGroup.id ? "active" : ""}`}
                key={group.id}
                type="button"
                role="option"
                aria-selected={group.id === activeGroup.id}
                onClick={() => setActiveGroupId(group.id)}
              >
                <span className="room-dot" style={{ background: group.color }} />
                <span className="room-row-main">
                  <strong>
                    {group.name}
                    <small>{latestMessage ? formatClock(latestMessage.createdAt) : `${memberCount} membros`}</small>
                  </strong>
                  <span>{preview}</span>
                </span>
              </button>
            ))}
          </div>
          {currentMember.role === "admin" && (
            <>
              {showRoomForm && (
                <form className="room-create-form" onSubmit={handleRoomSubmit}>
                  <div className="field-group">
                    <label htmlFor="chat-room-name">Nome</label>
                    <input
                      id="chat-room-name"
                      value={roomForm.name}
                      onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="chat-room-focus">Foco</label>
                    <input
                      id="chat-room-focus"
                      value={roomForm.focus}
                      onChange={(event) => setRoomForm({ ...roomForm, focus: event.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="chat-room-privacy">Visibilidade</label>
                    <select
                      id="chat-room-privacy"
                      value={roomForm.privacy}
                      onChange={(event) => setRoomForm({ ...roomForm, privacy: event.target.value as GroupPrivacy })}
                    >
                      <option value="aberto">aberto</option>
                      <option value="convite">convite</option>
                      <option value="secreto">secreto</option>
                    </select>
                  </div>
                  <button className="primary-button full-width" type="submit">
                    Criar sala
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <div className="member-presence">
          {groupMembers.map((member) => (
            <button
              className={`presence-row ${member.status}`}
              key={member.id}
              type="button"
              onClick={() => toggleMemberStatus(member.id)}
              title="Alternar ligação"
            >
              <MemberAvatar member={member} className="presence-avatar" />
              <span>{member.name}</span>
              <small>{member.status}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="surface chat-panel">
        <header className="chat-header">
          <div className="chat-title-block">
            <div className="chat-avatar" style={{ background: activeGroup.color }}>
              {initials(activeGroup.name)}
            </div>
            <div>
              <h3>{activeGroup.name}</h3>
              <p>
                {onlineCount} online · {groupMembers.length} membros
              </p>
            </div>
          </div>
          <select
            className="mobile-room-select"
            aria-label="Mudar sala"
            value={activeGroup.id}
            onChange={(event) => setActiveGroupId(event.target.value)}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <div className="chat-status-pills">
            <span className={`small-pill encryption-pill ${encryptionReady ? "ready" : deviceSecurityStatus}`}>
              <LockKeyhole size={13} aria-hidden />
              {encryptionReady ? "Cifrado" : "A preparar"}
            </span>
            {directPeerCount > 0 && (
              <span className="small-pill direct-pill ready">
                <RadioTower size={13} aria-hidden />
                P2P
              </span>
            )}
            <span className="small-pill chat-count-pill">{visibleMessages.length} visíveis para {currentMember.name}</span>
          </div>
        </header>

        {(changedDeviceKeys.length > 0 || newDeviceKeys.length > 0) && (
          <div className="key-trust-stack">
            {changedDeviceKeys.map((deviceKey) => (
              <article className="key-trust-alert danger" key={deviceKey.id}>
                <LockKeyhole size={15} aria-hidden />
                <div>
                  <strong>A chave deste dispositivo mudou.</strong>
                  <span>
                    {memberById.get(deviceKey.memberId)?.name ?? "Pessoa"} · {deviceKey.deviceLabel} ·{" "}
                    {deviceKey.fingerprint ?? "sem impressão"}
                  </span>
                </div>
                <button className="secondary-button" type="button" onClick={() => confirmTrustDevice(deviceKey.id)}>
                  Confiar de novo
                </button>
              </article>
            ))}
            {newDeviceKeys.slice(0, 3).map((deviceKey) => (
              <article className="key-trust-alert" key={deviceKey.id}>
                <ShieldCheck size={15} aria-hidden />
                <div>
                  <strong>Novo dispositivo visto.</strong>
                  <span>
                    {memberById.get(deviceKey.memberId)?.name ?? "Pessoa"} · {deviceKey.deviceLabel} ·{" "}
                    {deviceKey.fingerprint ?? "sem impressão"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="message-list" aria-live="polite">
          {visibleMessages.map((message) => {
            const author = memberById.get(message.authorId);
            const citedDoc = message.citationCode ? docsByCode.get(message.citationCode) : undefined;
            const citedDecision = message.citationCode ? decisionsByCode.get(message.citationCode) : undefined;
            const citedTitle = citedDoc?.title ?? citedDecision?.title;
            const isOwnMessage = message.authorId === currentMember.id;
            return (
              <div className={`message-row ${isOwnMessage ? "own" : ""}`} key={message.id}>
                {!isOwnMessage && author && <MemberAvatar member={author} className="message-avatar" />}
                <article className={`message ${isOwnMessage ? "own" : ""}`}>
                  {!isOwnMessage && <strong className="message-author">{author?.name ?? "Pessoa"}</strong>}
                  <p className={message.encryptionStatus === "locked" ? "locked-message" : ""}>{message.body}</p>
                  {renderMessageImage(message)}
                  {citedTitle && (
                    <div className="message-actions">
                      <button className="citation-chip" type="button" onClick={() => setSelectedCitation(message.citationCode ?? "")}>
                        <Link2 size={14} aria-hidden />
                        {citedTitle}
                      </button>
                      <button
                        className="icon-only compact"
                        type="button"
                        onClick={() => copyText(message.citationCode ?? "", `${message.citationCode} copiado.`)}
                        title="Copiar código"
                      >
                        <Copy size={15} aria-hidden />
                      </button>
                    </div>
                  )}
                  <div className="message-meta">
                    <span>{formatClock(message.createdAt)}</span>
                    {!isOwnMessage && (
                      <button
                        className="text-button report-message-button"
                        type="button"
                        onClick={() =>
                          submitReport({
                            subjectMemberId: message.authorId,
                            roomId: message.roomId,
                            messageId: message.id,
                            category: message.imagePath || message.imageUrl ? "conteudo" : "consentimento",
                            severity: message.imageConsentRequired || message.imageViewOnce ? "alta" : "media",
                            summary: `Ajuda com mensagem de ${author?.name ?? "pessoa"}`,
                            details: "Quero que uma pessoa admin veja o contexto desta mensagem.",
                          })
                        }
                        title="Pedir ajuda sobre esta mensagem"
                      >
                        <Flag size={12} aria-hidden />
                        Ajuda
                      </button>
                    )}
                    {isOwnMessage && (
                      <span className="delivery-check">
                        <Check size={12} aria-hidden />
                      </span>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          {citationSuggestions.length > 0 && (
            <div className="mention-menu" role="listbox" aria-label="Documentos disponíveis">
              {citationSuggestions.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  role="option"
                  aria-label={`Citar ${target.title}`}
                  onClick={() => insertCitationMention(target)}
                >
                  <span>{target.title}</span>
                  <small>{target.kind} · {target.tags.slice(0, 2).join(" · ")}</small>
                </button>
              ))}
            </div>
          )}

          {imageFile && (
            <div className="attachment-preview">
              {imagePreview && <img src={imagePreview} alt="" />}
              <div>
                <strong>{imageFile.name}</strong>
                <span>{formatFileSize(imageFile.size)}</span>
              </div>
              <button className="icon-only" type="button" onClick={clearImage} title="Remover imagem">
                <X size={16} aria-hidden />
              </button>
            </div>
          )}

          <div className="composer-row">
            <input
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (!event.target.value.trim()) setDraftCitationCode("");
              }}
              placeholder={`Mensagem como ${currentMember.name}; usa @ para citar`}
            />
            <label className="secondary-button attachment-picker" title="Adicionar imagem">
              <ImageIcon size={18} aria-hidden />
              <span>Imagem</span>
              <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
            </label>
            <button className="primary-button icon-button" type="submit" disabled={sending} title="Enviar">
              <MessageCircle size={18} aria-hidden />
              <span>{sending ? "A enviar" : "Enviar"}</span>
            </button>
          </div>

          {imageFile && (
            <button
              className={`view-once-toggle ${imageViewOnce ? "active" : ""}`}
              type="button"
              onClick={() => setImageViewOnce((current) => !current)}
            >
              {imageViewOnce ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              <span>{imageViewOnce ? "Ver uma vez" : "Imagem normal"}</span>
            </button>
          )}
          {imageFile && (
            <div className="media-safety-row">
              <button
                className={`view-once-toggle ${imageConsentRequired ? "active" : ""}`}
                type="button"
                onClick={() => setImageConsentRequired((current) => !current)}
              >
                <LockKeyhole size={16} aria-hidden />
                <span>{imageConsentRequired ? "Envelope privado" : "Sem envelope"}</span>
              </button>
              <select
                aria-label="Expiração da imagem"
                value={imageExpiresInHours}
                onChange={(event) => setImageExpiresInHours(Number(event.target.value))}
              >
                <option value={1}>expira 1h</option>
                <option value={12}>expira 12h</option>
                <option value={24}>expira 24h</option>
                <option value={72}>expira 3 dias</option>
              </select>
            </div>
          )}
        </form>
      </section>
    </section>
  );
}

function HubTabButton<T extends string>({
  id,
  active,
  setActive,
  icon,
  label,
}: {
  id: T;
  active: T;
  setActive: (id: T) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      className={active === id ? "secondary-button selected" : "secondary-button"}
      type="button"
      role="tab"
      aria-selected={active === id}
      onClick={() => setActive(id)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CommunityHub({
  members,
  groups,
  memberById,
  currentMember,
  backendMode,
  inviteCodes,
  intentions,
  introductions,
  interests,
  relationships,
  privacySettings,
  deviceKeys,
  updateOwnProfile,
  uploadProfilePhoto,
  updateIntention,
  requestIntroduction,
  updateIntroductionStatus,
  toggleInterest,
  addRelationship,
  deleteRelationship,
  updatePrivacySettings,
  addGroup,
  toggleGroupMember,
  addMember,
  createInvite,
  updateConsentCard,
  copyText,
}: {
  members: Member[];
  groups: Group[];
  memberById: Map<string, Member>;
  currentMember: Member;
  backendMode: boolean;
  inviteCodes: InviteCode[];
  intentions: MemberIntention[];
  introductions: WarmIntroduction[];
  interests: MutualInterest[];
  relationships: RelationshipLink[];
  privacySettings: PrivacySettings;
  deviceKeys: DeviceKey[];
  updateOwnProfile: (input: ProfileUpdateInput) => Promise<boolean>;
  uploadProfilePhoto: (file: File) => Promise<boolean>;
  updateIntention: (input: { kinds: IntentionKind[]; note: string }) => Promise<boolean>;
  requestIntroduction: (input: { targetId: string; connectorId: string; note: string }) => Promise<boolean>;
  updateIntroductionStatus: (introductionId: string, status: IntroductionStatus) => Promise<void>;
  toggleInterest: (input: { targetId: string; kind: InterestKind }) => Promise<void>;
  addRelationship: (input: {
    relatedMemberId: string;
    label: string;
    visibility: RelationshipVisibility;
  }) => Promise<boolean>;
  deleteRelationship: (relationshipId: string) => Promise<void>;
  updatePrivacySettings: (input: PrivacySettings) => Promise<boolean>;
  addGroup: (input: { name: string; focus: string; privacy: GroupPrivacy; stewardId: string }) => Promise<boolean>;
  toggleGroupMember: (groupId: string, memberId: string) => void;
  addMember: (input: { name: string; pronouns: string; sponsorId: string; groupIds: string[] }) => void;
  createInvite?: (input: { code: string; role: MemberRole; maxUses: number }) => Promise<boolean>;
  updateConsentCard: (input: {
    memberId: string;
    consentAvailableFor: string;
    consentLimits: string;
    mediaPreference: string;
    relationshipContext: string;
    eventComfort: string;
  }) => Promise<boolean>;
  copyText: (value: string, message: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<CommunityTab>("perfil");

  return (
    <section className="hub-shell">
      <div className="hub-tabs surface" role="tablist" aria-label="Comunidade">
        <HubTabButton id="perfil" active={activeTab} setActive={setActiveTab} icon={<User size={15} aria-hidden />} label="Perfil" />
        <HubTabButton id="conexoes" active={activeTab} setActive={setActiveTab} icon={<HeartHandshake size={15} aria-hidden />} label="Conexões" />
        <HubTabButton id="grupos" active={activeTab} setActive={setActiveTab} icon={<Users size={15} aria-hidden />} label="Grupos" />
        <HubTabButton id="entradas" active={activeTab} setActive={setActiveTab} icon={<HandHeart size={15} aria-hidden />} label="Entradas" />
        <HubTabButton id="compersao" active={activeTab} setActive={setActiveTab} icon={<Sparkles size={15} aria-hidden />} label="Compersão" />
      </div>

      {activeTab === "perfil" && (
        <ProfileView
          currentMember={currentMember}
          deviceKeys={deviceKeys}
          updateOwnProfile={updateOwnProfile}
          uploadProfilePhoto={uploadProfilePhoto}
        />
      )}

      {activeTab === "conexoes" && (
        <ConnectionsView
          members={members}
          currentMember={currentMember}
          memberById={memberById}
          intentions={intentions}
          introductions={introductions}
          interests={interests}
          relationships={relationships}
          privacySettings={privacySettings}
          deviceKeys={deviceKeys}
          updateIntention={updateIntention}
          requestIntroduction={requestIntroduction}
          updateIntroductionStatus={updateIntroductionStatus}
          toggleInterest={toggleInterest}
          addRelationship={addRelationship}
          deleteRelationship={deleteRelationship}
          updatePrivacySettings={updatePrivacySettings}
        />
      )}

      {activeTab === "grupos" && (
        <GroupsView groups={groups} members={members} memberById={memberById} addGroup={addGroup} toggleGroupMember={toggleGroupMember} />
      )}

      {activeTab === "entradas" && (
        <EntrancesView
          members={members}
          groups={groups}
          memberById={memberById}
          addMember={addMember}
          backendMode={backendMode}
          currentMember={currentMember}
          inviteCodes={inviteCodes}
          createInvite={createInvite}
          updateConsentCard={updateConsentCard}
          copyText={copyText}
        />
      )}

      {activeTab === "compersao" && <CompersionView members={members} currentMember={currentMember} memberById={memberById} />}
    </section>
  );
}

function CompersionView({
  members,
  currentMember,
  memberById,
}: {
  members: Member[];
  currentMember: Member;
  memberById: Map<string, Member>;
}) {
  const otherMembers = members.filter((member) => member.id !== currentMember.id);
  const [targetId, setTargetId] = useState(otherMembers[0]?.id ?? currentMember.id);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([
    {
      id: "comp_1",
      fromId: "demo_ines",
      toId: "demo_carolina",
      note: "Obrigada pela forma como acolheste a conversa sem pressa.",
      createdAt: "2026-06-18T18:40:00",
    },
    {
      id: "comp_2",
      fromId: "demo_joao",
      toId: "m_ana",
      note: "Foi bonito ver o cuidado com que preparaste o pós-evento.",
      createdAt: "2026-06-18T19:05:00",
    },
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) return;
    setNotes((current) => [
      {
        id: crypto.randomUUID(),
        fromId: currentMember.id,
        toId: targetId,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setNote("");
  }

  return (
    <section className="split-layout">
      <form className="surface form-panel" onSubmit={handleSubmit}>
        <SurfaceHeader icon={<Sparkles />} title="Apreciação" />
        <div className="field-group">
          <label htmlFor="compersion-target">Pessoa</label>
          <select id="compersion-target" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            {otherMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="compersion-note">Nota</label>
          <textarea id="compersion-note" rows={5} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <button className="primary-button" type="submit">
          <Sparkles size={17} aria-hidden />
          Guardar
        </button>
      </form>

      <section className="surface compersion-board">
        <SurfaceHeader icon={<Heart />} title="Momentos bons" />
        <div className="ritual-list">
          {notes.map((entry) => (
            <article className="soft-card" key={entry.id}>
              <header>
                <strong>{memberById.get(entry.fromId)?.name ?? "Pessoa"}</strong>
                <span>para {memberById.get(entry.toId)?.name ?? "alguém"}</span>
              </header>
              <p>{entry.note}</p>
              <small>{formatClock(entry.createdAt)}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function MemoryHub({
  docs,
  decisions,
  members,
  currentMember,
  memberById,
  search,
  setSearch,
  selectedCitation,
  setSelectedCitation,
  addDoc,
  addDecision,
  voteDecision,
  deleteDecision,
  deleteDoc,
  copyText,
  showNotice,
}: {
  docs: CommunityDoc[];
  decisions: DecisionRecord[];
  members: Member[];
  currentMember: Member;
  memberById: Map<string, Member>;
  search: string;
  setSearch: (value: string) => void;
  selectedCitation: string;
  setSelectedCitation: (code: string) => void;
  addDoc: (input: { title: string; summary: string; tags: string }) => Promise<boolean>;
  addDecision: (input: {
    title: string;
    summary: string;
    outcome: string;
    status: DecisionStatus;
  }) => Promise<boolean>;
  voteDecision: (decisionId: string, vote: DecisionVote) => Promise<void>;
  deleteDecision: (decisionId: string) => Promise<void>;
  deleteDoc: (docId: string) => Promise<void>;
  copyText: (value: string, message: string) => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<MemoryTab>("docs");

  return (
    <section className="hub-shell">
      <div className="hub-tabs surface" role="tablist" aria-label="Memória">
        <HubTabButton id="docs" active={activeTab} setActive={setActiveTab} icon={<BookOpenText size={15} aria-hidden />} label="Docs e decisões" />
        <HubTabButton id="acordos" active={activeTab} setActive={setActiveTab} icon={<ShieldCheck size={15} aria-hidden />} label="Acordos" />
        <HubTabButton id="leituras" active={activeTab} setActive={setActiveTab} icon={<BookOpenText size={15} aria-hidden />} label="Leituras" />
        <HubTabButton id="rituais" active={activeTab} setActive={setActiveTab} icon={<HandHeart size={15} aria-hidden />} label="Rituais" />
      </div>

      {activeTab === "docs" && (
        <DocsView
          docs={docs}
          decisions={decisions}
          members={members}
          currentMember={currentMember}
          memberById={memberById}
          search={search}
          setSearch={setSearch}
          selectedCitation={selectedCitation}
          setSelectedCitation={setSelectedCitation}
          addDoc={addDoc}
          addDecision={addDecision}
          voteDecision={voteDecision}
          deleteDecision={deleteDecision}
          deleteDoc={deleteDoc}
          copyText={copyText}
          showNotice={showNotice}
        />
      )}

      {activeTab === "acordos" && <AgreementsView copyText={copyText} />}
      {activeTab === "leituras" && <ReadingsView />}
      {activeTab === "rituais" && <RitualsView />}
    </section>
  );
}

function AgreementsView({ copyText }: { copyText: (value: string, message: string) => Promise<void> }) {
  const agreements = [
    {
      title: "Fotos em eventos íntimos",
      status: "activo",
      review: "rever em 30 dias",
      text: "Sem fotografias em eventos íntimos. Em eventos sociais, perguntar antes e aceitar um não sem debate.",
    },
    {
      title: "Apresentações quentes",
      status: "activo",
      review: "rever mensalmente",
      text: "Pedidos de contacto novo passam por uma pessoa ponte quando existe relação prévia.",
    },
    {
      title: "Media íntima",
      status: "rascunho",
      review: "precisa decisão",
      text: "Imagens sensíveis devem usar envelope privado, expiração e consentimento explícito antes de abrir.",
    },
  ];

  return (
    <section className="memory-grid">
      {agreements.map((agreement) => (
        <article className="surface soft-card" key={agreement.title}>
          <header>
            <strong>{agreement.title}</strong>
            <span className="small-pill">{agreement.status}</span>
          </header>
          <p>{agreement.text}</p>
          <footer>
            <span>{agreement.review}</span>
            <button className="icon-only compact" type="button" onClick={() => copyText(agreement.text, "Acordo copiado.")} title="Copiar acordo">
              <Copy size={14} aria-hidden />
            </button>
          </footer>
        </article>
      ))}
    </section>
  );
}

function ReadingsView() {
  const readings = [
    {
      title: "The Ethical Slut",
      theme: "bases, autonomia e honestidade radical",
      prompt: "Que acordo teu mudou quando deixaste de tentar controlar tudo?",
    },
    {
      title: "Polysecure",
      theme: "apego, segurança e múltiplas relações",
      prompt: "Que gesto te faz sentir seguro/a antes de uma conversa difícil?",
    },
    {
      title: "Come As You Are",
      theme: "desejo, contexto e resposta sexual",
      prompt: "Que contexto torna o teu desejo mais disponível?",
    },
  ];

  return (
    <section className="memory-grid">
      {readings.map((reading) => (
        <article className="surface soft-card" key={reading.title}>
          <header>
            <BookOpenText size={18} aria-hidden />
            <strong>{reading.title}</strong>
          </header>
          <span className="small-pill">{reading.theme}</span>
          <p>{reading.prompt}</p>
        </article>
      ))}
    </section>
  );
}

function RitualsView() {
  const rituals = [
    ["Antes de um date", "intenções, limites, safer sex, saída confortável"],
    ["Antes de enviar media", "consentimento, contexto, expiração, não reenviar"],
    ["Depois de uma festa", "check-in, aftercare, reparação se algo ficou estranho"],
    ["Entrada nova", "padrinho/madrinha, docs essenciais, primeiro evento, check-in"],
  ];

  return (
    <section className="memory-grid">
      {rituals.map(([title, text]) => (
        <article className="surface soft-card" key={title}>
          <header>
            <HandHeart size={18} aria-hidden />
            <strong>{title}</strong>
          </header>
          <p>{text}</p>
        </article>
      ))}
    </section>
  );
}

function NocturnoView({
  members,
  groups,
  currentMember,
  memberById,
  deviceIdentity,
  deviceKeys,
  deviceSecurityStatus,
  interests,
  toggleInterest,
  showNotice,
}: {
  members: Member[];
  groups: Group[];
  currentMember: Member;
  memberById: Map<string, Member>;
  deviceIdentity: DeviceIdentity | null;
  deviceKeys: DeviceKey[];
  deviceSecurityStatus: DeviceSecurityStatus;
  interests: MutualInterest[];
  toggleInterest: (input: { targetId: string; kind: InterestKind }) => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<NocturnoTab>("eroteca");
  const otherMembers = members.filter((member) => member.id !== currentMember.id);
  const [erotecaLinks, setErotecaLinks] = useState([
    {
      id: "ero_1",
      title: "Erika Lust - cinema adulto ético",
      url: "https://erikalust.com",
      tags: ["ético", "cinema", "queer"],
      warning: "conteúdo explícito",
      note: "Boa curadoria, diversidade de corpos e contexto.",
    },
    {
      id: "ero_2",
      title: "Bellesa",
      url: "https://www.bellesa.co",
      tags: ["curadoria", "artigos", "porn"],
      warning: "conteúdo adulto",
      note: "Útil para partilhar links com algum enquadramento.",
    },
  ]);
  const [linkForm, setLinkForm] = useState({ title: "", url: "", tags: "", warning: "", note: "" });
  const [provocations, setProvocations] = useState([
    "Um tipo de mensagem que me deixa curioso/a...",
    "Uma fantasia que gosto de nomear sem prometer explorar...",
    "O meu sim mais bonito começa quando...",
  ]);
  const [provocationDraft, setProvocationDraft] = useState("");
  const [fantasies, setFantasies] = useState([
    {
      id: "fan_1",
      title: "Lento, vestido, sem pressa",
      mood: "tensão suave",
      mode: "quero conversar",
      limits: "sem surpresa, sem público",
      aftercare: "mensagem no dia seguinte",
    },
    {
      id: "fan_2",
      title: "Ser observado/a com consentimento",
      mood: "voyeur/exibição",
      mode: "só partilhar",
      limits: "sem gravação",
      aftercare: "check-in privado",
    },
  ]);
  const [fantasyForm, setFantasyForm] = useState({ title: "", mood: "", mode: "quero conversar", limits: "", aftercare: "" });
  const [confessions, setConfessions] = useState([
    {
      id: "conf_1",
      signed: false,
      body: "Às vezes excita-me mais a conversa honesta antes do toque do que o toque em si.",
      open: true,
    },
    {
      id: "conf_2",
      signed: true,
      body: "Quero aprender a flirtar sem me esconder atrás de ironia.",
      open: false,
    },
  ]);
  const [confessionForm, setConfessionForm] = useState({ body: "", signed: false, open: true });

  function handleErotecaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!linkForm.title.trim() || !linkForm.url.trim()) return;
    setErotecaLinks((current) => [
      {
        id: crypto.randomUUID(),
        title: linkForm.title.trim(),
        url: linkForm.url.trim(),
        tags: linkForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        warning: linkForm.warning.trim() || "conteúdo adulto",
        note: linkForm.note.trim(),
      },
      ...current,
    ]);
    setLinkForm({ title: "", url: "", tags: "", warning: "", note: "" });
    showNotice("Link guardado na Eroteca.");
  }

  function handleProvocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!provocationDraft.trim()) return;
    setProvocations((current) => [provocationDraft.trim(), ...current]);
    setProvocationDraft("");
  }

  function handleFantasySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fantasyForm.title.trim()) return;
    setFantasies((current) => [{ id: crypto.randomUUID(), ...fantasyForm }, ...current]);
    setFantasyForm({ title: "", mood: "", mode: "quero conversar", limits: "", aftercare: "" });
    showNotice("Fantasia guardada.");
  }

  function handleConfessionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confessionForm.body.trim()) return;
    setConfessions((current) => [{ id: crypto.randomUUID(), ...confessionForm }, ...current]);
    setConfessionForm({ body: "", signed: false, open: true });
  }

  return (
    <section className="hub-shell nocturno-shell">
      <div className="hub-tabs nocturno-tabs surface" role="tablist" aria-label="Nocturno">
        <HubTabButton id="eroteca" active={activeTab} setActive={setActiveTab} icon={<BookOpenText size={15} aria-hidden />} label="Eroteca" />
        <HubTabButton id="provocacoes" active={activeTab} setActive={setActiveTab} icon={<Sparkles size={15} aria-hidden />} label="Provocações" />
        <HubTabButton id="tensao" active={activeTab} setActive={setActiveTab} icon={<Heart size={15} aria-hidden />} label="Tensão mútua" />
        <HubTabButton id="fantasias" active={activeTab} setActive={setActiveTab} icon={<Eye size={15} aria-hidden />} label="Fantasias" />
        <HubTabButton id="confessionario" active={activeTab} setActive={setActiveTab} icon={<LockKeyhole size={15} aria-hidden />} label="Confessionário" />
        <HubTabButton id="video" active={activeTab} setActive={setActiveTab} icon={<Video size={15} aria-hidden />} label="Vídeo privado" />
      </div>

      {activeTab === "eroteca" && (
        <section className="nocturno-grid">
          <form className="surface form-panel nocturno-panel" onSubmit={handleErotecaSubmit}>
            <SurfaceHeader icon={<BookOpenText />} title="Novo link" />
            <div className="field-group">
              <label htmlFor="eroteca-title">Título</label>
              <input id="eroteca-title" value={linkForm.title} onChange={(event) => setLinkForm({ ...linkForm, title: event.target.value })} />
            </div>
            <div className="field-group">
              <label htmlFor="eroteca-url">URL</label>
              <input id="eroteca-url" value={linkForm.url} onChange={(event) => setLinkForm({ ...linkForm, url: event.target.value })} />
            </div>
            <div className="field-pair">
              <div className="field-group">
                <label htmlFor="eroteca-tags">Tags</label>
                <input id="eroteca-tags" value={linkForm.tags} onChange={(event) => setLinkForm({ ...linkForm, tags: event.target.value })} />
              </div>
              <div className="field-group">
                <label htmlFor="eroteca-warning">Aviso</label>
                <input id="eroteca-warning" value={linkForm.warning} onChange={(event) => setLinkForm({ ...linkForm, warning: event.target.value })} />
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="eroteca-note">Porque vale a pena</label>
              <textarea id="eroteca-note" rows={3} value={linkForm.note} onChange={(event) => setLinkForm({ ...linkForm, note: event.target.value })} />
            </div>
            <button className="primary-button" type="submit">
              <Plus size={17} aria-hidden />
              Guardar link
            </button>
          </form>
          <section className="nocturno-card-list">
            {erotecaLinks.map((link) => (
              <article className="surface nocturno-card" key={link.id}>
                <header>
                  <strong>{link.title}</strong>
                  <span className="small-pill">{link.warning}</span>
                </header>
                <p>{link.note}</p>
                <footer>
                  {link.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  <a href={link.url} target="_blank" rel="noreferrer">abrir</a>
                </footer>
              </article>
            ))}
          </section>
        </section>
      )}

      {activeTab === "provocacoes" && (
        <section className="split-layout">
          <form className="surface form-panel nocturno-panel" onSubmit={handleProvocationSubmit}>
            <SurfaceHeader icon={<Sparkles />} title="Nova provocação" />
            <div className="field-group">
              <label htmlFor="provocation-draft">Frase</label>
              <textarea id="provocation-draft" rows={5} value={provocationDraft} onChange={(event) => setProvocationDraft(event.target.value)} />
            </div>
            <button className="primary-button" type="submit">
              <Sparkles size={17} aria-hidden />
              Lançar
            </button>
          </form>
          <section className="nocturno-card-list">
            {provocations.map((provocation) => (
              <article className="surface nocturno-card provocation-card" key={provocation}>
                <Sparkles size={18} aria-hidden />
                <p>{provocation}</p>
              </article>
            ))}
          </section>
        </section>
      )}

      {activeTab === "tensao" && (
        <section className="interest-grid">
          {otherMembers.map((member) => {
            const active = interests.some((interest) => interest.fromId === currentMember.id && interest.toId === member.id && interest.kind === "flirt");
            const mutual = active && interests.some((interest) => interest.fromId === member.id && interest.toId === currentMember.id && interest.kind === "flirt");
            return (
              <article className="surface nocturno-card tension-card" key={member.id}>
                <header>
                  <MemberAvatar member={member} />
                  <div>
                    <strong>{member.name}</strong>
                    <p>{member.mediaPreference || member.relationshipContext || member.pronouns}</p>
                  </div>
                </header>
                <button className={active ? "secondary-button selected" : "secondary-button"} type="button" onClick={() => toggleInterest({ targetId: member.id, kind: "flirt" })}>
                  <Heart size={16} aria-hidden />
                  {mutual ? "Tensão mútua" : active ? "Sinal enviado" : "Tenho curiosidade"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {activeTab === "fantasias" && (
        <section className="nocturno-grid">
          <form className="surface form-panel nocturno-panel" onSubmit={handleFantasySubmit}>
            <SurfaceHeader icon={<Eye />} title="Nova fantasia" />
            <div className="field-group">
              <label htmlFor="fantasy-title">Título</label>
              <input id="fantasy-title" value={fantasyForm.title} onChange={(event) => setFantasyForm({ ...fantasyForm, title: event.target.value })} />
            </div>
            <div className="field-pair">
              <div className="field-group">
                <label htmlFor="fantasy-mood">Mood</label>
                <input id="fantasy-mood" value={fantasyForm.mood} onChange={(event) => setFantasyForm({ ...fantasyForm, mood: event.target.value })} />
              </div>
              <div className="field-group">
                <label htmlFor="fantasy-mode">Modo</label>
                <select id="fantasy-mode" value={fantasyForm.mode} onChange={(event) => setFantasyForm({ ...fantasyForm, mode: event.target.value })}>
                  <option value="só partilhar">só partilhar</option>
                  <option value="quero conversar">quero conversar</option>
                  <option value="quero explorar">quero explorar</option>
                </select>
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="fantasy-limits">Limites</label>
              <input id="fantasy-limits" value={fantasyForm.limits} onChange={(event) => setFantasyForm({ ...fantasyForm, limits: event.target.value })} />
            </div>
            <div className="field-group">
              <label htmlFor="fantasy-aftercare">Aftercare</label>
              <input id="fantasy-aftercare" value={fantasyForm.aftercare} onChange={(event) => setFantasyForm({ ...fantasyForm, aftercare: event.target.value })} />
            </div>
            <button className="primary-button" type="submit">
              <Plus size={17} aria-hidden />
              Guardar
            </button>
          </form>
          <section className="nocturno-card-list">
            {fantasies.map((fantasy) => (
              <article className="surface nocturno-card" key={fantasy.id}>
                <header>
                  <strong>{fantasy.title}</strong>
                  <span className="small-pill">{fantasy.mode}</span>
                </header>
                <p>{fantasy.mood}</p>
                <dl>
                  <div><dt>Limites</dt><dd>{fantasy.limits || "por preencher"}</dd></div>
                  <div><dt>Aftercare</dt><dd>{fantasy.aftercare || "por preencher"}</dd></div>
                </dl>
              </article>
            ))}
          </section>
        </section>
      )}

      {activeTab === "confessionario" && (
        <section className="nocturno-grid">
          <form className="surface form-panel nocturno-panel" onSubmit={handleConfessionSubmit}>
            <SurfaceHeader icon={<LockKeyhole />} title="Nova confissão" />
            <div className="field-group">
              <label htmlFor="confession-body">Texto</label>
              <textarea id="confession-body" rows={6} value={confessionForm.body} onChange={(event) => setConfessionForm({ ...confessionForm, body: event.target.value })} />
            </div>
            <label className="privacy-toggle">
              <input type="checkbox" checked={confessionForm.signed} onChange={(event) => setConfessionForm({ ...confessionForm, signed: event.target.checked })} />
              <span>assinar</span>
            </label>
            <label className="privacy-toggle">
              <input type="checkbox" checked={confessionForm.open} onChange={(event) => setConfessionForm({ ...confessionForm, open: event.target.checked })} />
              <span>aberto a conversa</span>
            </label>
            <button className="primary-button" type="submit">
              <LockKeyhole size={17} aria-hidden />
              Guardar
            </button>
          </form>
          <section className="nocturno-card-list">
            {confessions.map((confession) => (
              <article className="surface nocturno-card confession-card" key={confession.id}>
                <header>
                  <strong>{confession.signed ? currentMember.name : "Anónimo"}</strong>
                  <span className="small-pill">{confession.open ? "aberto" : "só partilha"}</span>
                </header>
                <p>{confession.body}</p>
              </article>
            ))}
          </section>
        </section>
      )}

      {activeTab === "video" && (
        <PrivateVideoRooms
          members={members}
          groups={groups}
          currentMember={currentMember}
          memberById={memberById}
          deviceIdentity={deviceIdentity}
          deviceKeys={deviceKeys}
          deviceSecurityStatus={deviceSecurityStatus}
          showNotice={showNotice}
        />
      )}
    </section>
  );
}

function PrivateVideoRooms({
  members,
  groups,
  currentMember,
  memberById,
  deviceIdentity,
  deviceKeys,
  deviceSecurityStatus,
  showNotice,
}: {
  members: Member[];
  groups: Group[];
  currentMember: Member;
  memberById: Map<string, Member>;
  deviceIdentity: DeviceIdentity | null;
  deviceKeys: DeviceKey[];
  deviceSecurityStatus: DeviceSecurityStatus;
  showNotice: (message: string) => void;
}) {
  const memberGroups = groups.filter((group) => currentMember.groupIds.includes(group.id));
  const [groupId, setGroupId] = useState(memberGroups[0]?.id ?? "");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [callTitle, setCallTitle] = useState("Sala privada");
  const [relayEnabled, setRelayEnabled] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [videoMode, setVideoMode] = useState<VideoRoomMode>("gallery");
  const [spotlightTileId, setSpotlightTileId] = useState("local");
  const [isStageFullscreen, setIsStageFullscreen] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveVideoCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteVideoStream[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<IncomingVideoOffer[]>([]);
  const stageRef = useRef<HTMLElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<ActiveVideoCall | null>(null);
  const peerSessionsRef = useRef<Map<string, VideoPeerSession>>(new Map());
  const pendingVideoIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const seenVideoSignalsRef = useRef<Set<string>>(new Set());
  const signalReady = Boolean(supabase && deviceIdentity && deviceSecurityStatus === "ready");
  const browserCanCall =
    typeof window !== "undefined" &&
    "RTCPeerConnection" in window &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  const selectedGroup = groups.find((group) => group.id === groupId) ?? memberGroups[0];
  const groupMembers = members.filter(
    (member) => member.id !== currentMember.id && member.groupIds.includes(selectedGroup?.id ?? ""),
  );
  const availableMemberIds = new Set(
    deviceKeys
      .filter((deviceKey) => !deviceKey.revokedAt && deviceKey.memberId !== currentMember.id && isRecentlySeenDevice(deviceKey))
      .map((deviceKey) => deviceKey.memberId),
  );
  const liveDeviceCount = deviceKeys.filter(
    (deviceKey) => !deviceKey.revokedAt && deviceKey.memberId !== currentMember.id && isRecentlySeenDevice(deviceKey),
  ).length;
  const relayActuallyEnabled = relayEnabled && turnRelayAvailable;
  const videoTiles = [
    {
      id: "local",
      label: `${currentMember.name} · tu`,
      muted: true,
      state: localStream ? ("open" as DirectPeerState) : ("closed" as DirectPeerState),
      stream: localStream,
    },
    ...remoteStreams.map((remoteStream) => ({
      id: remoteStream.id,
      label: memberById.get(remoteStream.memberId)?.name ?? "Pessoa",
      muted: false,
      state: remoteStream.state,
      stream: remoteStream.stream,
    })),
  ];
  const spotlightTile =
    videoTiles.find((tile) => tile.id === spotlightTileId) ??
    videoTiles.find((tile) => tile.state === "open") ??
    videoTiles[0];
  const sideTiles = videoTiles.filter((tile) => tile.id !== spotlightTile.id);
  const videoStageClassName = [
    "surface",
    "video-stage",
    isStageFullscreen ? "fullscreen" : "",
    activeCall || localStream || remoteStreams.length ? "active" : "empty",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    if (!selectedGroup && memberGroups[0]) {
      setGroupId(memberGroups[0].id);
    }
  }, [memberGroups, selectedGroup]);

  useEffect(() => {
    const groupMemberIds = new Set(groupMembers.map((member) => member.id));
    const onlineGroupMemberIds = groupMembers
      .filter((member) => availableMemberIds.has(member.id) || (!signalReady && member.status === "online"))
      .map((member) => member.id);

    setSelectedMemberIds((current) => {
      const kept = current.filter((memberId) => groupMemberIds.has(memberId));
      return kept.length ? kept : onlineGroupMemberIds.slice(0, 4);
    });
  }, [groupId, members, deviceKeys, signalReady]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (!videoTiles.some((tile) => tile.id === spotlightTileId)) {
      setSpotlightTileId(videoTiles[0]?.id ?? "local");
    }
  }, [spotlightTileId, remoteStreams.length, localStream]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsStageFullscreen(document.fullscreenElement === stageRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!supabase || !deviceIdentity) return;

    const loadPendingVideoSignals = async () => {
      const { data } = await supabase
        .from("p2p_signals")
        .select("*")
        .eq("to_device_id", deviceIdentity.deviceId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(100);

      ((data ?? []) as P2PSignalRow[]).forEach((row) => {
        void handleVideoSignal(row);
      });
    };

    loadPendingVideoSignals();
    const channel = supabase
      .channel(`video-signals-${deviceIdentity.deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "p2p_signals",
          filter: `to_device_id=eq.${deviceIdentity.deviceId}`,
        },
        (payload) => {
          void handleVideoSignal(payload.new as P2PSignalRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceIdentity?.deviceId, currentMember.id]);

  useEffect(() => {
    return () => {
      peerSessionsRef.current.forEach((session) => session.peer.close());
      peerSessionsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function makePeerKey(callId: string, deviceId: string) {
    return `${callId}:${deviceId}`;
  }

  function setLocalMediaStream(stream: MediaStream | null) {
    localStreamRef.current = stream;
    setLocalStream(stream);
  }

  async function getLocalVideoStream() {
    if (!browserCanCall) {
      showNotice("Este browser não permite chamadas de vídeo.");
      return null;
    }

    if (localStreamRef.current) return localStreamRef.current;

    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setLocalMediaStream(stream);
      return stream;
    } catch {
      showNotice("Não consegui abrir a câmara ou o microfone.");
      return null;
    } finally {
      setCameraStarting(false);
    }
  }

  function updateRemoteStreamState(peerKey: string, state: DirectPeerState) {
    setRemoteStreams((current) =>
      current.map((remoteStream) => (remoteStream.id === peerKey ? { ...remoteStream, state } : remoteStream)),
    );
  }

  function closeVideoPeer(peerKey: string) {
    const session = peerSessionsRef.current.get(peerKey);
    if (!session) return;
    session.peer.close();
    peerSessionsRef.current.delete(peerKey);
    setRemoteStreams((current) => current.filter((remoteStream) => remoteStream.id !== peerKey));
  }

  async function leaveVideoRoom(sendClose = true) {
    const call = activeCallRef.current;
    const sessions = [...peerSessionsRef.current.values()];
    if (sendClose && call) {
      await Promise.all(
        sessions.map((session) =>
          sendVideoSignal(session.memberId, session.deviceId, call.roomId, "close", makeSignalPayload(call)),
        ),
      );
    }

    sessions.forEach((session) => session.peer.close());
    peerSessionsRef.current.clear();
    pendingVideoIceRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    setLocalMediaStream(null);
    setRemoteStreams([]);
    setActiveCall(null);
    setIncomingOffers([]);
    if (sendClose) showNotice("Sala de vídeo fechada.");
  }

  function makeSignalPayload(call: ActiveVideoCall, extra: Partial<VideoSignalPayload> = {}): VideoSignalPayload {
    return {
      kind: "video-call",
      callId: call.id,
      callTitle: call.title,
      relayEnabled: call.relayEnabled,
      participantIds: call.participantIds,
      ...extra,
    };
  }

  async function sendVideoSignal(
    toMemberId: string,
    toDeviceId: string,
    roomId: string,
    signalType: P2PSignalType,
    payload: VideoSignalPayload,
  ) {
    if (!supabase || !deviceIdentity) return false;

    const { error } = await supabase.from("p2p_signals").insert({
      id: `sig_${crypto.randomUUID()}`,
      room_id: roomId,
      from_member_id: currentMember.id,
      from_device_id: deviceIdentity.deviceId,
      to_member_id: toMemberId,
      to_device_id: toDeviceId,
      signal_type: signalType,
      payload: payload as unknown as Record<string, unknown>,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    if (error) {
      showNotice("Não consegui enviar o convite de vídeo.");
      return false;
    }

    return true;
  }

  async function createVideoPeer(remoteDevice: DeviceKey, call: ActiveVideoCall, stream: MediaStream, shouldOffer: boolean) {
    if (!browserCanCall) return null;
    if (remoteDevice.memberId === currentMember.id || remoteDevice.id === deviceIdentity?.deviceId) return null;

    const peerKey = makePeerKey(call.id, remoteDevice.id);
    const existing = peerSessionsRef.current.get(peerKey);
    if (existing && existing.peer.connectionState !== "closed") return existing;

    const peer = new RTCPeerConnection(getVideoRtcConfig(call.relayEnabled));
    const session: VideoPeerSession = {
      peerKey,
      callId: call.id,
      memberId: remoteDevice.memberId,
      deviceId: remoteDevice.id,
      peer,
      pendingIce: pendingVideoIceRef.current.get(peerKey) ?? [],
    };
    pendingVideoIceRef.current.delete(peerKey);
    peerSessionsRef.current.set(peerKey, session);
    setRemoteStreams((current) => {
      if (current.some((remoteStream) => remoteStream.id === peerKey)) return current;
      return [
        ...current,
        {
          id: peerKey,
          memberId: remoteDevice.memberId,
          deviceId: remoteDevice.id,
          stream: new MediaStream(),
          state: "connecting",
        },
      ];
    });

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    peer.ontrack = (event) => {
      setRemoteStreams((current) => {
        const existingStream = current.find((remoteStream) => remoteStream.id === peerKey);
        const nextStream = event.streams[0] ?? existingStream?.stream ?? new MediaStream();
        if (!event.streams[0] && !nextStream.getTracks().some((track) => track.id === event.track.id)) {
          nextStream.addTrack(event.track);
        }

        if (existingStream) {
          return current.map((remoteStream) =>
            remoteStream.id === peerKey ? { ...remoteStream, stream: nextStream, state: "open" } : remoteStream,
          );
        }

        return [
          ...current,
          {
            id: peerKey,
            memberId: remoteDevice.memberId,
            deviceId: remoteDevice.id,
            stream: nextStream,
            state: "open",
          },
        ];
      });
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendVideoSignal(
        remoteDevice.memberId,
        remoteDevice.id,
        call.roomId,
        "ice",
        makeSignalPayload(call, {
          candidate: event.candidate.toJSON(),
        }),
      );
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") updateRemoteStreamState(peerKey, "open");
      if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
        updateRemoteStreamState(peerKey, "failed");
      }
      if (peer.connectionState === "closed") updateRemoteStreamState(peerKey, "closed");
    };

    if (shouldOffer) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendVideoSignal(
        remoteDevice.memberId,
        remoteDevice.id,
        call.roomId,
        "offer",
        makeSignalPayload(call, {
          description: offer,
        }),
      );
    }

    return session;
  }

  async function applyQueuedVideoIce(session: VideoPeerSession) {
    if (!session.peer.remoteDescription) return;
    const queued = [...session.pendingIce];
    session.pendingIce = [];

    for (const candidate of queued) {
      try {
        await session.peer.addIceCandidate(candidate);
      } catch {
        // Candidates can arrive late after a browser has already renegotiated.
      }
    }
  }

  function getTargetDeviceKeys(memberIds: string[]) {
    if (!deviceIdentity) return [];
    const selected = new Set(memberIds);
    return deviceKeys.filter(
      (deviceKey) =>
        selected.has(deviceKey.memberId) &&
        deviceKey.id !== deviceIdentity.deviceId &&
        canUseDeviceKeyForEncryption(deviceKey) &&
        isRecentlySeenDevice(deviceKey),
    );
  }

  async function inviteDevicesToCall(devices: DeviceKey[], call: ActiveVideoCall, stream: MediaStream, quiet = false) {
    let sent = 0;

    for (const deviceKey of devices) {
      if (peerSessionsRef.current.has(makePeerKey(call.id, deviceKey.id))) continue;
      try {
        const session = await createVideoPeer(deviceKey, call, stream, true);
        if (session) sent += 1;
      } catch {
        updateRemoteStreamState(makePeerKey(call.id, deviceKey.id), "failed");
      }
    }

    if (!quiet) {
      showNotice(sent ? `${sent} convite(s) de vídeo enviados.` : "Não encontrei dispositivos online para convidar.");
    }
  }

  async function connectAcceptedMemberToMesh(call: ActiveVideoCall, stream: MediaStream, offerFromMemberId: string) {
    const meshMemberIds = call.participantIds.filter(
      (memberId) => memberId !== currentMember.id && memberId !== offerFromMemberId && currentMember.id < memberId,
    );
    const devices = getTargetDeviceKeys(meshMemberIds);
    if (devices.length) {
      await inviteDevicesToCall(devices, call, stream, true);
    }
  }

  async function startOrInviteToVideoRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup) {
      showNotice("Escolhe um grupo para a sala.");
      return;
    }

    if (relayEnabled && !turnRelayAvailable) {
      showNotice("Relay ainda não está configurado; vou manter ligação directa.");
    }

    const stream = await getLocalVideoStream();
    if (!stream) return;

    const participantIds = [...new Set([currentMember.id, ...selectedMemberIds])];
    const now = new Date().toISOString();
    const existingCall = activeCallRef.current;
    const nextCall: ActiveVideoCall = existingCall
      ? {
          ...existingCall,
          participantIds: [...new Set([...existingCall.participantIds, ...participantIds])],
        }
      : {
          id: `video_${crypto.randomUUID()}`,
          title: callTitle.trim() || "Sala privada",
          roomId: selectedGroup.id,
          relayEnabled: relayActuallyEnabled,
          participantIds,
          startedAt: now,
        };

    activeCallRef.current = nextCall;
    setActiveCall(nextCall);

    if (!signalReady) {
      showNotice("Pré-visualização aberta. Para convidar pessoas, entra com backend activo.");
      return;
    }

    const targetDevices = getTargetDeviceKeys(selectedMemberIds);
    if (!targetDevices.length) {
      showNotice("Escolhe pessoas com dispositivo online para convidar.");
      return;
    }

    await inviteDevicesToCall(targetDevices, nextCall, stream);
  }

  async function answerVideoOffer(offer: IncomingVideoOffer) {
    if (!offer.payload.description || offer.payload.description.type !== "offer") return;
    if (!deviceIdentity || !signalReady) {
      showNotice("Este dispositivo ainda não está pronto para vídeo privado.");
      return;
    }

    const stream = await getLocalVideoStream();
    if (!stream) return;

    const participantIds = [
      ...new Set([currentMember.id, offer.fromMemberId, ...(offer.payload.participantIds ?? [])]),
    ];
    const call: ActiveVideoCall = {
      id: offer.payload.callId,
      title: offer.payload.callTitle || "Sala privada",
      roomId: offer.roomId,
      relayEnabled: Boolean(offer.payload.relayEnabled && turnRelayAvailable),
      participantIds,
      startedAt: offer.createdAt,
    };
    activeCallRef.current = call;
    setActiveCall(call);

    const remoteDevice =
      deviceKeys.find((deviceKey) => deviceKey.id === offer.fromDeviceId) ?? {
        id: offer.fromDeviceId,
        memberId: offer.fromMemberId,
        deviceLabel: "browser",
        publicKey: {},
        createdAt: offer.createdAt,
        lastSeenAt: offer.createdAt,
        revokedAt: null,
      };
    const peerKey = makePeerKey(call.id, remoteDevice.id);
    if (peerSessionsRef.current.has(peerKey)) return;

    try {
      const session = await createVideoPeer(remoteDevice, call, stream, false);
      if (!session) return;
      if (!hasPeerSignalingState(session.peer, "stable")) return;
      await session.peer.setRemoteDescription(offer.payload.description);
      if (!hasPeerSignalingState(session.peer, "have-remote-offer")) return;
      await applyQueuedVideoIce(session);
      const answer = await session.peer.createAnswer();
      await session.peer.setLocalDescription(answer);
      await sendVideoSignal(
        offer.fromMemberId,
        offer.fromDeviceId,
        offer.roomId,
        "answer",
        makeSignalPayload(call, {
          description: answer,
        }),
      );
      setIncomingOffers((current) =>
        current.filter(
          (incomingOffer) =>
            incomingOffer.payload.callId !== offer.payload.callId || incomingOffer.fromDeviceId !== offer.fromDeviceId,
        ),
      );
      await connectAcceptedMemberToMesh(call, stream, offer.fromMemberId);
      showNotice("Entraste na sala de vídeo.");
    } catch {
      closeVideoPeer(peerKey);
      showNotice("Não consegui aceitar esta sala de vídeo.");
    }
  }

  async function handleVideoSignal(row: P2PSignalRow) {
    if (!deviceIdentity || row.to_device_id !== deviceIdentity.deviceId) return;
    if (seenVideoSignalsRef.current.has(row.id)) return;
    seenVideoSignalsRef.current.add(row.id);
    if (new Date(row.expires_at).getTime() < Date.now()) return;
    if (!isVideoSignalPayload(row.payload)) return;

    const payload = row.payload;
    const peerKey = makePeerKey(payload.callId, row.from_device_id);

    if (row.signal_type === "offer" && payload.description?.type === "offer") {
      const offer: IncomingVideoOffer = {
        signalId: row.id,
        roomId: row.room_id,
        fromMemberId: row.from_member_id,
        fromDeviceId: row.from_device_id,
        payload,
        createdAt: row.created_at,
      };

      if (localStreamRef.current && activeCallRef.current?.id === payload.callId) {
        await answerVideoOffer(offer);
        return;
      }

      setIncomingOffers((current) => {
        const keyExists = current.some(
          (incomingOffer) =>
            incomingOffer.payload.callId === payload.callId && incomingOffer.fromDeviceId === row.from_device_id,
        );
        return keyExists ? current : [offer, ...current];
      });
      showNotice("Convite para vídeo privado recebido.");
      return;
    }

    if (row.signal_type === "answer" && payload.description?.type === "answer") {
      const session = peerSessionsRef.current.get(peerKey);
      if (!session) return;
      if (!hasPeerSignalingState(session.peer, "have-local-offer")) return;
      try {
        await session.peer.setRemoteDescription(payload.description);
        await applyQueuedVideoIce(session);
      } catch {
        updateRemoteStreamState(peerKey, "failed");
      }
      return;
    }

    if (row.signal_type === "ice" && payload.candidate) {
      const session = peerSessionsRef.current.get(peerKey);
      const candidate = payload.candidate;
      if (!session) {
        const queued = pendingVideoIceRef.current.get(peerKey) ?? [];
        queued.push(candidate);
        pendingVideoIceRef.current.set(peerKey, queued);
        return;
      }

      if (!session.peer.remoteDescription) {
        session.pendingIce.push(candidate);
        return;
      }

      try {
        await session.peer.addIceCandidate(candidate);
      } catch {
        updateRemoteStreamState(peerKey, "failed");
      }
      return;
    }

    if (row.signal_type === "close") {
      closeVideoPeer(peerKey);
    }
  }

  function declineOffer(offer: IncomingVideoOffer) {
    setIncomingOffers((current) => current.filter((incomingOffer) => incomingOffer.signalId !== offer.signalId));
    sendVideoSignal(
      offer.fromMemberId,
      offer.fromDeviceId,
      offer.roomId,
      "close",
      {
        kind: "video-call",
        callId: offer.payload.callId,
        callTitle: offer.payload.callTitle,
        relayEnabled: offer.payload.relayEnabled,
        participantIds: offer.payload.participantIds,
      },
    );
  }

  function toggleSelectedMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId) ? current.filter((selectedId) => selectedId !== memberId) : [...current, memberId],
    );
  }

  async function toggleStageFullscreen() {
    if (!stageRef.current || !document.fullscreenEnabled) {
      showNotice("Este browser não permite ecrã inteiro aqui.");
      return;
    }

    try {
      if (document.fullscreenElement === stageRef.current) {
        await document.exitFullscreen();
        return;
      }

      await stageRef.current.requestFullscreen();
    } catch {
      showNotice("Não consegui abrir em ecrã inteiro.");
    }
  }

  return (
    <section className="video-room-layout">
      <form className="surface form-panel video-control-panel" onSubmit={startOrInviteToVideoRoom}>
        <SurfaceHeader icon={<Video />} title="Vídeo privado" />
        <div className="video-safety-grid">
          <span>Consentimento antes da câmara</span>
          <span>Media nunca guardada</span>
          <span>Sem análise de imagem/voz</span>
          <span>{relayActuallyEnabled ? "Relay ligado" : "Directo por defeito"}</span>
        </div>
        <div className="field-group">
          <label htmlFor="video-call-title">Nome da sala</label>
          <input
            id="video-call-title"
            value={callTitle}
            onChange={(event) => setCallTitle(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="video-group">Grupo</label>
          <select id="video-group" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            {memberGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="check-fieldset video-participant-list">
          <legend>Convidar</legend>
          {groupMembers.map((member) => {
            const hasLiveDevice = availableMemberIds.has(member.id);
            const disabled = signalReady && !hasLiveDevice;
            return (
              <label className={disabled ? "member-check disabled" : "member-check"} key={member.id}>
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(member.id)}
                  disabled={disabled}
                  onChange={() => toggleSelectedMember(member.id)}
                />
                <MemberAvatar member={member} />
                <span>
                  <strong>{member.name}</strong>
                  <small>{hasLiveDevice ? "dispositivo online" : member.status === "online" ? "online sem dispositivo" : "offline"}</small>
                </span>
              </label>
            );
          })}
        </fieldset>
        <label className={turnRelayAvailable ? "privacy-toggle relay-toggle" : "privacy-toggle relay-toggle disabled"}>
          <input
            type="checkbox"
            checked={relayEnabled}
            disabled={!turnRelayAvailable}
            onChange={(event) => setRelayEnabled(event.target.checked)}
          />
          <span>relay explícito</span>
        </label>
        <p className="video-relay-note">
          {turnRelayAvailable
            ? "Usa relay só quando a ligação directa falhar."
            : "Relay ainda não configurado; a sala tenta ligação directa."}
        </p>
        <button className="primary-button" type="submit" disabled={cameraStarting || !browserCanCall}>
          <Video size={17} aria-hidden />
          {cameraStarting ? "A abrir câmara" : activeCall ? "Convidar mais" : "Criar sala"}
        </button>
        {activeCall && (
          <button className="secondary-button" type="button" onClick={() => void leaveVideoRoom()}>
            <VideoOff size={17} aria-hidden />
            Fechar sala
          </button>
        )}
      </form>

      <section ref={stageRef} className={videoStageClassName}>
        <header className="video-stage-header">
          <div>
            <Video size={18} aria-hidden />
            <div>
              <h3>{activeCall?.title ?? "Sem sala activa"}</h3>
              <p>
                {signalReady
                  ? `${liveDeviceCount} dispositivo(s) online no radar`
                  : "Modo local: pré-visualização sem convites"}
              </p>
            </div>
          </div>
          <div className="video-meeting-actions" role="group" aria-label="Vista da chamada">
            {activeCall && <span className="small-pill">{formatClock(activeCall.startedAt)}</span>}
            <button
              className={videoMode === "gallery" ? "secondary-button selected" : "secondary-button"}
              type="button"
              onClick={() => setVideoMode("gallery")}
            >
              <LayoutGrid size={15} aria-hidden />
              Grelha
            </button>
            <button
              className={videoMode === "focus" ? "secondary-button selected" : "secondary-button"}
              type="button"
              onClick={() => setVideoMode("focus")}
            >
              <PanelTop size={15} aria-hidden />
              Foco
            </button>
            <button className="secondary-button" type="button" onClick={() => void toggleStageFullscreen()}>
              {isStageFullscreen ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
              {isStageFullscreen ? "Sair" : "Ecrã inteiro"}
            </button>
          </div>
        </header>

        {incomingOffers.length > 0 && (
          <div className="incoming-call-list">
            {incomingOffers.map((offer) => (
              <article className="incoming-call-card" key={offer.signalId}>
                <div>
                  <strong>{offer.payload.callTitle}</strong>
                  <p>{memberById.get(offer.fromMemberId)?.name ?? "Pessoa"} quer abrir vídeo privado.</p>
                </div>
                <div>
                  <button className="primary-button" type="button" onClick={() => void answerVideoOffer(offer)}>
                    <Video size={16} aria-hidden />
                    Aceitar
                  </button>
                  <button className="secondary-button" type="button" onClick={() => declineOffer(offer)}>
                    <X size={16} aria-hidden />
                    Recusar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {videoMode === "focus" ? (
          <div className={sideTiles.length ? "video-focus-layout" : "video-focus-layout solo"}>
            <div className="video-focus-main">
              <VideoStreamTile
                tileId={spotlightTile.id}
                label={spotlightTile.label}
                muted={spotlightTile.muted}
                state={spotlightTile.state}
                stream={spotlightTile.stream}
                isSpotlight
                onSpotlight={() => setSpotlightTileId(spotlightTile.id)}
              />
            </div>
            {sideTiles.length > 0 && (
              <div className="video-side-strip" aria-label="Outras pessoas na sala">
                {sideTiles.map((tile) => (
                  <VideoStreamTile
                    key={tile.id}
                    tileId={tile.id}
                    label={tile.label}
                    muted={tile.muted}
                    state={tile.state}
                    stream={tile.stream}
                    compact
                    isSpotlight={tile.id === spotlightTile.id}
                    onSpotlight={() => setSpotlightTileId(tile.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="video-tile-grid">
            {videoTiles.map((tile) => (
              <VideoStreamTile
                key={tile.id}
                tileId={tile.id}
                label={tile.label}
                muted={tile.muted}
                state={tile.state}
                stream={tile.stream}
                isSpotlight={tile.id === spotlightTile.id}
                onSpotlight={() => {
                  setSpotlightTileId(tile.id);
                  setVideoMode("focus");
                }}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function VideoStreamTile({
  tileId,
  label,
  muted,
  state,
  stream,
  compact = false,
  isSpotlight = false,
  onSpotlight,
}: {
  tileId: string;
  label: string;
  muted: boolean;
  state: DirectPeerState;
  stream: MediaStream | null;
  compact?: boolean;
  isSpotlight?: boolean;
  onSpotlight?: () => void;
}) {
  const tileRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasVideoTracks = Boolean(stream?.getVideoTracks().length);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === tileRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  async function toggleTileFullscreen() {
    if (!tileRef.current || !document.fullscreenEnabled) return;

    if (document.fullscreenElement === tileRef.current) {
      await document.exitFullscreen();
      return;
    }

    await tileRef.current.requestFullscreen();
  }

  return (
    <article
      ref={tileRef}
      className={[
        "video-tile",
        hasVideoTracks ? "live" : "",
        compact ? "compact" : "",
        isSpotlight ? "spotlight" : "",
      ].filter(Boolean).join(" ")}
      data-tile-id={tileId}
    >
      {hasVideoTracks ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} />
      ) : (
        <div className="video-placeholder">
          <VideoOff size={22} aria-hidden />
        </div>
      )}
      <div className="video-tile-actions">
        {onSpotlight && (
          <button className="icon-only compact" type="button" aria-label={`Destacar ${label}`} onClick={onSpotlight}>
            <Pin size={14} aria-hidden />
          </button>
        )}
        <button className="icon-only compact" type="button" aria-label={`Ecrã inteiro ${label}`} onClick={() => void toggleTileFullscreen()}>
          {isFullscreen ? <Minimize2 size={14} aria-hidden /> : <Maximize2 size={14} aria-hidden />}
        </button>
      </div>
      <footer>
        <strong>{label}</strong>
        <span>{state === "open" ? "ligado" : state === "connecting" ? "a ligar" : state}</span>
      </footer>
    </article>
  );
}

function CareHub({
  members,
  currentMember,
  memberById,
  events,
  eventCheckIns,
  reports,
  submitReport,
  showNotice,
}: {
  members: Member[];
  currentMember: Member;
  memberById: Map<string, Member>;
  events: EventItem[];
  eventCheckIns: EventCheckIn[];
  reports: SafetyReport[];
  submitReport: (input: {
    subjectMemberId?: string | null;
    roomId?: string | null;
    messageId?: string | null;
    category: ReportCategory;
    severity: ReportSeverity;
    summary: string;
    details: string;
  }) => Promise<boolean>;
  showNotice: (message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<CareTab>("ciume");
  const otherMembers = members.filter((member) => member.id !== currentMember.id);
  const [jealousyForm, setJealousyForm] = useState({ happened: "", story: "", need: "reasseguramento", shareWith: "" });
  const [repairForm, setRepairForm] = useState({ personId: otherMembers[0]?.id ?? "", impact: "", request: "", mediatorId: "" });
  const [reportForm, setReportForm] = useState({
    subjectMemberId: "",
    category: "consentimento" as ReportCategory,
    severity: "media" as ReportSeverity,
    summary: "",
    details: "",
  });
  const sensitiveCheckIns = eventCheckIns.filter((checkIn) => checkIn.mood === "atenção" || checkIn.visibility !== "comunidade");
  const myReports = reports.filter((report) => report.reporterId === currentMember.id);

  function submitCare(event: FormEvent<HTMLFormElement>, message: string) {
    event.preventDefault();
    showNotice(message);
  }

  async function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await submitReport({
      subjectMemberId: reportForm.subjectMemberId || null,
      category: reportForm.category,
      severity: reportForm.severity,
      summary: reportForm.summary,
      details: reportForm.details,
    });
    if (created) {
      setReportForm((current) => ({ ...current, summary: "", details: "" }));
    }
  }

  return (
    <section className="hub-shell care-shell">
      <div className="hub-tabs surface" role="tablist" aria-label="Cuidado">
        <HubTabButton id="ciume" active={activeTab} setActive={setActiveTab} icon={<Heart size={15} aria-hidden />} label="Ciúme Lab" />
        <HubTabButton id="reparacao" active={activeTab} setActive={setActiveTab} icon={<HeartHandshake size={15} aria-hidden />} label="Reparação" />
        <HubTabButton id="saude" active={activeTab} setActive={setActiveTab} icon={<ShieldCheck size={15} aria-hidden />} label="Saúde sexual" />
        <HubTabButton id="mediacao" active={activeTab} setActive={setActiveTab} icon={<HandHeart size={15} aria-hidden />} label="Mediação" />
      </div>

      {activeTab === "ciume" && (
        <form className="surface form-panel care-panel" onSubmit={(event) => submitCare(event, "Reflexão guardada.")}>
          <SurfaceHeader icon={<Heart />} title="Ciúme Lab" />
          <div className="field-group">
            <label htmlFor="jealousy-happened">O que aconteceu</label>
            <textarea id="jealousy-happened" rows={3} value={jealousyForm.happened} onChange={(event) => setJealousyForm({ ...jealousyForm, happened: event.target.value })} />
          </div>
          <div className="field-group">
            <label htmlFor="jealousy-story">A história que estou a contar</label>
            <textarea id="jealousy-story" rows={3} value={jealousyForm.story} onChange={(event) => setJealousyForm({ ...jealousyForm, story: event.target.value })} />
          </div>
          <div className="field-pair">
            <div className="field-group">
              <label htmlFor="jealousy-need">Preciso de</label>
              <select id="jealousy-need" value={jealousyForm.need} onChange={(event) => setJealousyForm({ ...jealousyForm, need: event.target.value })}>
                <option value="reasseguramento">reasseguramento</option>
                <option value="espaco">espaço</option>
                <option value="informacao">informação</option>
                <option value="toque">toque</option>
                <option value="reparacao">reparação</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="jealousy-share">Partilhar com</label>
              <select id="jealousy-share" value={jealousyForm.shareWith} onChange={(event) => setJealousyForm({ ...jealousyForm, shareWith: event.target.value })}>
                <option value="">só eu</option>
                {otherMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </div>
          </div>
          <button className="primary-button" type="submit">
            <Check size={17} aria-hidden />
            Guardar
          </button>
        </form>
      )}

      {activeTab === "reparacao" && (
        <section className="split-layout">
          <form className="surface form-panel care-panel" onSubmit={(event) => submitCare(event, "Pedido de reparação preparado.")}>
            <SurfaceHeader icon={<HeartHandshake />} title="Pedido de reparação" />
            <div className="field-group">
              <label htmlFor="repair-person">Pessoa</label>
              <select id="repair-person" value={repairForm.personId} onChange={(event) => setRepairForm({ ...repairForm, personId: event.target.value })}>
                {otherMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="repair-impact">Impacto</label>
              <textarea id="repair-impact" rows={3} value={repairForm.impact} onChange={(event) => setRepairForm({ ...repairForm, impact: event.target.value })} />
            </div>
            <div className="field-group">
              <label htmlFor="repair-request">Pedido</label>
              <textarea id="repair-request" rows={3} value={repairForm.request} onChange={(event) => setRepairForm({ ...repairForm, request: event.target.value })} />
            </div>
            <button className="primary-button" type="submit">
              <HandHeart size={17} aria-hidden />
              Preparar
            </button>
          </form>
          <section className="surface">
            <SurfaceHeader icon={<ClipboardCheck />} title="Sinais a acompanhar" />
            <div className="ritual-list">
              {sensitiveCheckIns.slice(0, 6).map((checkIn) => (
                <article className="soft-card" key={checkIn.id}>
                  <header>
                    <strong>{memberById.get(checkIn.memberId)?.name}</strong>
                    <span className="small-pill">{checkIn.mood}</span>
                  </header>
                  <p>{events.find((event) => event.id === checkIn.eventId)?.title ?? "Evento"}</p>
                  <small>{checkIn.note || "sem nota"}</small>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {activeTab === "saude" && (
        <section className="memory-grid">
          {[
            ["Último teste", "data opcional e privada por pessoa"],
            ["Barreiras", "preferências de preservativo, luva, dental dam e lubrificante"],
            ["Disclosure", "templates para conversas antes de encontro"],
            ["Depois", "check-in de sintomas, sustos ou mudança de acordo"],
          ].map(([title, text]) => (
            <article className="surface soft-card" key={title}>
              <header><ShieldCheck size={18} aria-hidden /><strong>{title}</strong></header>
              <p>{text}</p>
            </article>
          ))}
        </section>
      )}

      {activeTab === "mediacao" && (
        <section className="split-layout">
          <form className="surface form-panel care-panel" onSubmit={handleReportSubmit}>
            <SurfaceHeader icon={<Flag />} title="Pedir ajuda" />
            <p className="form-note">
              Este pedido fica visível para admins. Se houver risco imediato, procura ajuda fora da app.
            </p>
            <div className="field-pair">
              <div className="field-group">
                <label htmlFor="report-subject">Pessoa ligada ao pedido</label>
                <select
                  id="report-subject"
                  value={reportForm.subjectMemberId}
                  onChange={(event) => setReportForm({ ...reportForm, subjectMemberId: event.target.value })}
                >
                  <option value="">sem pessoa específica</option>
                  {otherMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="report-category">Categoria</label>
                <select
                  id="report-category"
                  value={reportForm.category}
                  onChange={(event) => setReportForm({ ...reportForm, category: event.target.value as ReportCategory })}
                >
                  {reportCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="report-severity">Severidade</label>
              <select
                id="report-severity"
                value={reportForm.severity}
                onChange={(event) => setReportForm({ ...reportForm, severity: event.target.value as ReportSeverity })}
              >
                {reportSeverityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="report-summary">Resumo</label>
              <input
                id="report-summary"
                value={reportForm.summary}
                onChange={(event) => setReportForm({ ...reportForm, summary: event.target.value })}
              />
            </div>
            <div className="field-group">
              <label htmlFor="report-details">Contexto</label>
              <textarea
                id="report-details"
                rows={4}
                value={reportForm.details}
                onChange={(event) => setReportForm({ ...reportForm, details: event.target.value })}
              />
            </div>
            <button className="primary-button" type="submit">
              <Flag size={17} aria-hidden />
              Enviar pedido
            </button>
          </form>

          <section className="surface">
            <SurfaceHeader icon={<ClipboardCheck />} title="Os meus pedidos" />
            <div className="ritual-list">
              {myReports.length === 0 ? (
                <p className="empty-note">Ainda não há pedidos.</p>
              ) : (
                myReports.map((report) => (
                  <article className="soft-card report-mini-card" key={report.id}>
                    <header>
                      <strong>{report.summary}</strong>
                      <span className={`small-pill ${report.severity === "urgente" ? "danger-pill" : ""}`}>
                        {reportStatusLabels[report.status]}
                      </span>
                    </header>
                    <p>{report.details || "sem detalhe"}</p>
                    <small>
                      {reportCategoryLabels[report.category]} · {reportSeverityLabels[report.severity]}
                    </small>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      )}
    </section>
  );
}

function ProfileView({
  currentMember,
  deviceKeys,
  updateOwnProfile,
  uploadProfilePhoto,
}: {
  currentMember: Member;
  deviceKeys: DeviceKey[];
  updateOwnProfile: (input: ProfileUpdateInput) => Promise<boolean>;
  uploadProfilePhoto: (file: File) => Promise<boolean>;
}) {
  const [form, setForm] = useState<ProfileUpdateInput>({
    name: currentMember.name,
    pronouns: currentMember.pronouns,
    status: currentMember.status,
    consentAvailableFor: currentMember.consentAvailableFor,
    consentLimits: currentMember.consentLimits,
    mediaPreference: currentMember.mediaPreference,
    relationshipContext: currentMember.relationshipContext,
    eventComfort: currentMember.eventComfort,
  });
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setForm({
      name: currentMember.name,
      pronouns: currentMember.pronouns,
      status: currentMember.status,
      consentAvailableFor: currentMember.consentAvailableFor,
      consentLimits: currentMember.consentLimits,
      mediaPreference: currentMember.mediaPreference,
      relationshipContext: currentMember.relationshipContext,
      eventComfort: currentMember.eventComfort,
    });
  }, [currentMember]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateOwnProfile(form);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      await uploadProfilePhoto(file);
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <form className="profile-layout" onSubmit={handleSubmit}>
      <section className="surface profile-identity">
        <div className="profile-photo-row">
          <MemberAvatar member={currentMember} className="profile-avatar" />
          <label className="secondary-button photo-picker">
            <ImageIcon size={17} aria-hidden />
            {photoBusy ? "A enviar" : "Fotografia"}
            <input className="sr-only" type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>
        </div>
        <div className="field-group">
          <label htmlFor="profile-name">Nome</label>
          <input
            id="profile-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div className="field-pair">
          <div className="field-group">
            <label htmlFor="profile-pronouns">Pronomes</label>
            <input
              id="profile-pronouns"
              value={form.pronouns}
              onChange={(event) => setForm({ ...form, pronouns: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="profile-status">Presença</label>
            <select
              id="profile-status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as MemberStatus })}
            >
              <option value="online">online</option>
              <option value="offline">offline</option>
            </select>
          </div>
        </div>
        <DeviceFingerprintList member={currentMember} deviceKeys={deviceKeys} title="Dispositivos deste perfil" />
      </section>

      <section className="surface form-panel profile-consent-panel">
        <SurfaceHeader icon={<HeartHandshake />} title="Cartão e preferências" />
        <div className="field-pair">
          <div className="field-group">
            <label htmlFor="profile-available">Disponível para</label>
            <input
              id="profile-available"
              value={form.consentAvailableFor}
              onChange={(event) => setForm({ ...form, consentAvailableFor: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="profile-limits">Limites</label>
            <input
              id="profile-limits"
              value={form.consentLimits}
              onChange={(event) => setForm({ ...form, consentLimits: event.target.value })}
            />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="profile-media">Media íntima</label>
          <input
            id="profile-media"
            value={form.mediaPreference}
            onChange={(event) => setForm({ ...form, mediaPreference: event.target.value })}
          />
        </div>
        <div className="field-pair">
          <div className="field-group">
            <label htmlFor="profile-context">Contexto relacional</label>
            <input
              id="profile-context"
              value={form.relationshipContext}
              onChange={(event) => setForm({ ...form, relationshipContext: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="profile-events">Eventos</label>
            <input
              id="profile-events"
              value={form.eventComfort}
              onChange={(event) => setForm({ ...form, eventComfort: event.target.value })}
            />
          </div>
        </div>
        <button className="primary-button" type="submit">
          <Check size={17} aria-hidden />
          Guardar perfil
        </button>
      </section>
    </form>
  );
}

function EventsView({
  events,
  eventRooms,
  eventCheckIns,
  groups,
  currentMember,
  memberById,
  groupById,
  addEvent,
  addEventRoom,
  deleteEventRoom,
  addEventCheckIn,
  deleteEvent,
  toggleRsvp,
}: {
  events: EventItem[];
  eventRooms: EventRoom[];
  eventCheckIns: EventCheckIn[];
  groups: Group[];
  currentMember: Member;
  memberById: Map<string, Member>;
  groupById: Map<string, Group>;
  addEvent: (input: {
    title: string;
    startsAt: string;
    place: string;
    groupId: string;
    capacity: number;
    vibe: EventVibe;
    photoPolicy: PhotoPolicy;
    boundaryNotes: string;
    aftercarePrompt: string;
  }) => Promise<boolean>;
  addEventRoom: (input: {
    eventId: string;
    name: string;
    purpose: string;
    expiresAt: string;
    memberIds: string[];
  }) => Promise<boolean>;
  deleteEventRoom: (roomId: string) => Promise<void>;
  addEventCheckIn: (input: {
    eventId: string;
    mood: CheckInMood;
    note: string;
    visibility: CheckInVisibility;
  }) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<void>;
  toggleRsvp: (eventId: string) => void;
}) {
  const [showEventForm, setShowEventForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    startsAt: "2026-06-25T19:30",
    place: "",
    groupId: groups[0]?.id ?? "",
    capacity: 10,
    vibe: "social" as EventVibe,
    photoPolicy: "perguntar primeiro" as PhotoPolicy,
    boundaryNotes: "",
    aftercarePrompt: "",
  });
  const [checkInForm, setCheckInForm] = useState({
    eventId: "",
    mood: "bem" as CheckInMood,
    note: "",
    visibility: "admins" as CheckInVisibility,
  });
  const [roomForm, setRoomForm] = useState({
    eventId: "",
    name: "",
    purpose: "",
    expiresAt: "2026-06-26T12:00",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.startsAt || !form.place.trim()) return;
    const created = await addEvent(form);
    if (created) {
      setForm((current) => ({ ...current, title: "", place: "", boundaryNotes: "", aftercarePrompt: "" }));
      setShowEventForm(false);
    }
  }

  async function handleCheckInSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkInForm.eventId) return;
    const created = await addEventCheckIn(checkInForm);
    if (created) {
      setCheckInForm((current) => ({ ...current, note: "" }));
    }
  }

  async function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedEvent = events.find((candidate) => candidate.id === roomForm.eventId);
    if (!selectedEvent) return;
    const created = await addEventRoom({
      ...roomForm,
      memberIds: [...new Set([currentMember.id, ...selectedEvent.attendeeIds])],
    });
    if (created) {
      setRoomForm((current) => ({ ...current, name: "", purpose: "" }));
    }
  }

  return (
    <section className="events-layout">
      <section className="event-create-stack">
        <div className="surface event-toolbar">
          <div>
            <h3>Calendário</h3>
            <p>{events.length} eventos marcados</p>
          </div>
          <button className="primary-button" type="button" onClick={() => setShowEventForm((current) => !current)}>
            <Plus size={17} aria-hidden />
            {showEventForm ? "Fechar" : "Novo evento"}
          </button>
        </div>

        {showEventForm && (
      <form className="surface form-panel event-create-panel" onSubmit={handleSubmit}>
        <h3>Novo evento</h3>
        <div className="field-group">
          <label htmlFor="event-title">Título</label>
          <input id="event-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </div>
        <div className="field-pair">
          <div className="field-group">
            <label htmlFor="event-date">Data</label>
            <input
              id="event-date"
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="event-capacity">Lugares</label>
            <input
              id="event-capacity"
              type="number"
              min={2}
              max={80}
              value={form.capacity}
              onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })}
            />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="event-place">Local</label>
          <input id="event-place" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} />
        </div>
        <div className="field-group">
          <label htmlFor="event-group">Grupo</label>
          <select id="event-group" value={form.groupId} onChange={(event) => setForm({ ...form, groupId: event.target.value })}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-pair">
          <div className="field-group">
            <label htmlFor="event-vibe">Vibe</label>
            <select
              id="event-vibe"
              value={form.vibe}
              onChange={(event) => setForm({ ...form, vibe: event.target.value as EventVibe })}
            >
              <option value="social">social</option>
              <option value="discussão">discussão</option>
              <option value="festa">festa</option>
              <option value="íntimo">íntimo</option>
              <option value="público">público</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="event-photo-policy">Fotos</label>
            <select
              id="event-photo-policy"
              value={form.photoPolicy}
              onChange={(event) => setForm({ ...form, photoPolicy: event.target.value as PhotoPolicy })}
            >
              <option value="sem fotos">sem fotos</option>
              <option value="perguntar primeiro">perguntar primeiro</option>
              <option value="zonas comuns ok">zonas comuns ok</option>
            </select>
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="event-boundaries">Acordos do espaço</label>
          <textarea
            id="event-boundaries"
            rows={3}
            value={form.boundaryNotes}
            onChange={(event) => setForm({ ...form, boundaryNotes: event.target.value })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="event-aftercare">Aftercare</label>
          <input
            id="event-aftercare"
            value={form.aftercarePrompt}
            onChange={(event) => setForm({ ...form, aftercarePrompt: event.target.value })}
          />
        </div>
        <button className="primary-button" type="submit">
          <Plus size={17} aria-hidden />
          Criar evento
        </button>
      </form>
        )}
      </section>

      <section className="event-board">
        <form className="surface checkin-panel" onSubmit={handleCheckInSubmit}>
          <SurfaceHeader icon={<HeartHandshake />} title="Check-in pós-evento" />
          <div className="field-pair">
            <div className="field-group">
              <label htmlFor="checkin-event">Evento</label>
              <select
                id="checkin-event"
                value={checkInForm.eventId}
                onChange={(event) => setCheckInForm({ ...checkInForm, eventId: event.target.value })}
              >
                <option value="">escolher</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="checkin-mood">Como ficou</label>
              <select
                id="checkin-mood"
                value={checkInForm.mood}
                onChange={(event) => setCheckInForm({ ...checkInForm, mood: event.target.value as CheckInMood })}
              >
                <option value="bem">bem</option>
                <option value="misto">misto</option>
                <option value="atenção">atenção</option>
              </select>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="checkin-note">Nota</label>
            <textarea
              id="checkin-note"
              rows={3}
              value={checkInForm.note}
              onChange={(event) => setCheckInForm({ ...checkInForm, note: event.target.value })}
            />
          </div>
          <div className="field-pair">
            <div className="field-group">
              <label htmlFor="checkin-visibility">Visível para</label>
              <select
                id="checkin-visibility"
                value={checkInForm.visibility}
                onChange={(event) =>
                  setCheckInForm({ ...checkInForm, visibility: event.target.value as CheckInVisibility })
                }
              >
                <option value="admins">admins</option>
                <option value="sponsor">padrinhe</option>
                <option value="comunidade">comunidade</option>
              </select>
            </div>
            <button className="primary-button" type="submit">
              <ClipboardCheck size={17} aria-hidden />
              Guardar
            </button>
          </div>
        </form>

        <form className="surface checkin-panel" onSubmit={handleRoomSubmit}>
          <SurfaceHeader icon={<MessageCircle />} title="Salas temporárias" />
          <div className="field-pair">
            <div className="field-group">
              <label htmlFor="room-event">Evento</label>
              <select
                id="room-event"
                value={roomForm.eventId}
                onChange={(event) => setRoomForm({ ...roomForm, eventId: event.target.value })}
              >
                <option value="">escolher</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="room-expires">Expira</label>
              <input
                id="room-expires"
                type="datetime-local"
                value={roomForm.expiresAt}
                onChange={(event) => setRoomForm({ ...roomForm, expiresAt: event.target.value })}
              />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="room-name">Nome</label>
            <input
              id="room-name"
              value={roomForm.name}
              onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="room-purpose">Propósito</label>
            <input
              id="room-purpose"
              value={roomForm.purpose}
              onChange={(event) => setRoomForm({ ...roomForm, purpose: event.target.value })}
            />
          </div>
          <button className="primary-button" type="submit">
            <Plus size={17} aria-hidden />
            Criar sala
          </button>
        </form>

        {events.map((event) => {
          const attending = event.attendeeIds.includes(currentMember.id);
          const canDelete = currentMember.role === "admin" || event.createdBy === currentMember.id;
          const checkIns = eventCheckIns.filter((checkIn) => checkIn.eventId === event.id);
          const moodCounts = countMoods(checkIns);
          const rooms = eventRooms.filter((room) => room.eventId === event.id);
          const visibleAttendeeIds = event.attendeeIds.slice(0, 3);
          const hiddenAttendeeCount = Math.max(event.attendeeIds.length - visibleAttendeeIds.length, 0);
          return (
            <article className="surface event-card" key={event.id}>
              <time dateTime={event.startsAt}>
                <strong>{formatDay(event.startsAt)}</strong>
                <span>{formatMonth(event.startsAt)}</span>
              </time>
              <div className="event-card-main">
                <header>
                  <h3>{event.title}</h3>
                  <span className="small-pill">{groupById.get(event.groupId)?.name}</span>
                </header>
                <p>
                  {formatTime(event.startsAt)} · {event.place}
                </p>
                <div className="event-boundaries">
                  <span>{event.vibe}</span>
                  <span>{event.photoPolicy}</span>
                </div>
                {(event.boundaryNotes || event.aftercarePrompt) && (
                  <div className="event-notes">
                    {event.boundaryNotes && <p>{event.boundaryNotes}</p>}
                    {event.aftercarePrompt && <p>{event.aftercarePrompt}</p>}
                  </div>
                )}
                <div className="attendee-row">
                  {visibleAttendeeIds.map((id) => (
                    <span key={id}>{memberById.get(id)?.name}</span>
                  ))}
                  {hiddenAttendeeCount > 0 && <span>+{hiddenAttendeeCount}</span>}
                </div>
                {checkIns.length > 0 && (
                  <div className="checkin-summary">
                    <span>{moodCounts.bem} bem</span>
                    <span>{moodCounts.misto} misto</span>
                    <span>{moodCounts.atenção} atenção</span>
                  </div>
                )}
                {rooms.length > 0 && (
                  <div className="event-room-list">
                    {rooms.map((room) => (
                      <div className="event-room-chip" key={room.id}>
                        <MessageCircle size={14} aria-hidden />
                        <span>{room.name}</span>
                        <small>{formatExpiry(room.expiresAt)}</small>
                        {(currentMember.role === "admin" || room.createdBy === currentMember.id) && (
                          <button
                            className="icon-only compact danger"
                            type="button"
                            onClick={() => deleteEventRoom(room.id)}
                            title="Eliminar sala"
                          >
                            <X size={13} aria-hidden />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="event-actions">
                <button
                  className={attending ? "secondary-button selected" : "secondary-button"}
                  type="button"
                  onClick={() => toggleRsvp(event.id)}
                >
                  <Check size={16} aria-hidden />
                  {attending ? "Presente" : "Confirmar"}
                </button>
                {canDelete && (
                  <button
                    className="icon-only danger"
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Eliminar "${event.title}"?`)) {
                        deleteEvent(event.id);
                      }
                    }}
                    title="Eliminar evento"
                  >
                    <Trash2 size={17} aria-hidden />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

function DocsView({
  docs,
  decisions,
  members,
  currentMember,
  memberById,
  search,
  setSearch,
  selectedCitation,
  setSelectedCitation,
  addDoc,
  addDecision,
  voteDecision,
  deleteDecision,
  deleteDoc,
  copyText,
  showNotice,
}: {
  docs: CommunityDoc[];
  decisions: DecisionRecord[];
  members: Member[];
  currentMember: Member;
  memberById: Map<string, Member>;
  search: string;
  setSearch: (value: string) => void;
  selectedCitation: string;
  setSelectedCitation: (code: string) => void;
  addDoc: (input: { title: string; summary: string; tags: string }) => Promise<boolean>;
  addDecision: (input: {
    title: string;
    summary: string;
    outcome: string;
    status: DecisionStatus;
  }) => Promise<boolean>;
  voteDecision: (decisionId: string, vote: DecisionVote) => Promise<void>;
  deleteDecision: (decisionId: string) => Promise<void>;
  deleteDoc: (docId: string) => Promise<void>;
  copyText: (value: string, message: string) => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const [form, setForm] = useState({ title: "", summary: "", tags: "" });
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    summary: "",
    outcome: "",
    status: "aberta" as DecisionStatus,
  });
  const [voteNotes, setVoteNotes] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.summary.trim()) return;
    const created = await addDoc(form);
    if (created) {
      setForm({ title: "", summary: "", tags: "" });
    }
  }

  async function handleDecisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decisionForm.title.trim() || !decisionForm.summary.trim() || !decisionForm.outcome.trim()) return;
    const created = await addDecision(decisionForm);
    if (created) {
      setDecisionForm({ title: "", summary: "", outcome: "", status: "aberta" });
    }
  }

  return (
    <section className="docs-layout">
      <div className="surface doc-search-panel">
        <div className="search-box">
          <Search size={18} aria-hidden />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por código, tema ou texto"
          />
        </div>
        <div className="decision-list">
          {decisions.map((decision) => {
            const ownVote = decision.votes.find((vote) => vote.memberId === currentMember.id);
            const canDelete = currentMember.role === "admin" || decision.createdBy === currentMember.id;
            const voteCounts = countDecisionVotes(decision.votes);
            return (
              <article className={`decision-row ${selectedCitation === decision.code ? "selected" : ""}`} key={decision.id}>
                <div>
                  <span className="doc-code">{decision.code}</span>
                  <h3>{decision.title}</h3>
                  <p>{decision.summary}</p>
                  <blockquote>{decision.outcome}</blockquote>
                  <footer>
                    <span>{decision.status}</span>
                    <span>{voteCounts.sim} sim</span>
                    <span>{voteCounts.não} não</span>
                    <span>{voteCounts.abstenção} abs.</span>
                    <span>{voteCounts.bloqueio} bloqueio</span>
                  </footer>
                  <div className="vote-row">
                    {(["sim", "não", "abstenção", "bloqueio"] as DecisionVoteValue[]).map((value) => (
                      <button
                        key={value}
                        className={ownVote?.value === value ? "secondary-button selected" : "secondary-button"}
                        type="button"
                        onClick={() =>
                          voteDecision(decision.id, {
                            memberId: currentMember.id,
                            value,
                            note: voteNotes[decision.id] ?? ownVote?.note ?? "",
                          })
                        }
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <input
                    value={voteNotes[decision.id] ?? ownVote?.note ?? ""}
                    onChange={(event) => setVoteNotes({ ...voteNotes, [decision.id]: event.target.value })}
                    placeholder="nota de voto"
                  />
                </div>
                <div className="doc-actions">
                  <button
                    className="icon-only"
                    type="button"
                    onClick={() => {
                      setSelectedCitation(decision.code);
                      showNotice(`${decision.code} selecionada para o chat.`);
                    }}
                    title="Usar no chat"
                  >
                    <Link2 size={17} aria-hidden />
                  </button>
                  <button
                    className="icon-only"
                    type="button"
                    onClick={() => copyText(decision.code, `${decision.code} copiada.`)}
                    title="Copiar código"
                  >
                    <Copy size={17} aria-hidden />
                  </button>
                  {canDelete && (
                    <button
                      className="icon-only danger"
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Eliminar "${decision.title}"?`)) {
                          deleteDecision(decision.id);
                        }
                      }}
                      title="Eliminar decisão"
                    >
                      <Trash2 size={17} aria-hidden />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <div className="doc-list">
          {docs.map((doc) => {
            const canDelete = currentMember.role === "admin" || doc.ownerId === currentMember.id;
            return (
              <article className={`doc-row ${selectedCitation === doc.code ? "selected" : ""}`} key={doc.id}>
                <div>
                  <span className="doc-code">{doc.code}</span>
                  <h3>{doc.title}</h3>
                  <p>{doc.summary}</p>
                  <footer>
                    {doc.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </footer>
                </div>
                <div className="doc-actions">
                  <button
                    className="icon-only"
                    type="button"
                    onClick={() => {
                      setSelectedCitation(doc.code);
                      showNotice(`${doc.code} selecionado para o chat.`);
                    }}
                    title="Usar no chat"
                  >
                    <Link2 size={17} aria-hidden />
                  </button>
                  <button
                    className="icon-only"
                    type="button"
                    onClick={() => copyText(doc.code, `${doc.code} copiado.`)}
                    title="Copiar código"
                  >
                    <Copy size={17} aria-hidden />
                  </button>
                  {canDelete && (
                    <button
                      className="icon-only danger"
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Eliminar "${doc.title}"?`)) {
                          deleteDoc(doc.id);
                        }
                      }}
                      title="Eliminar doc"
                    >
                      <Trash2 size={17} aria-hidden />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="memory-forms">
        <form className="surface form-panel" onSubmit={handleDecisionSubmit}>
          <h3>Nova decisão</h3>
          <div className="field-group">
            <label htmlFor="decision-title">Título</label>
            <input
              id="decision-title"
              value={decisionForm.title}
              onChange={(event) => setDecisionForm({ ...decisionForm, title: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="decision-summary">Ata curta</label>
            <textarea
              id="decision-summary"
              rows={4}
              value={decisionForm.summary}
              onChange={(event) => setDecisionForm({ ...decisionForm, summary: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="decision-outcome">Decisão final</label>
            <textarea
              id="decision-outcome"
              rows={4}
              value={decisionForm.outcome}
              onChange={(event) => setDecisionForm({ ...decisionForm, outcome: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="decision-status">Estado</label>
            <select
              id="decision-status"
              value={decisionForm.status}
              onChange={(event) => setDecisionForm({ ...decisionForm, status: event.target.value as DecisionStatus })}
            >
              <option value="rascunho">rascunho</option>
              <option value="aberta">aberta</option>
              <option value="decidida">decidida</option>
            </select>
          </div>
          <button className="primary-button" type="submit">
            <Vote size={17} aria-hidden />
            Guardar decisão
          </button>
        </form>

        <form className="surface form-panel" onSubmit={handleSubmit}>
          <h3>Nova conclusão</h3>
        <div className="field-group">
          <label htmlFor="doc-title">Título</label>
          <input id="doc-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </div>
        <div className="field-group">
          <label htmlFor="doc-summary">Texto</label>
          <textarea
            id="doc-summary"
            rows={7}
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="doc-tags">Etiquetas</label>
          <input id="doc-tags" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
        </div>
        <p className="form-note">Autoria: {memberById.get(currentMember.id)?.name ?? "comunidade"}</p>
        <button className="primary-button" type="submit">
          <FilePlus2 size={17} aria-hidden />
          Guardar doc
        </button>
        </form>
      </div>
    </section>
  );
}

function ConnectionsView({
  members,
  currentMember,
  memberById,
  intentions,
  introductions,
  interests,
  relationships,
  privacySettings,
  deviceKeys,
  updateIntention,
  requestIntroduction,
  updateIntroductionStatus,
  toggleInterest,
  addRelationship,
  deleteRelationship,
  updatePrivacySettings,
}: {
  members: Member[];
  currentMember: Member;
  memberById: Map<string, Member>;
  intentions: MemberIntention[];
  introductions: WarmIntroduction[];
  interests: MutualInterest[];
  relationships: RelationshipLink[];
  privacySettings: PrivacySettings;
  deviceKeys: DeviceKey[];
  updateIntention: (input: { kinds: IntentionKind[]; note: string }) => Promise<boolean>;
  requestIntroduction: (input: { targetId: string; connectorId: string; note: string }) => Promise<boolean>;
  updateIntroductionStatus: (introductionId: string, status: IntroductionStatus) => Promise<void>;
  toggleInterest: (input: { targetId: string; kind: InterestKind }) => Promise<void>;
  addRelationship: (input: {
    relatedMemberId: string;
    label: string;
    visibility: RelationshipVisibility;
  }) => Promise<boolean>;
  deleteRelationship: (relationshipId: string) => Promise<void>;
  updatePrivacySettings: (input: PrivacySettings) => Promise<boolean>;
}) {
  const otherMembers = members.filter((member) => member.id !== currentMember.id);
  const ownIntention = intentions.find((intention) => intention.memberId === currentMember.id);
  const [intentionForm, setIntentionForm] = useState({
    kinds: ownIntention?.kinds ?? (["amizades", "eventos"] as IntentionKind[]),
    note: ownIntention?.note ?? "",
  });
  const [introForm, setIntroForm] = useState({
    targetId: otherMembers[0]?.id ?? "",
    connectorId: currentMember.sponsorId ?? otherMembers[0]?.id ?? currentMember.id,
    note: "",
  });
  const [relationshipForm, setRelationshipForm] = useState({
    relatedMemberId: otherMembers[0]?.id ?? "",
    label: "",
    visibility: "comunidade" as RelationshipVisibility,
  });
  const [privacyForm, setPrivacyForm] = useState(privacySettings);
  const [activeTab, setActiveTab] = useState<ConnectionTab>("intencoes");

  useEffect(() => {
    setIntentionForm({
      kinds: ownIntention?.kinds ?? ["amizades", "eventos"],
      note: ownIntention?.note ?? "",
    });
  }, [ownIntention?.memberId, ownIntention?.note, ownIntention?.kinds.join("|")]);

  useEffect(() => {
    setPrivacyForm(privacySettings);
  }, [privacySettings]);

  function toggleIntention(kind: IntentionKind) {
    setIntentionForm((current) => ({
      ...current,
      kinds: current.kinds.includes(kind)
        ? current.kinds.filter((candidate) => candidate !== kind)
        : [...current.kinds, kind],
    }));
  }

  async function handleIntentionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateIntention(intentionForm);
  }

  async function handleIntroSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await requestIntroduction(introForm);
    if (created) setIntroForm((current) => ({ ...current, note: "" }));
  }

  async function handleRelationshipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await addRelationship(relationshipForm);
    if (created) setRelationshipForm((current) => ({ ...current, label: "" }));
  }

  async function handlePrivacySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updatePrivacySettings(privacyForm);
  }

  const mutualMatches = interests.filter(
    (interest) =>
      interest.fromId === currentMember.id &&
      interests.some(
        (candidate) =>
          candidate.fromId === interest.toId &&
          candidate.toId === currentMember.id &&
          candidate.kind === interest.kind,
      ),
  );

  const visibleRelationships = relationships.filter(
    (relationship) =>
      relationship.visibility === "comunidade" ||
      relationship.memberId === currentMember.id ||
      relationship.relatedMemberId === currentMember.id ||
      currentMember.role === "admin",
  );
  const tabs: { id: ConnectionTab; label: string; icon: React.ReactNode }[] = [
    { id: "intencoes", label: "Intenções", icon: <Heart size={15} aria-hidden /> },
    { id: "intros", label: "Intros", icon: <UserPlus size={15} aria-hidden /> },
    { id: "interesses", label: "Interesses", icon: <HeartHandshake size={15} aria-hidden /> },
    { id: "privacidade", label: "Privacidade", icon: <RadioTower size={15} aria-hidden /> },
  ];

  return (
    <section className="connections-layout compact-connections">
      <div className="connection-tabs surface" role="tablist" aria-label="Conexões">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "secondary-button selected" : "secondary-button"}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "intencoes" && (
      <form className="surface form-panel" onSubmit={handleIntentionSubmit}>
        <SurfaceHeader icon={<Heart />} title="Intenções" />
        <div className="intention-grid">
          {(["amizades", "dates", "flirt", "eventos", "indisponível", "só intro"] as IntentionKind[]).map((kind) => (
            <button
              key={kind}
              className={intentionForm.kinds.includes(kind) ? "secondary-button selected" : "secondary-button"}
              type="button"
              onClick={() => toggleIntention(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
        <div className="field-group">
          <label htmlFor="intention-note">Nota</label>
          <textarea
            id="intention-note"
            rows={3}
            value={intentionForm.note}
            onChange={(event) => setIntentionForm({ ...intentionForm, note: event.target.value })}
          />
        </div>
        <button className="primary-button" type="submit">
          <Check size={17} aria-hidden />
          Atualizar
        </button>

        <div className="connection-card-list">
          {members.map((member) => {
            const intention = intentions.find((candidate) => candidate.memberId === member.id);
            return (
              <article className="connection-card" key={member.id}>
                <header>
                  <MemberAvatar member={member} />
                  <div>
                    <h3>{member.name}</h3>
                    <p>{intention?.note || "sem nota"}</p>
                  </div>
                </header>
                <footer>
                  {(intention?.kinds.length ? intention.kinds : ["por preencher"]).map((kind) => (
                    <span key={kind}>{kind}</span>
                  ))}
                </footer>
                <DeviceFingerprintList member={member} deviceKeys={deviceKeys} compact />
              </article>
            );
          })}
        </div>
      </form>
      )}

      {activeTab === "intros" && (
      <section className="connection-stack">
        <form className="surface form-panel" onSubmit={handleIntroSubmit}>
          <SurfaceHeader icon={<UserPlus />} title="Apresentação quente" />
          <div className="field-pair">
            <div className="field-group">
              <label htmlFor="intro-target">Pessoa</label>
              <select
                id="intro-target"
                value={introForm.targetId}
                onChange={(event) => setIntroForm({ ...introForm, targetId: event.target.value })}
              >
                {otherMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="intro-connector">Ponte</label>
              <select
                id="intro-connector"
                value={introForm.connectorId}
                onChange={(event) => setIntroForm({ ...introForm, connectorId: event.target.value })}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="intro-note">Contexto</label>
            <textarea
              id="intro-note"
              rows={3}
              value={introForm.note}
              onChange={(event) => setIntroForm({ ...introForm, note: event.target.value })}
            />
          </div>
          <button className="primary-button" type="submit">
            <UserPlus size={17} aria-hidden />
            Pedir intro
          </button>
        </form>

        <section className="surface">
          <SurfaceHeader icon={<HeartHandshake />} title="Pedidos" />
          <div className="connection-card-list">
            {introductions.map((introduction) => {
              const requester = memberById.get(introduction.requesterId);
              const target = memberById.get(introduction.targetId);
              const connector = memberById.get(introduction.connectorId);
              const canRespond =
                [introduction.targetId, introduction.connectorId, introduction.requesterId].includes(currentMember.id) ||
                currentMember.role === "admin";
              return (
                <article className="connection-card" key={introduction.id}>
                  <header>
                    <UserPlus size={18} aria-hidden />
                    <div>
                      <h3>{requester?.name} → {target?.name}</h3>
                      <p>Ponte: {connector?.name}</p>
                    </div>
                    <span className="small-pill">{introduction.status}</span>
                  </header>
                  {introduction.note && <p>{introduction.note}</p>}
                  {canRespond && (
                    <div className="mini-actions">
                      {(["aceite", "recusado", "aberto"] as IntroductionStatus[]).map((status) => (
                        <button
                          key={status}
                          className={introduction.status === status ? "secondary-button selected" : "secondary-button"}
                          type="button"
                          onClick={() => updateIntroductionStatus(introduction.id, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </section>
      )}

      {activeTab === "interesses" && (
      <section className="connection-stack">
        <section className="surface">
          <SurfaceHeader icon={<Heart />} title="Interesse mútuo" />
          <div className="interest-grid">
            {otherMembers.map((member) => (
              <article className="connection-card" key={member.id}>
                <header>
                  <MemberAvatar member={member} />
                  <div>
                    <h3>{member.name}</h3>
                    <p>{member.relationshipContext || member.pronouns}</p>
                  </div>
                </header>
                <div className="mini-actions">
                  {(["amizade", "date", "flirt", "evento"] as InterestKind[]).map((kind) => {
                    const active = interests.some(
                      (interest) =>
                        interest.fromId === currentMember.id &&
                        interest.toId === member.id &&
                        interest.kind === kind,
                    );
                    const mutual = active && interests.some(
                      (interest) =>
                        interest.fromId === member.id &&
                        interest.toId === currentMember.id &&
                        interest.kind === kind,
                    );
                    return (
                      <button
                        key={kind}
                        className={active ? "secondary-button selected" : "secondary-button"}
                        type="button"
                        onClick={() => toggleInterest({ targetId: member.id, kind })}
                      >
                        {mutual ? `${kind} ✓` : kind}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
          {mutualMatches.length > 0 && (
            <div className="match-strip">
              {mutualMatches.map((match) => (
                <span key={match.id}>
                  {memberById.get(match.toId)?.name} · {match.kind}
                </span>
              ))}
            </div>
          )}
        </section>

        <form className="surface form-panel" onSubmit={handleRelationshipSubmit}>
          <SurfaceHeader icon={<GitBranch />} title="Constelação" />
          <div className="field-pair">
            <div className="field-group">
              <label htmlFor="rel-member">Pessoa</label>
              <select
                id="rel-member"
                value={relationshipForm.relatedMemberId}
                onChange={(event) => setRelationshipForm({ ...relationshipForm, relatedMemberId: event.target.value })}
              >
                {otherMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="rel-visibility">Visibilidade</label>
              <select
                id="rel-visibility"
                value={relationshipForm.visibility}
                onChange={(event) =>
                  setRelationshipForm({ ...relationshipForm, visibility: event.target.value as RelationshipVisibility })
                }
              >
                <option value="privado">privado</option>
                <option value="conexões">conexões</option>
                <option value="comunidade">comunidade</option>
              </select>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="rel-label">Ligação</label>
            <input
              id="rel-label"
              value={relationshipForm.label}
              onChange={(event) => setRelationshipForm({ ...relationshipForm, label: event.target.value })}
            />
          </div>
          <button className="primary-button" type="submit">
            <GitBranch size={17} aria-hidden />
            Adicionar
          </button>
          <div className="relationship-list">
            {visibleRelationships.map((relationship) => (
              <article className="relationship-link" key={relationship.id}>
                <span>{memberById.get(relationship.memberId)?.name}</span>
                <strong>{relationship.label}</strong>
                <span>{memberById.get(relationship.relatedMemberId)?.name}</span>
                {(relationship.memberId === currentMember.id || currentMember.role === "admin") && (
                  <button
                    className="icon-only compact danger"
                    type="button"
                    onClick={() => deleteRelationship(relationship.id)}
                    title="Remover ligação"
                  >
                    <X size={13} aria-hidden />
                  </button>
                )}
              </article>
            ))}
          </div>
        </form>
      </section>
      )}

      {activeTab === "privacidade" && (
      <form className="surface form-panel privacy-panel" onSubmit={handlePrivacySubmit}>
        <SurfaceHeader icon={<RadioTower />} title="Fundação P2P" />
        <div className="privacy-toggle-list">
          {[
            ["deviceOnlyMessages", "Mensagens só no dispositivo"],
            ["localMediaVault", "Cofre local de media"],
            ["metadataStripping", "Remover metadados"],
            ["p2pReady", "Preparado para P2P"],
          ].map(([key, label]) => (
            <label className="privacy-toggle" key={key}>
              <input
                type="checkbox"
                checked={Boolean(privacyForm[key as keyof PrivacySettings])}
                onChange={(event) => setPrivacyForm({ ...privacyForm, [key]: event.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="field-group">
          <label htmlFor="relay-plan">Plano</label>
          <textarea
            id="relay-plan"
            rows={4}
            value={privacyForm.relayPlan}
            onChange={(event) => setPrivacyForm({ ...privacyForm, relayPlan: event.target.value })}
          />
        </div>
        <button className="primary-button" type="submit">
          <LockKeyhole size={17} aria-hidden />
          Guardar fundação
        </button>
      </form>
      )}
    </section>
  );
}

function GroupsView({
  groups,
  members,
  memberById,
  addGroup,
  toggleGroupMember,
}: {
  groups: Group[];
  members: Member[];
  memberById: Map<string, Member>;
  addGroup: (input: { name: string; focus: string; privacy: GroupPrivacy; stewardId: string }) => Promise<boolean>;
  toggleGroupMember: (groupId: string, memberId: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    focus: "",
    privacy: "convite" as GroupPrivacy,
    stewardId: members[0]?.id ?? "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.focus.trim()) return;
    const created = await addGroup(form);
    if (created) {
      setForm((current) => ({ ...current, name: "", focus: "" }));
    }
  }

  return (
    <section className="groups-layout">
      <form className="surface form-panel" onSubmit={handleSubmit}>
        <h3>Novo subgrupo</h3>
        <div className="field-group">
          <label htmlFor="group-name">Nome</label>
          <input id="group-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div className="field-group">
          <label htmlFor="group-focus">Foco</label>
          <input id="group-focus" value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })} />
        </div>
        <div className="field-pair">
          <div className="field-group">
            <label htmlFor="group-privacy">Visibilidade</label>
            <select
              id="group-privacy"
              value={form.privacy}
              onChange={(event) => setForm({ ...form, privacy: event.target.value as GroupPrivacy })}
            >
              <option value="aberto">aberto</option>
              <option value="convite">convite</option>
              <option value="secreto">secreto</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="group-steward">Admin</label>
            <select id="group-steward" value={form.stewardId} onChange={(event) => setForm({ ...form, stewardId: event.target.value })}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="primary-button" type="submit">
          <Plus size={17} aria-hidden />
          Criar grupo
        </button>
      </form>

      <section className="group-management">
        {groups.map((group) => (
          <article className="surface group-manager" key={group.id}>
            <header>
              <div className="group-dot" style={{ background: group.color }} />
              <div>
                <h3>{group.name}</h3>
                <p>{group.focus}</p>
              </div>
              <span className="small-pill">{group.privacy}</span>
            </header>
            <div className="member-check-grid">
              {members.map((member) => {
                const checked = member.groupIds.includes(group.id);
                return (
                  <label className="member-check" key={member.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroupMember(group.id, member.id)}
                    />
                    <span>{member.name}</span>
                  </label>
                );
              })}
            </div>
            <footer>Admin: {memberById.get(group.stewardId)?.name}</footer>
          </article>
        ))}
      </section>
    </section>
  );
}

function EntrancesView({
  members,
  groups,
  memberById,
  addMember,
  backendMode,
  currentMember,
  inviteCodes,
  createInvite,
  updateConsentCard,
  copyText,
}: {
  members: Member[];
  groups: Group[];
  memberById: Map<string, Member>;
  addMember: (input: { name: string; pronouns: string; sponsorId: string; groupIds: string[] }) => void;
  backendMode?: boolean;
  currentMember: Member;
  inviteCodes: InviteCode[];
  createInvite?: (input: { code: string; role: MemberRole; maxUses: number }) => Promise<boolean>;
  updateConsentCard: (input: {
    memberId: string;
    consentAvailableFor: string;
    consentLimits: string;
    mediaPreference: string;
    relationshipContext: string;
    eventComfort: string;
  }) => Promise<boolean>;
  copyText: (value: string, message: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    pronouns: "",
    sponsorId: members[0]?.id ?? "",
    groupIds: ["g_geral"],
  });
  const [inviteForm, setInviteForm] = useState({
    code: makeInviteCode(),
    role: "nova pessoa" as MemberRole,
    maxUses: 1,
  });
  const [consentForm, setConsentForm] = useState({
    consentAvailableFor: currentMember.consentAvailableFor,
    consentLimits: currentMember.consentLimits,
    mediaPreference: currentMember.mediaPreference,
    relationshipContext: currentMember.relationshipContext,
    eventComfort: currentMember.eventComfort,
  });

  useEffect(() => {
    setConsentForm({
      consentAvailableFor: currentMember.consentAvailableFor,
      consentLimits: currentMember.consentLimits,
      mediaPreference: currentMember.mediaPreference,
      relationshipContext: currentMember.relationshipContext,
      eventComfort: currentMember.eventComfort,
    });
  }, [currentMember]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.sponsorId) return;
    addMember(form);
    setForm((current) => ({ ...current, name: "", pronouns: "" }));
  }

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createInvite) return;
    const created = await createInvite(inviteForm);
    if (created) {
      setInviteForm({ code: makeInviteCode(), role: "nova pessoa", maxUses: 1 });
    }
  }

  async function handleConsentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateConsentCard({ memberId: currentMember.id, ...consentForm });
  }

  return (
    <section className="entrances-layout">
      {backendMode ? (
        <form className="surface form-panel" onSubmit={handleInviteSubmit}>
          <h3>Novo convite</h3>
          <div className="field-group">
            <label htmlFor="invite-new-code">Código</label>
            <div className="copy-field">
              <input
                id="invite-new-code"
                value={inviteForm.code}
                onChange={(event) => setInviteForm({ ...inviteForm, code: event.target.value.toUpperCase() })}
              />
              <button
                className="secondary-button copy-button"
                type="button"
                onClick={() => copyText(inviteForm.code, `Convite ${inviteForm.code} copiado.`)}
              >
                <Copy size={16} aria-hidden />
                Copiar
              </button>
            </div>
          </div>
          <div className="field-pair">
            <div className="field-group">
              <label htmlFor="invite-role">Entrada como</label>
              <select
                id="invite-role"
                value={inviteForm.role}
                onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value as MemberRole })}
              >
                <option value="nova pessoa">nova pessoa</option>
                <option value="membro">membro</option>
                {currentMember.role === "admin" && <option value="admin">admin</option>}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="invite-uses">Usos</label>
              <input
                id="invite-uses"
                type="number"
                min={1}
                max={20}
                value={inviteForm.maxUses}
                onChange={(event) => setInviteForm({ ...inviteForm, maxUses: Number(event.target.value) })}
              />
            </div>
          </div>
          <p className="form-note">Apadrinhade por: {currentMember.name}</p>
          <button className="primary-button" type="submit">
            <HandHeart size={17} aria-hidden />
            Criar convite
          </button>

          <div className="invite-code-list">
            {inviteCodes.map((invite) => (
              <article className="invite-code-row" key={invite.code}>
                <strong>{invite.code}</strong>
                <div className="invite-code-actions">
                  <span>{invite.uses}/{invite.maxUses}</span>
                  <button
                    className="icon-only compact"
                    type="button"
                    onClick={() => copyText(invite.code, `Convite ${invite.code} copiado.`)}
                    title="Copiar convite"
                  >
                    <Copy size={15} aria-hidden />
                  </button>
                </div>
                <small>{memberById.get(invite.sponsorId ?? "")?.name ?? "sem padrinho"}</small>
              </article>
            ))}
          </div>
        </form>
      ) : (
        <form className="surface form-panel" onSubmit={handleSubmit}>
          <h3>Entrada por convite</h3>
          <div className="field-group">
            <label htmlFor="new-member-name">Nome</label>
            <input
              id="new-member-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="new-member-pronouns">Pronomes</label>
            <input
              id="new-member-pronouns"
              value={form.pronouns}
              onChange={(event) => setForm({ ...form, pronouns: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="sponsor">Apadrinhade por</label>
            <select
              id="sponsor"
              value={form.sponsorId}
              onChange={(event) => setForm({ ...form, sponsorId: event.target.value })}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="check-fieldset">
            <legend>Grupos iniciais</legend>
            {groups.map((group) => (
              <label key={group.id}>
                <input
                  type="checkbox"
                  checked={form.groupIds.includes(group.id)}
                  onChange={() => {
                    const nextGroupIds = form.groupIds.includes(group.id)
                      ? form.groupIds.filter((id) => id !== group.id)
                      : [...form.groupIds, group.id];
                    setForm({ ...form, groupIds: nextGroupIds });
                  }}
                />
                {group.name}
              </label>
            ))}
          </fieldset>
          <button className="primary-button" type="submit">
            <HandHeart size={17} aria-hidden />
            Vincular entrada
          </button>
        </form>
      )}

      <section className="surface sponsor-map">
        <SurfaceHeader icon={<Network />} title="Nomes vinculados" />
        <div className="lineage-list">
          {members.map((member) => {
            const sponsor = member.sponsorId ? memberById.get(member.sponsorId) : undefined;
            const invitees = members.filter((candidate) => candidate.sponsorId === member.id);
            return (
              <article className="lineage-row" key={member.id}>
                <MemberAvatar member={member} />
                <div>
                  <h3>{member.name}</h3>
                  <p>{sponsor ? `${sponsor.name} → ${member.name}` : "sem convite anterior"}</p>
                  {invitees.length > 0 && (
                    <div className="invitee-row">
                      {invitees.map((invitee) => (
                        <span key={invitee.id}>{invitee.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight size={18} aria-hidden />
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface consent-board">
        <SurfaceHeader icon={<HeartHandshake />} title="Cartões de consentimento" />
        <form className="consent-editor" onSubmit={handleConsentSubmit}>
          <div className="field-group">
            <label htmlFor="consent-available">Disponível para</label>
            <input
              id="consent-available"
              value={consentForm.consentAvailableFor}
              onChange={(event) => setConsentForm({ ...consentForm, consentAvailableFor: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="consent-limits">Limites</label>
            <input
              id="consent-limits"
              value={consentForm.consentLimits}
              onChange={(event) => setConsentForm({ ...consentForm, consentLimits: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="consent-media">Media íntima</label>
            <input
              id="consent-media"
              value={consentForm.mediaPreference}
              onChange={(event) => setConsentForm({ ...consentForm, mediaPreference: event.target.value })}
            />
          </div>
          <div className="field-pair">
            <div className="field-group">
              <label htmlFor="consent-context">Contexto</label>
              <input
                id="consent-context"
                value={consentForm.relationshipContext}
                onChange={(event) => setConsentForm({ ...consentForm, relationshipContext: event.target.value })}
              />
            </div>
            <div className="field-group">
              <label htmlFor="consent-events">Eventos</label>
              <input
                id="consent-events"
                value={consentForm.eventComfort}
                onChange={(event) => setConsentForm({ ...consentForm, eventComfort: event.target.value })}
              />
            </div>
          </div>
          <button className="primary-button" type="submit">
            <ShieldCheck size={17} aria-hidden />
            Atualizar cartão
          </button>
        </form>
        <div className="consent-card-list">
          {members.map((member) => (
            <article className="consent-card" key={member.id}>
              <header>
                <MemberAvatar member={member} />
                <div>
                  <h3>{member.name}</h3>
                  <p>{member.pronouns}</p>
                </div>
              </header>
              <dl>
                <div>
                  <dt>Disponível</dt>
                  <dd>{member.consentAvailableFor || "por preencher"}</dd>
                </div>
                <div>
                  <dt>Limites</dt>
                  <dd>{member.consentLimits || "por preencher"}</dd>
                </div>
                <div>
                  <dt>Media</dt>
                  <dd>{member.mediaPreference || "por preencher"}</dd>
                </div>
                <div>
                  <dt>Eventos</dt>
                  <dd>{member.eventComfort || "por preencher"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function AdminView({
  members,
  groups,
  events,
  eventRooms,
  eventCheckIns,
  docs,
  decisions,
  messages,
  reports,
  auditLogs,
  inviteCodes,
  introductions,
  privacySettings,
  currentMember,
  memberById,
  groupById,
  updateMemberRole,
  toggleMemberStatus,
  updateIntroductionStatus,
  deleteMessage,
  deleteEvent,
  deleteEventRoom,
  deleteDoc,
  deleteDecision,
  updateReport,
  setMemberSuspension,
  setActiveNav,
}: {
  members: Member[];
  groups: Group[];
  events: EventItem[];
  eventRooms: EventRoom[];
  eventCheckIns: EventCheckIn[];
  docs: CommunityDoc[];
  decisions: DecisionRecord[];
  messages: ChatMessage[];
  reports: SafetyReport[];
  auditLogs: AdminAuditLog[];
  inviteCodes: InviteCode[];
  introductions: WarmIntroduction[];
  privacySettings: PrivacySettings;
  currentMember: Member;
  memberById: Map<string, Member>;
  groupById: Map<string, Group>;
  updateMemberRole: (memberId: string, role: MemberRole) => Promise<void>;
  toggleMemberStatus: (memberId: string) => Promise<void>;
  updateIntroductionStatus: (introductionId: string, status: IntroductionStatus) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  deleteEventRoom: (roomId: string) => Promise<void>;
  deleteDoc: (docId: string) => Promise<void>;
  deleteDecision: (decisionId: string) => Promise<void>;
  updateReport: (
    reportId: string,
    patch: Partial<Pick<SafetyReport, "status" | "severity" | "assigneeId" | "internalNotes">>,
  ) => Promise<void>;
  setMemberSuspension: (memberId: string, suspendedUntil: string | null) => Promise<void>;
  setActiveNav: (nav: NavKey) => void;
}) {
  const now = Date.now();
  const newMembers = members.filter((member) => member.role === "nova pessoa");
  const pendingIntroductions = introductions.filter((intro) => intro.status === "pedido");
  const attentionCheckIns = eventCheckIns.filter((checkIn) => checkIn.mood !== "bem");
  const openDecisions = decisions.filter((decision) => decision.status !== "decidida");
  const sensitiveMessages = messages.filter(
    (message) =>
      message.encryptionVersion > 0 ||
      message.imagePath ||
      message.imageUrl ||
      message.imageViewOnce ||
      message.imageConsentRequired,
  );
  const missingConsent = members.filter(
    (member) => !member.consentAvailableFor || !member.consentLimits || !member.mediaPreference,
  );
  const expiredRooms = eventRooms.filter((room) => new Date(room.expiresAt).getTime() < now);
  const activeRooms = eventRooms.filter((room) => new Date(room.expiresAt).getTime() >= now);
  const fullEvents = events.filter((event) => event.attendeeIds.length >= event.capacity);
  const usedInvites = inviteCodes.filter((invite) => invite.uses >= invite.maxUses);
  const openReports = reports.filter((report) => report.status !== "resolvido" && report.status !== "arquivado");
  const urgentReports = openReports.filter((report) => report.severity === "urgente" || report.severity === "alta");
  const suspendedMembers = members.filter(isMemberSuspended);
  const riskQueue = [
    ...urgentReports.map((report) => ({
      id: `report-${report.id}`,
      tone: "danger",
      title: `${reportSeverityLabels[report.severity]}: ${report.summary}`,
      detail: `${memberById.get(report.reporterId)?.name ?? "Pessoa"} · ${reportCategoryLabels[report.category]}`,
      action: "Triagem",
      onAction: () => updateReport(report.id, { status: "triagem", assigneeId: currentMember.id }),
    })),
    ...newMembers.map((member) => ({
      id: `member-${member.id}`,
      tone: "warm",
      title: `Nova entrada: ${member.name}`,
      detail: `Padrinhe: ${member.sponsorId ? memberById.get(member.sponsorId)?.name : "sem vínculo"}`,
      action: "Entradas",
      onAction: () => setActiveNav("comunidade"),
    })),
    ...pendingIntroductions.map((intro) => ({
      id: `intro-${intro.id}`,
      tone: "trust",
      title: `${memberById.get(intro.requesterId)?.name} pediu apresentação`,
      detail: `${memberById.get(intro.targetId)?.name} via ${memberById.get(intro.connectorId)?.name}`,
      action: "Aceitar",
      onAction: () => updateIntroductionStatus(intro.id, "aceite"),
    })),
    ...attentionCheckIns.map((checkIn) => ({
      id: `check-${checkIn.id}`,
      tone: "danger",
      title: `${memberById.get(checkIn.memberId)?.name} marcou ${checkIn.mood}`,
      detail: `${events.find((event) => event.id === checkIn.eventId)?.title ?? "Evento"} · ${checkIn.note || "sem nota"}`,
      action: "Eventos",
      onAction: () => setActiveNav("agenda"),
    })),
    ...openDecisions.map((decision) => ({
      id: `decision-${decision.id}`,
      tone: "trust",
      title: `${decision.code} ainda ${decision.status}`,
      detail: decision.title,
      action: "Memória",
      onAction: () => setActiveNav("memoria"),
    })),
    ...expiredRooms.map((room) => ({
      id: `room-${room.id}`,
      tone: "warm",
      title: `Sala expirada: ${room.name}`,
      detail: events.find((event) => event.id === room.eventId)?.title ?? "Evento",
      action: "Apagar",
      onAction: () => deleteEventRoom(room.id),
    })),
    ...missingConsent.slice(0, 4).map((member) => ({
      id: `consent-${member.id}`,
      tone: "quiet",
      title: `${member.name} tem cartão incompleto`,
      detail: "Faltam limites, disponibilidade ou media.",
      action: "Entradas",
      onAction: () => setActiveNav("comunidade"),
    })),
  ];

  const recentMessages = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const recentDocs = [...docs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const recentDecisions = [...decisions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const soonEvents = events.slice(0, 5);
  const moderationIdeas = [
    "Registo de incidentes com estado, severidade e responsáveis.",
    "Botão de pedido de ajuda discreto para novas pessoas.",
    "Audit log para alterações admin e apagamentos.",
    "Modo apresentação que esconde media, notas sensíveis e nomes reais.",
    "Checklist de onboarding antes de alguém poder entrar em salas íntimas.",
    "Relatórios mensais de saúde: entradas, saídas, conflitos, decisões abertas.",
  ];

  return (
    <section className="admin-layout">
      <div className="metric-row admin-metrics">
        <Metric icon={<Users />} label="Membros" value={members.length} accent="#176b63" />
        <Metric icon={<HandHeart />} label="Novas entradas" value={newMembers.length} accent="#9a5a20" />
        <Metric icon={<HeartHandshake />} label="Casos abertos" value={openReports.length} accent="#5457a6" />
        <Metric icon={<ShieldCheck />} label="Itens atenção" value={riskQueue.length} accent="#c4493d" />
      </div>

      <section className="admin-grid">
        <section className="surface admin-panel moderation-queue">
          <SurfaceHeader icon={<ShieldCheck />} title="Fila de moderação" />
          <div className="admin-alert-list">
            {riskQueue.length === 0 ? (
              <p className="empty-note">Nada urgente neste momento.</p>
            ) : (
              riskQueue.slice(0, 10).map((item) => (
                <article className={`admin-alert ${item.tone}`} key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <button className="secondary-button" type="button" onClick={item.onAction}>
                    {item.action}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="surface admin-panel">
          <SurfaceHeader icon={<RadioTower />} title="Saúde da plataforma" />
          <div className="admin-health-grid">
            <article>
              <strong>{activeRooms.length}</strong>
              <span>salas temporárias activas</span>
            </article>
            <article>
              <strong>{suspendedMembers.length}</strong>
              <span>contas suspensas</span>
            </article>
            <article>
              <strong>{sensitiveMessages.length}</strong>
              <span>media sensível</span>
            </article>
            <article>
              <strong>{fullEvents.length}</strong>
              <span>eventos no limite</span>
            </article>
            <article>
              <strong>{usedInvites.length}</strong>
              <span>convites esgotados</span>
            </article>
          </div>
          <div className="privacy-status-list">
            <span className={privacySettings.deviceOnlyMessages ? "ok" : ""}>Mensagens só no dispositivo</span>
            <span className={privacySettings.localMediaVault ? "ok" : ""}>Cofre local de media</span>
            <span className={privacySettings.metadataStripping ? "ok" : ""}>Remoção de metadados</span>
            <span className={privacySettings.p2pReady ? "ok" : ""}>Pronto para P2P</span>
          </div>
        </section>
      </section>

      <section className="admin-grid wide-left">
        <section className="surface admin-panel">
          <SurfaceHeader icon={<Flag />} title="Casos de segurança" />
          <div className="admin-content-list">
            {openReports.length === 0 ? (
              <p className="empty-note">Sem casos abertos.</p>
            ) : (
              openReports.map((report) => (
                <article className={`admin-content-row report-admin-row ${report.severity}`} key={report.id}>
                  <div>
                    <strong>{report.summary}</strong>
                    <span>
                      {memberById.get(report.reporterId)?.name ?? "Pessoa"} ·{" "}
                      {report.subjectMemberId ? `sobre ${memberById.get(report.subjectMemberId)?.name ?? "pessoa"}` : "sem pessoa específica"}
                    </span>
                    <p>{report.details || "sem detalhe"}</p>
                    <div className="admin-tags">
                      <span>{reportCategoryLabels[report.category]}</span>
                      <span>{reportSeverityLabels[report.severity]}</span>
                      <span>{reportStatusLabels[report.status]}</span>
                      {report.roomId && <span>{groupById.get(report.roomId)?.name ?? "sala"}</span>}
                    </div>
                    <textarea
                      className="admin-notes-input"
                      defaultValue={report.internalNotes}
                      rows={2}
                      placeholder="Notas internas"
                      onBlur={(event) => updateReport(report.id, { internalNotes: event.target.value })}
                    />
                  </div>
                  <div className="admin-case-actions">
                    <select
                      value={report.status}
                      aria-label="Estado do caso"
                      onChange={(event) => updateReport(report.id, { status: event.target.value as ReportStatus })}
                    >
                      {reportStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={report.severity}
                      aria-label="Severidade do caso"
                      onChange={(event) => updateReport(report.id, { severity: event.target.value as ReportSeverity })}
                    >
                      {reportSeverityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => updateReport(report.id, { status: "triagem", assigneeId: currentMember.id })}
                    >
                      Assumir
                    </button>
                    <button
                      className="secondary-button selected"
                      type="button"
                      onClick={() => updateReport(report.id, { status: "resolvido" })}
                    >
                      Resolver
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="surface admin-panel">
          <SurfaceHeader icon={<ClipboardCheck />} title="Auditoria" />
          <div className="admin-content-list">
            {auditLogs.length === 0 ? (
              <p className="empty-note">Sem registos ainda.</p>
            ) : (
              auditLogs.slice(0, 10).map((entry) => (
                <article className="admin-content-row audit-row" key={entry.id}>
                  <div>
                    <strong>{formatAuditAction(entry.action)}</strong>
                    <span>
                      {memberById.get(entry.actorId ?? "")?.name ?? "Sistema"} · {formatClock(entry.createdAt)}
                    </span>
                    <p>
                      {entry.targetType} · {entry.targetId}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="admin-grid wide-left">
        <section className="surface admin-panel">
          <SurfaceHeader icon={<Users />} title="Membros e papéis" />
          <div className="admin-member-list">
            {members.map((member) => {
              const sponsor = member.sponsorId ? memberById.get(member.sponsorId) : undefined;
              return (
                <article className="admin-member-row" key={member.id}>
                  <MemberAvatar member={member} />
                  <div className="admin-member-main">
                    <h3>{member.name}</h3>
                    <p>
                      {member.pronouns} · {sponsor ? `por ${sponsor.name}` : "raiz"} · {member.groupIds.length} grupos
                    </p>
                    <div className="admin-tags">
                      <span>{member.status}</span>
                      <span>{member.role}</span>
                      {isMemberSuspended(member) && <span>suspensa até {formatClock(member.suspendedUntil ?? "")}</span>}
                      {!member.consentLimits && <span>limites por preencher</span>}
                    </div>
                  </div>
                  <select
                    aria-label={`Papel de ${member.name}`}
                    value={member.role}
                    onChange={(event) => updateMemberRole(member.id, event.target.value as MemberRole)}
                  >
                    <option value="nova pessoa">nova pessoa</option>
                    <option value="membro">membro</option>
                    <option value="admin">admin</option>
                  </select>
                  <button className="secondary-button" type="button" onClick={() => toggleMemberStatus(member.id)}>
                    {member.status === "online" ? "Pôr offline" : "Pôr online"}
                  </button>
                  <button
                    className={isMemberSuspended(member) ? "secondary-button selected" : "secondary-button"}
                    type="button"
                    disabled={member.id === currentMember.id}
                    onClick={() =>
                      setMemberSuspension(
                        member.id,
                        isMemberSuspended(member)
                          ? null
                          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                      )
                    }
                  >
                    {isMemberSuspended(member) ? "Repor" : "Suspender 24h"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="surface admin-panel">
          <SurfaceHeader icon={<MessageCircle />} title="Mensagens recentes" />
          <div className="admin-content-list">
            {recentMessages.slice(0, 9).map((message) => (
              <article className="admin-content-row" key={message.id}>
                <div>
                  <strong>{memberById.get(message.authorId)?.name ?? "Pessoa"}</strong>
                  <span>{groupById.get(message.roomId)?.name ?? "Sala"} · {formatClock(message.createdAt)}</span>
                  <p>{message.body}</p>
                  <div className="admin-tags">
                    {message.encryptionVersion > 0 && <span>cifrada</span>}
                    {message.encryptionStatus === "locked" && <span>sem chave neste dispositivo</span>}
                    {message.citationCode && <span>{message.citationCode}</span>}
                    {message.imageEncrypted && <span>media E2EE</span>}
                    {message.imageViewOnce && <span>ver uma vez</span>}
                    {message.imageConsentRequired && <span>envelope privado</span>}
                  </div>
                </div>
                <button
                  className="icon-only danger"
                  type="button"
                  onClick={() => {
                    if (window.confirm("Eliminar esta mensagem?")) {
                      deleteMessage(message.id);
                    }
                  }}
                  title="Eliminar mensagem"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="admin-grid thirds">
        <section className="surface admin-panel">
          <SurfaceHeader icon={<CalendarDays />} title="Eventos" actionLabel="Abrir" onAction={() => setActiveNav("agenda")} />
          <div className="admin-content-list">
            {soonEvents.map((event) => (
              <article className="admin-content-row" key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <span>{formatDay(event.startsAt)} {formatMonth(event.startsAt)} · {event.attendeeIds.length}/{event.capacity}</span>
                  <p>{event.boundaryNotes || event.place}</p>
                </div>
                <button
                  className="icon-only danger"
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Eliminar "${event.title}"?`)) {
                      deleteEvent(event.id);
                    }
                  }}
                  title="Eliminar evento"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="surface admin-panel">
          <SurfaceHeader icon={<BookOpenText />} title="Memória" actionLabel="Abrir" onAction={() => setActiveNav("memoria")} />
          <div className="admin-content-list">
            {recentDecisions.slice(0, 3).map((decision) => (
              <article className="admin-content-row" key={decision.id}>
                <div>
                  <strong>{decision.code}</strong>
                  <span>{decision.status} · {decision.votes.length} votos</span>
                  <p>{decision.title}</p>
                </div>
                <button
                  className="icon-only danger"
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Eliminar "${decision.title}"?`)) {
                      deleteDecision(decision.id);
                    }
                  }}
                  title="Eliminar decisão"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </article>
            ))}
            {recentDocs.slice(0, 3).map((doc) => (
              <article className="admin-content-row" key={doc.id}>
                <div>
                  <strong>{doc.code}</strong>
                  <span>{doc.tags.slice(0, 2).join(" · ") || "sem tags"}</span>
                  <p>{doc.title}</p>
                </div>
                <button
                  className="icon-only danger"
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Eliminar "${doc.title}"?`)) {
                      deleteDoc(doc.id);
                    }
                  }}
                  title="Eliminar doc"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="surface admin-panel">
          <SurfaceHeader icon={<Sparkles />} title="Próximas ideias" />
          <div className="admin-idea-list">
            {moderationIdeas.map((idea) => (
              <article key={idea}>
                <Check size={14} aria-hidden />
                <span>{idea}</span>
              </article>
            ))}
          </div>
        </section>
      </section>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <article className="metric-card" style={{ "--accent": accent } as React.CSSProperties}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function getDemoAvatarUrl(member: Member) {
  return demoAvatarUrlsById[member.id] ?? demoAvatarUrlsByName[member.name];
}

function MemberAvatar({ member, className = "avatar" }: { member: Member; className?: string }) {
  const avatarUrl = member.avatarUrl || getDemoAvatarUrl(member);
  return (
    <div className={className}>
      {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(member.name)}
    </div>
  );
}

function DeviceFingerprintList({
  member,
  deviceKeys,
  title = "Dispositivos",
  compact = false,
}: {
  member: Member;
  deviceKeys: DeviceKey[];
  title?: string;
  compact?: boolean;
}) {
  const memberDeviceKeys = deviceKeys.filter((deviceKey) => deviceKey.memberId === member.id);
  if (!memberDeviceKeys.length) {
    return compact ? null : (
      <div className="fingerprint-list">
        <strong>{title}</strong>
        <span>Nenhum dispositivo verificado ainda.</span>
      </div>
    );
  }

  return (
    <div className={compact ? "fingerprint-list compact" : "fingerprint-list"}>
      <strong>{title}</strong>
      {memberDeviceKeys.slice(0, compact ? 2 : 5).map((deviceKey) => (
        <span className={deviceKey.trustStatus === "changed" ? "changed" : ""} key={deviceKey.id}>
          {deviceKey.deviceLabel}: {deviceKey.fingerprint ?? "a calcular"}
        </span>
      ))}
    </div>
  );
}

function SurfaceHeader({
  icon,
  title,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <header className="surface-header">
      <div>
        {icon}
        <h3>{title}</h3>
      </div>
      {actionLabel && (
        <button className="text-button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </header>
  );
}

function NavButton({
  id,
  active,
  setActive,
  icon,
  label,
}: {
  id: NavKey;
  active: NavKey;
  setActive: (id: NavKey) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      className={active === id ? "nav-button active" : "nav-button"}
      type="button"
      onClick={() => setActive(id)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function deviceKeyFromRow(row: DeviceKeyRow): DeviceKey {
  return {
    id: row.id,
    memberId: row.member_id,
    deviceLabel: row.device_label ?? "browser",
    publicKey: row.public_key,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
  };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function encryptTextForDevice(plainText: string, senderPrivateKey: CryptoKey, recipientPublicJwk: JsonWebKey) {
  const recipientPublicKey = await importPublicDeviceKey(recipientPublicJwk);
  const aesKey = await deriveDeviceAesKey(senderPrivateKey, recipientPublicKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    new TextEncoder().encode(plainText),
  );

  return {
    version: 1,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  } satisfies EncryptedPayload;
}

async function decryptTextFromDevice(
  payload: EncryptedPayload,
  recipientPrivateKey: CryptoKey,
  senderPublicJwk: JsonWebKey,
) {
  const senderPublicKey = await importPublicDeviceKey(senderPublicJwk);
  const aesKey = await deriveDeviceAesKey(recipientPrivateKey, senderPublicKey);
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(payload.iv),
    },
    aesKey,
    base64ToBytes(payload.ciphertext),
  );

  return new TextDecoder().decode(decrypted);
}

async function encryptMediaFile(file: File): Promise<EncryptedMediaResult> {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    await file.arrayBuffer(),
  );
  const rawKey = await window.crypto.subtle.exportKey("raw", key);

  return {
    blob: new Blob([ciphertext], { type: "application/octet-stream" }),
    metadata: {
      key: bytesToBase64(new Uint8Array(rawKey)),
      iv: bytesToBase64(iv),
      name: file.name,
      mimeType: file.type,
      size: file.size,
    },
  };
}

async function decryptMediaBlob(encryptedBlob: Blob, metadata: EncryptedMediaMetadata) {
  const key = await window.crypto.subtle.importKey(
    "raw",
    base64ToBytes(metadata.key),
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"],
  );
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(metadata.iv),
    },
    key,
    await encryptedBlob.arrayBuffer(),
  );

  return new Blob([decrypted], { type: metadata.mimeType });
}

async function encryptMessageEnvelope(
  payload: EncryptedMessageBody,
  senderIdentity: DeviceIdentity,
  targetDeviceKeys: DeviceKey[],
) {
  const envelope: Record<string, EncryptedPayload> = {};
  const plainText = JSON.stringify(payload);

  for (const deviceKey of targetDeviceKeys) {
    if (deviceKey.revokedAt) continue;
    try {
      envelope[deviceKey.id] = await encryptTextForDevice(
        plainText,
        senderIdentity.privateKey,
        deviceKey.publicKey,
      );
    } catch {
      // Skip malformed or revoked-looking keys without blocking the room.
    }
  }

  return envelope;
}

async function decryptMessageEnvelope(
  payloads: Record<string, EncryptedPayload>,
  senderDeviceId: string | null,
  deviceIdentity: DeviceIdentity,
  deviceKeys: DeviceKey[],
): Promise<EncryptedMessageBody | null> {
  const payload = payloads[deviceIdentity.deviceId];
  const senderPublicJwk = deviceKeys.find((deviceKey) => deviceKey.id === senderDeviceId)?.publicKey;
  if (!payload || !senderPublicJwk) return null;

  try {
    const plainText = await decryptTextFromDevice(payload, deviceIdentity.privateKey, senderPublicJwk);
    const parsed = JSON.parse(plainText) as Partial<EncryptedMessageBody>;
    if (typeof parsed.body !== "string") return null;
    return {
      body: parsed.body,
      citationCode: typeof parsed.citationCode === "string" ? parsed.citationCode : null,
      image: isEncryptedMediaMetadata(parsed.image) ? parsed.image : null,
    };
  } catch {
    return null;
  }
}

function isEncryptedMediaMetadata(value: unknown): value is EncryptedMediaMetadata {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EncryptedMediaMetadata>;
  return (
    typeof candidate.key === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.size === "number"
  );
}

function isRecentlySeenDevice(deviceKey: DeviceKey) {
  return Date.now() - new Date(deviceKey.lastSeenAt).getTime() < 2 * 60 * 1000;
}

function isVideoSignalPayload(payload: Record<string, unknown>): payload is VideoSignalPayload {
  return payload.kind === "video-call" && typeof payload.callId === "string";
}

function getVideoRtcConfig(relayEnabled: boolean): RTCConfiguration {
  if (!relayEnabled || !turnRelayAvailable) return p2pConnectionConfig;
  return {
    iceServers: [
      ...(p2pConnectionConfig.iceServers ?? []),
      {
        urls: turnUrls,
        username: turnUsername,
        credential: turnCredential,
      },
    ],
  };
}

function hasPeerSignalingState(peer: RTCPeerConnection, state: RTCSignalingState) {
  return peer.signalingState === state;
}

function loadState(): CommunityState {
  const stored = localStorage.getItem(storeKey);
  if (!stored) return seedState;
  try {
    const parsed = JSON.parse(stored);
    return isCommunityState(parsed) ? normalizeCommunityState(parsed) : seedState;
  } catch {
    return seedState;
  }
}

function isCommunityState(value: unknown): value is CommunityState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CommunityState>;
  return (
    Array.isArray(candidate.members) &&
    Array.isArray(candidate.groups) &&
    Array.isArray(candidate.events) &&
    Array.isArray(candidate.docs) &&
    Array.isArray(candidate.messages)
  );
}

function normalizeCommunityState(state: CommunityState): CommunityState {
  return {
    ...state,
    members: state.members.map((member) => ({
      ...member,
      consentAvailableFor: member.consentAvailableFor ?? "",
      consentLimits: member.consentLimits ?? "",
      mediaPreference: member.mediaPreference ?? "",
      relationshipContext: member.relationshipContext ?? "",
      eventComfort: member.eventComfort ?? "",
      suspendedUntil: member.suspendedUntil ?? null,
    })),
    events: state.events.map((event) => ({
      ...event,
      vibe: event.vibe ?? "social",
      photoPolicy: event.photoPolicy ?? "perguntar primeiro",
      boundaryNotes: event.boundaryNotes ?? "",
      aftercarePrompt: event.aftercarePrompt ?? "",
    })),
    eventRooms: Array.isArray(state.eventRooms) ? state.eventRooms : [],
    decisions: Array.isArray(state.decisions) ? state.decisions : [],
    eventCheckIns: Array.isArray(state.eventCheckIns) ? state.eventCheckIns : [],
    intentions: Array.isArray(state.intentions) ? state.intentions : [],
    introductions: Array.isArray(state.introductions) ? state.introductions : [],
    interests: Array.isArray(state.interests) ? state.interests : [],
    relationships: Array.isArray(state.relationships) ? state.relationships : [],
    privacySettings: state.privacySettings ?? seedState.privacySettings,
    reports: Array.isArray(state.reports) ? state.reports : [],
    auditLogs: Array.isArray(state.auditLogs) ? state.auditLogs : [],
    messages: state.messages.map((message) => ({
      ...message,
      encryptionVersion: message.encryptionVersion ?? 0,
      encryptedPayloads: message.encryptedPayloads,
      senderDeviceId: message.senderDeviceId,
      encryptionStatus: message.encryptionStatus ?? "plain",
      encryptedDeviceCount: message.encryptedDeviceCount ?? 0,
      imageEncrypted: message.imageEncrypted ?? false,
      imageEncryptionVersion: message.imageEncryptionVersion ?? 0,
      imageDecryption: message.imageDecryption,
      imageConsentRequired: message.imageConsentRequired ?? false,
      imageExpiresAt: message.imageExpiresAt,
    })),
  };
}

function getSyncCopy(status: SyncStatus) {
  const labels: Record<SyncStatus, { label: string; description: string }> = {
    local: {
      label: "local",
      description: "Sem Supabase configurado; os dados ficam neste browser.",
    },
    auth: {
      label: "privado",
      description: "Acesso por conta e convite; conteúdo sensível precisa de chaves verificadas.",
    },
    loading: {
      label: "a ligar",
      description: "A carregar estado partilhado.",
    },
    connected: {
      label: "cifrado",
      description:
        "Conteúdo novo é cifrado por dispositivo contra leitura da base de dados; confirma chaves para resistir a troca maliciosa.",
    },
    saving: {
      label: "a guardar",
      description: "A guardar metadados e envelopes cifrados.",
    },
    error: {
      label: "erro sync",
      description: "A sincronização encontrou um erro.",
    },
  };
  return labels[status];
}

function makeInviteCode() {
  return `PNM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function resolveLoginIdentifier(value: string) {
  const trimmed = value.trim();
  const aliases: Record<string, string> = {
    admin: "admin@porto-nm.test",
    tester: "tester@porto-nm.test",
  };

  return aliases[trimmed.toLowerCase()] ?? trimmed;
}

function navTitle(nav: NavKey) {
  const titles: Record<NavKey, string> = {
    hoje: "Hoje",
    chat: "Chat",
    agenda: "Agenda",
    comunidade: "Comunidade",
    memoria: "Memória",
    nocturno: "Nocturno",
    cuidado: "Cuidado",
    admin: "Admin e moderação",
  };
  return titles[nav];
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit" }).format(new Date(value));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { month: "short" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getActiveMentionQuery(value: string) {
  const match = value.match(/(^|\s)@([^\s@]*)$/);
  return match ? match[2].trimStart() : null;
}

function findReferencedDocCode(value: string, targets: CitationTarget[]) {
  return targets.find((target) => hasDocMention(value, target))?.code;
}

function hasDocMention(value: string, target: CitationTarget) {
  return citationMentionPatterns(target).some((pattern) => pattern.test(value));
}

function stripCitationMention(value: string, target: CitationTarget) {
  return citationMentionPatterns(target)
    .reduce((nextValue, pattern) => nextValue.replace(pattern, " "), value)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function citationMentionPatterns(target: CitationTarget) {
  return [target.code, getCitationMentionLabel(target)].map(
    (label) => new RegExp(`(^|\\s)@${escapeRegExp(label)}(?=\\s|$)`, "gi"),
  );
}

function getCitationMentionLabel(target: CitationTarget) {
  return target.title;
}

function countDecisionVotes(votes: DecisionVote[]) {
  return votes.reduce(
    (counts, vote) => ({ ...counts, [vote.value]: counts[vote.value] + 1 }),
    { sim: 0, não: 0, abstenção: 0, bloqueio: 0 } as Record<DecisionVoteValue, number>,
  );
}

function countMoods(checkIns: EventCheckIn[]) {
  return checkIns.reduce(
    (counts, checkIn) => ({ ...counts, [checkIn.mood]: counts[checkIn.mood] + 1 }),
    { bem: 0, misto: 0, atenção: 0 } as Record<CheckInMood, number>,
  );
}

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function isMemberSuspended(member: Member) {
  return Boolean(member.suspendedUntil && new Date(member.suspendedUntil).getTime() > Date.now());
}

function makeLocalAudit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
): AdminAuditLog {
  return {
    id: crypto.randomUUID(),
    actorId,
    action,
    targetType,
    targetId,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    "member.role_updated": "Papel alterado",
    "message.deleted": "Mensagem eliminada",
    "event.deleted": "Evento eliminado",
    "event_room.deleted": "Sala temporária eliminada",
    "doc.deleted": "Doc eliminado",
    "decision.deleted": "Decisão eliminada",
    "invite.created": "Convite criado",
    "report.updated": "Caso atualizado",
    "member.suspended": "Conta suspensa",
    "member.suspension_cleared": "Suspensão removida",
  };
  return labels[action] ?? action;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || "imagem";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export {
  decryptMediaBlob,
  decryptMessageEnvelope,
  decryptTextFromDevice,
  encryptMediaFile,
  encryptMessageEnvelope,
  encryptTextForDevice,
};
export type { DeviceIdentity, DeviceKey, EncryptedPayload };

export default App;
