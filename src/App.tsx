import {
  BookOpenText,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Copy,
  Eye,
  EyeOff,
  FilePlus2,
  HandHeart,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { createClient, Session } from "@supabase/supabase-js";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type MemberStatus = "online" | "offline";
type MemberRole = "nova pessoa" | "membro" | "admin";
type GroupPrivacy = "aberto" | "convite" | "secreto";
type NavKey = "hoje" | "chat" | "eventos" | "docs" | "grupos" | "entradas";

type Member = {
  id: string;
  name: string;
  pronouns: string;
  joinedAt: string;
  sponsorId: string | null;
  role: MemberRole;
  groupIds: string[];
  status: MemberStatus;
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
  imagePath?: string;
  imageUrl?: string;
  imageName?: string;
  imageMimeType?: string;
  imageViewOnce: boolean;
  imageOpenedBy: string[];
};

type CommunityState = {
  members: Member[];
  groups: Group[];
  events: EventItem[];
  docs: CommunityDoc[];
  messages: ChatMessage[];
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
  imageFile?: File | null;
  imageViewOnce?: boolean;
};

type ProfileRow = {
  id: string;
  name: string;
  pronouns: string | null;
  joined_at: string;
  sponsor_id: string | null;
  role: MemberRole;
  status: MemberStatus;
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
};

type EventAttendeeRow = {
  event_id: string;
  member_id: string;
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
  image_path: string | null;
  image_name: string | null;
  image_mime_type: string | null;
  image_view_once: boolean | null;
  image_opened_by: string[] | null;
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

const storeKey = "porto-nm-community-v1";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
      imageViewOnce: false,
      imageOpenedBy: [],
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
  const [selectedCitation, setSelectedCitation] = useState("DOC-001");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const fetchBackendData = useCallback(async () => {
    if (!supabase || !session) return;
    setSyncStatus("loading");

    const [
      profilesResult,
      groupsResult,
      groupMembersResult,
      eventsResult,
      attendeesResult,
      docsResult,
      messagesResult,
      invitesResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("joined_at", { ascending: true }),
      supabase.from("groups").select("*").order("name", { ascending: true }),
      supabase.from("group_members").select("*"),
      supabase.from("events").select("*").order("starts_at", { ascending: true }),
      supabase.from("event_attendees").select("*"),
      supabase.from("docs").select("*").order("updated_at", { ascending: false }),
      supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(200),
      supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
    ]);

    const firstError = [
      profilesResult.error,
      groupsResult.error,
      groupMembersResult.error,
      eventsResult.error,
      attendeesResult.error,
      docsResult.error,
      messagesResult.error,
      invitesResult.error,
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

    const members = ((profilesResult.data ?? []) as ProfileRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      pronouns: row.pronouns ?? "por definir",
      joinedAt: row.joined_at,
      sponsorId: row.sponsor_id,
      role: row.role,
      groupIds: groupIdsByMember.get(row.id) ?? [],
      status: row.status,
    }));

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

    const messages = await Promise.all(
      ((messagesResult.data ?? []) as MessageRow[]).map(async (row) => {
        const imageOpenedBy = row.image_opened_by ?? [];
        const imageViewOnce = Boolean(row.image_view_once);
        const isAuthor = row.author_id === session.user.id;
        let imageUrl: string | undefined;

        if (row.image_path && (isAuthor || !imageViewOnce)) {
          const { data } = await supabase.storage
            .from("message-images")
            .createSignedUrl(row.image_path, 60 * 60);
          imageUrl = data?.signedUrl;
        }

        return {
          id: row.id,
          roomId: row.room_id,
          authorId: row.author_id,
          body: row.body,
          createdAt: row.created_at,
          recipientsAtSend: row.recipients_at_send ?? [],
          citationCode: row.citation_code ?? undefined,
          imagePath: row.image_path ?? undefined,
          imageUrl,
          imageName: row.image_name ?? undefined,
          imageMimeType: row.image_mime_type ?? undefined,
          imageViewOnce,
          imageOpenedBy,
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

    setState({ members, groups, events, docs, messages });
    setInviteCodes(invites);
    setSyncStatus("connected");
    setSyncMessage("");
  }, [session]);

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
    const member: Member = {
      id: row.id,
      name: row.name,
      pronouns: row.pronouns ?? "por definir",
      joinedAt: row.joined_at,
      sponsorId: row.sponsor_id,
      role: row.role,
      groupIds: [],
      status: row.status,
    };
    setProfile(member);
    setCurrentMemberId(member.id);
    return member;
  }, []);

  const refreshSignedInData = useCallback(async () => {
    if (!session) return;
    const member = await loadProfile(session);
    if (member) {
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
      setSyncStatus("auth");
      return;
    }
    refreshSignedInData();
  }, [refreshSignedInData, session]);

  useEffect(() => {
    if (!supabase || !session || !profile) return;
    let reloadHandle: number | undefined;
    const channel = supabase
      .channel("community-tables")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        if (reloadHandle) window.clearTimeout(reloadHandle);
        reloadHandle = window.setTimeout(() => {
          fetchBackendData();
        }, 200);
      })
      .subscribe();

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
    if (selectedCitation && !state.docs.some((doc) => doc.code === selectedCitation)) {
      setSelectedCitation(state.docs[0]?.code ?? "");
    }
  }, [
    activeGroupId,
    currentMemberId,
    profile,
    selectedCitation,
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

  const activeGroup = groupById.get(activeGroupId) ?? state.groups[0];
  const currentMember = memberById.get(currentMemberId) ?? state.members[0];
  const syncCopy = getSyncCopy(syncStatus);
  const onlineMembers = state.members.filter((member) => member.status === "online");
  const upcomingEvents = [...state.events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const filteredDocs = state.docs.filter((doc) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [doc.title, doc.summary, doc.code, ...doc.tags].some((value) =>
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

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      showNotice(message);
    } catch {
      showNotice("Não foi possível copiar automaticamente.");
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

  async function sendMessage(input: MessageInput) {
    const trimmed = input.body.trim();
    const imageFile = input.imageFile ?? null;
    const hasImage = Boolean(imageFile);
    if (!trimmed && !imageFile) return false;

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

    if (usingBackend && supabase && profile) {
      setSyncStatus("saving");
      const messageId = crypto.randomUUID();
      let imagePath: string | undefined;

      if (imageFile) {
        imagePath = `${profile.id}/${messageId}-${safeFileName(imageFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("message-images")
          .upload(imagePath, imageFile, {
            cacheControl: "3600",
            contentType: imageFile.type,
            upsert: false,
          });

        if (uploadError) {
          setSyncStatus("error");
          setSyncMessage(uploadError.message);
          return false;
        }
      }

      const { error } = await supabase.from("messages").insert({
        id: messageId,
        room_id: activeGroup.id,
        author_id: profile.id,
        body: trimmed || (hasImage ? "Imagem" : ""),
        recipients_at_send: recipientsAtSend,
        citation_code: selectedCitation || null,
        image_path: imagePath ?? null,
        image_name: imageFile?.name ?? null,
        image_mime_type: imageFile?.type ?? null,
        image_view_once: Boolean(input.imageViewOnce),
      });
      if (error) {
        setSyncStatus("error");
        setSyncMessage(error.message);
        return false;
      }
      await fetchBackendData();
      showNotice(hasImage ? "Imagem enviada." : "Mensagem enviada.");
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
          body: trimmed || (hasImage ? "Imagem" : ""),
          createdAt: new Date().toISOString(),
          recipientsAtSend,
          citationCode: selectedCitation || undefined,
          imageUrl,
          imageName: imageFile?.name,
          imageMimeType: imageFile?.type,
          imageViewOnce: Boolean(input.imageViewOnce),
          imageOpenedBy: [],
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

    return data?.signedUrl ?? null;
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
      const { error } = await supabase.from("events").delete().eq("id", eventId);
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
      const { error } = await supabase.from("docs").delete().eq("id", docId);
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
    }));
    if (selectedCitation === doc.code) {
      setSelectedCitation("");
    }
    showNotice(`${doc.code} eliminado.`);
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
    updateState((current) => ({ ...current, groups: [...current.groups, group] }));
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
    const { error } = await supabase.from("invite_codes").insert({
      code,
      sponsor_id: profile.id,
      role: input.role,
      max_uses: input.maxUses,
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

  return (
    <div className="app-shell">
      {notice && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={17} aria-hidden />
          {notice}
        </div>
      )}
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Sparkles size={22} aria-hidden />
          </div>
          <div>
            <h1>Porto NM</h1>
            <p>Comunidade privada</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegação principal">
          <NavButton id="hoje" active={activeNav} setActive={setActiveNav} icon={<CircleDot />} label="Hoje" />
          <NavButton id="chat" active={activeNav} setActive={setActiveNav} icon={<MessageCircle />} label="Ao vivo" />
          <NavButton id="eventos" active={activeNav} setActive={setActiveNav} icon={<CalendarDays />} label="Eventos" />
          <NavButton id="docs" active={activeNav} setActive={setActiveNav} icon={<BookOpenText />} label="Docs" />
          <NavButton id="grupos" active={activeNav} setActive={setActiveNav} icon={<Users />} label="Grupos" />
          <NavButton id="entradas" active={activeNav} setActive={setActiveNav} icon={<HandHeart />} label="Entradas" />
        </nav>

        {usingBackend && profile ? (
          <div className="actor-box account-box">
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

      <main className="workspace">
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
            docs={state.docs}
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
            messages={state.messages}
            activeGroupId={activeGroup.id}
            currentMember={currentMember}
            memberById={memberById}
            docsByCode={docsByCode}
            selectedCitation={selectedCitation}
            setActiveGroupId={setActiveGroupId}
            setSelectedCitation={setSelectedCitation}
            sendMessage={sendMessage}
            markImageOpened={markImageOpened}
            getMessageImageUrl={getMessageImageUrl}
            toggleMemberStatus={toggleMemberStatus}
            copyText={copyText}
            showNotice={showNotice}
          />
        )}

        {activeNav === "eventos" && (
          <EventsView
            events={upcomingEvents}
            groups={state.groups}
            currentMember={currentMember}
            memberById={memberById}
            groupById={groupById}
            addEvent={addEvent}
            deleteEvent={deleteEvent}
            toggleRsvp={toggleRsvp}
          />
        )}

        {activeNav === "docs" && (
          <DocsView
            docs={filteredDocs}
            members={state.members}
            currentMember={currentMember}
            memberById={memberById}
            search={search}
            setSearch={setSearch}
            selectedCitation={selectedCitation}
            setSelectedCitation={setSelectedCitation}
            addDoc={addDoc}
            deleteDoc={deleteDoc}
            copyText={copyText}
            showNotice={showNotice}
          />
        )}

        {activeNav === "grupos" && (
          <GroupsView
            groups={state.groups}
            members={state.members}
            memberById={memberById}
            addGroup={addGroup}
            toggleGroupMember={toggleGroupMember}
          />
        )}

        {activeNav === "entradas" && (
          <EntrancesView
            members={state.members}
            groups={state.groups}
            memberById={memberById}
            addMember={addMember}
            backendMode={usingBackend}
            currentMember={currentMember}
            inviteCodes={inviteCodes}
            createInvite={createInvite}
            copyText={copyText}
          />
        )}
      </main>
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel surface">
        <div className="brand-mark">
          <Sparkles size={22} aria-hidden />
        </div>
        <h1>{label}</h1>
        <p>A preparar a ligação segura à comunidade.</p>
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
      <section className="auth-panel surface">
        <div className="brand-block compact">
          <div className="brand-mark">
            <Sparkles size={22} aria-hidden />
          </div>
          <div>
            <h1>Porto NM</h1>
            <p>Entrada privada</p>
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
          <div className="brand-mark">
            <HandHeart size={22} aria-hidden />
          </div>
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
  docs,
  memberById,
  groupById,
  setActiveNav,
}: {
  members: Member[];
  groups: Group[];
  events: EventItem[];
  docs: CommunityDoc[];
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
        <Metric icon={<BookOpenText />} label="Docs citáveis" value={docs.length} accent="#5457a6" />
        <Metric icon={<HandHeart />} label="Novas entradas" value={newMembers.length} accent="#9a5a20" />
      </div>

      <div className="split-layout">
        <section className="surface agenda-surface">
          <SurfaceHeader
            icon={<CalendarDays />}
            title="Próximos eventos"
            actionLabel="Gerir"
            onAction={() => setActiveNav("eventos")}
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
            onAction={() => setActiveNav("entradas")}
          />
          <div className="sponsor-chain">
            {members.map((member) => (
              <article className="sponsor-node" key={member.id}>
                <div className="avatar">{initials(member.name)}</div>
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
  messages,
  activeGroupId,
  currentMember,
  memberById,
  docsByCode,
  selectedCitation,
  setActiveGroupId,
  setSelectedCitation,
  sendMessage,
  markImageOpened,
  getMessageImageUrl,
  toggleMemberStatus,
  copyText,
  showNotice,
}: {
  members: Member[];
  groups: Group[];
  docs: CommunityDoc[];
  messages: ChatMessage[];
  activeGroupId: string;
  currentMember: Member;
  memberById: Map<string, Member>;
  docsByCode: Map<string, CommunityDoc>;
  selectedCitation: string;
  setActiveGroupId: (id: string) => void;
  setSelectedCitation: (code: string) => void;
  sendMessage: (input: MessageInput) => Promise<boolean>;
  markImageOpened: (messageId: string) => Promise<boolean>;
  getMessageImageUrl: (message: ChatMessage) => Promise<string | null>;
  toggleMemberStatus: (id: string) => void;
  copyText: (value: string, message: string) => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageViewOnce, setImageViewOnce] = useState(false);
  const [revealedImageUrls, setRevealedImageUrls] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const visibleMessages = messages.filter((message) => {
    if (message.roomId !== activeGroup.id) return false;
    return (
      message.authorId === currentMember.id || message.recipientsAtSend.includes(currentMember.id)
    );
  });
  const groupMembers = members.filter((member) => member.groupIds.includes(activeGroup.id));

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
    const visibleImageUrl = message.imageViewOnce && !isOwn ? revealedUrl : message.imageUrl;

    if (message.imageViewOnce && !isOwn && !revealedUrl) {
      if (openedByMe) {
        return (
          <div className="image-placeholder">
            <EyeOff size={18} aria-hidden />
            <span>Imagem já aberta</span>
          </div>
        );
      }

      return (
        <button className="image-reveal" type="button" onClick={() => revealImage(message)}>
          <Eye size={18} aria-hidden />
          <span>Abrir imagem uma vez</span>
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
        {message.imageViewOnce && (
          <figcaption>
            <EyeOff size={14} aria-hidden />
            Ver uma vez
          </figcaption>
        )}
      </figure>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const sent = await sendMessage({ body: draft, imageFile, imageViewOnce }).finally(() => setSending(false));
    if (sent) {
      setDraft("");
      clearImage();
    }
  }

  return (
    <section className="chat-layout">
      <aside className="surface live-sidebar">
        <div className="field-group">
          <label htmlFor="room-select">Sala</label>
          <select id="room-select" value={activeGroup.id} onChange={(event) => setActiveGroupId(event.target.value)}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
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
              {member.status === "online" ? <Wifi size={17} aria-hidden /> : <WifiOff size={17} aria-hidden />}
              <span>{member.name}</span>
              <small>{member.status}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="surface chat-panel">
        <header className="chat-header">
          <div>
            <h3>{activeGroup.name}</h3>
            <p>Entrega imediata só a equipamentos online nesta sala.</p>
          </div>
          <span className="small-pill">{visibleMessages.length} visíveis para {currentMember.name}</span>
        </header>

        <div className="message-list" aria-live="polite">
          {visibleMessages.map((message) => {
            const author = memberById.get(message.authorId);
            const citedDoc = message.citationCode ? docsByCode.get(message.citationCode) : undefined;
            return (
              <article className={`message ${message.authorId === currentMember.id ? "own" : ""}`} key={message.id}>
                <header>
                  <strong>{author?.name ?? "Pessoa"}</strong>
                  <span>{formatClock(message.createdAt)}</span>
                </header>
                <p>{message.body}</p>
                {renderMessageImage(message)}
                {citedDoc && (
                  <div className="message-actions">
                    <button className="citation-chip" type="button" onClick={() => setSelectedCitation(citedDoc.code)}>
                      <Link2 size={14} aria-hidden />
                      {citedDoc.code} · {citedDoc.title}
                    </button>
                    <button
                      className="icon-only compact"
                      type="button"
                      onClick={() => copyText(citedDoc.code, `${citedDoc.code} copiado.`)}
                      title="Copiar código"
                    >
                      <Copy size={15} aria-hidden />
                    </button>
                  </div>
                )}
                <footer>
                  Entregue a {message.recipientsAtSend.length} equipamento
                  {message.recipientsAtSend.length === 1 ? "" : "s"}
                </footer>
              </article>
            );
          })}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
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
            <select
              aria-label="Documento para citar"
              value={selectedCitation}
              onChange={(event) => setSelectedCitation(event.target.value)}
            >
              <option value="">sem citação</option>
              {docs.map((doc) => (
                <option key={doc.id} value={doc.code}>
                  {doc.code}
                </option>
              ))}
            </select>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Mensagem como ${currentMember.name}`}
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
        </form>
      </section>
    </section>
  );
}

function EventsView({
  events,
  groups,
  currentMember,
  memberById,
  groupById,
  addEvent,
  deleteEvent,
  toggleRsvp,
}: {
  events: EventItem[];
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
  }) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<void>;
  toggleRsvp: (eventId: string) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    startsAt: "2026-06-25T19:30",
    place: "",
    groupId: groups[0]?.id ?? "",
    capacity: 10,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.startsAt || !form.place.trim()) return;
    const created = await addEvent(form);
    if (created) {
      setForm((current) => ({ ...current, title: "", place: "" }));
    }
  }

  return (
    <section className="two-column">
      <form className="surface form-panel" onSubmit={handleSubmit}>
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
        <button className="primary-button" type="submit">
          <Plus size={17} aria-hidden />
          Criar evento
        </button>
      </form>

      <section className="event-board">
        {events.map((event) => {
          const attending = event.attendeeIds.includes(currentMember.id);
          const canDelete = currentMember.role === "admin" || event.createdBy === currentMember.id;
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
                <div className="attendee-row">
                  {event.attendeeIds.map((id) => (
                    <span key={id}>{memberById.get(id)?.name}</span>
                  ))}
                </div>
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
  members,
  currentMember,
  memberById,
  search,
  setSearch,
  selectedCitation,
  setSelectedCitation,
  addDoc,
  deleteDoc,
  copyText,
  showNotice,
}: {
  docs: CommunityDoc[];
  members: Member[];
  currentMember: Member;
  memberById: Map<string, Member>;
  search: string;
  setSearch: (value: string) => void;
  selectedCitation: string;
  setSelectedCitation: (code: string) => void;
  addDoc: (input: { title: string; summary: string; tags: string }) => Promise<boolean>;
  deleteDoc: (docId: string) => Promise<void>;
  copyText: (value: string, message: string) => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const [form, setForm] = useState({ title: "", summary: "", tags: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.summary.trim()) return;
    const created = await addDoc(form);
    if (created) {
      setForm({ title: "", summary: "", tags: "" });
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
                <div className="avatar">{initials(member.name)}</div>
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

function loadState(): CommunityState {
  const stored = localStorage.getItem(storeKey);
  if (!stored) return seedState;
  try {
    const parsed = JSON.parse(stored);
    return isCommunityState(parsed) ? parsed : seedState;
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

function getSyncCopy(status: SyncStatus) {
  const labels: Record<SyncStatus, { label: string; description: string }> = {
    local: {
      label: "local",
      description: "Sem Supabase configurado; os dados ficam neste browser.",
    },
    auth: {
      label: "privado",
      description: "Acesso protegido por conta e convite.",
    },
    loading: {
      label: "a ligar",
      description: "A carregar estado partilhado.",
    },
    connected: {
      label: "partilhado",
      description: "Sincronizado com Supabase.",
    },
    saving: {
      label: "a guardar",
      description: "A guardar alterações partilhadas.",
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
    chat: "Chat ao vivo",
    eventos: "Eventos",
    docs: "Conclusões e documentos",
    grupos: "Comunidade e subgrupos",
    entradas: "Apadrinhamento",
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

export default App;
