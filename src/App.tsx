import {
  BookOpenText,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Copy,
  FilePlus2,
  HandHeart,
  Link2,
  MessageCircle,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type MemberStatus = "online" | "offline";
type MemberRole = "nova pessoa" | "membro" | "guardia";
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
  attendeeIds: string[];
};

type CommunityDoc = {
  id: string;
  code: string;
  title: string;
  summary: string;
  ownerId: string;
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
};

type CommunityState = {
  members: Member[];
  groups: Group[];
  events: EventItem[];
  docs: CommunityDoc[];
  messages: ChatMessage[];
};

const storeKey = "porto-nm-community-v1";

const seedState: CommunityState = {
  members: [
    {
      id: "m_di",
      name: "Di",
      pronouns: "elu/delu",
      joinedAt: "2026-03-02",
      sponsorId: null,
      role: "guardia",
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
      attendeeIds: ["m_di", "m_ana", "m_lia"],
    },
    {
      id: "e_2",
      title: "Assembleia de verão",
      startsAt: "2026-07-03T20:30",
      place: "Cedofeita",
      groupId: "g_geral",
      capacity: 24,
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
        "Subgrupos têm guardiã/o definido, visibilidade própria e uma lista de membros revista periodicamente.",
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
    },
  ],
};

function App() {
  const [state, setState] = useState<CommunityState>(() => loadState());
  const [activeNav, setActiveNav] = useState<NavKey>("hoje");
  const [currentMemberId, setCurrentMemberId] = useState("m_di");
  const [activeGroupId, setActiveGroupId] = useState("g_geral");
  const [selectedCitation, setSelectedCitation] = useState("DOC-001");
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }, [state]);

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
    setState((current) => updater(current));
  }

  function resetState() {
    setState(seedState);
    setCurrentMemberId("m_di");
    setActiveGroupId("g_geral");
    setSelectedCitation("DOC-001");
  }

  function toggleMemberStatus(memberId: string) {
    updateState((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId
          ? { ...member, status: member.status === "online" ? "offline" : "online" }
          : member,
      ),
    }));
  }

  function sendMessage(body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    const groupMembers = state.members.filter((member) => member.groupIds.includes(activeGroup.id));
    const recipientsAtSend = groupMembers
      .filter((member) => member.status === "online" && member.id !== currentMember.id)
      .map((member) => member.id);

    updateState((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: crypto.randomUUID(),
          roomId: activeGroup.id,
          authorId: currentMember.id,
          body: trimmed,
          createdAt: new Date().toISOString(),
          recipientsAtSend,
          citationCode: selectedCitation || undefined,
        },
      ],
    }));
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
  }

  function addEvent(input: {
    title: string;
    startsAt: string;
    place: string;
    groupId: string;
    capacity: number;
  }) {
    const event: EventItem = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      startsAt: input.startsAt,
      place: input.place.trim(),
      groupId: input.groupId,
      capacity: input.capacity,
      attendeeIds: [currentMember.id],
    };
    updateState((current) => ({ ...current, events: [...current.events, event] }));
  }

  function toggleRsvp(eventId: string) {
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
  }

  function addDoc(input: { title: string; summary: string; tags: string }) {
    const nextNumber = state.docs.length + 1;
    const doc: CommunityDoc = {
      id: crypto.randomUUID(),
      code: `DOC-${String(nextNumber).padStart(3, "0")}`,
      title: input.title.trim(),
      summary: input.summary.trim(),
      ownerId: currentMember.id,
      updatedAt: formatDateInput(new Date()),
      tags: input.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    updateState((current) => ({ ...current, docs: [...current.docs, doc] }));
    setSelectedCitation(doc.code);
  }

  function addGroup(input: {
    name: string;
    focus: string;
    privacy: GroupPrivacy;
    stewardId: string;
  }) {
    const palette = ["#176b63", "#c4493d", "#5457a6", "#9a5a20", "#2d6f9f"];
    const group: Group = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      focus: input.focus.trim(),
      privacy: input.privacy,
      stewardId: input.stewardId,
      color: palette[state.groups.length % palette.length],
    };
    updateState((current) => ({ ...current, groups: [...current.groups, group] }));
    setActiveGroupId(group.id);
  }

  function toggleGroupMember(groupId: string, memberId: string) {
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
  }

  return (
    <div className="app-shell">
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

        <button className="ghost-button" type="button" onClick={resetState}>
          <RefreshCw size={16} aria-hidden />
          Repor exemplo
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">quinta, 18 junho 2026</p>
            <h2>{navTitle(activeNav)}</h2>
          </div>
          <div className="status-strip" aria-label="Estado da comunidade">
            <span>
              <Wifi size={16} aria-hidden />
              {onlineMembers.length} online
            </span>
            <span>
              <ShieldCheck size={16} aria-hidden />
              {state.members.length} membros
            </span>
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
            toggleMemberStatus={toggleMemberStatus}
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
          />
        )}
      </main>
    </div>
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
  toggleMemberStatus,
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
  sendMessage: (body: string) => void;
  toggleMemberStatus: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const visibleMessages = messages.filter((message) => {
    if (message.roomId !== activeGroup.id) return false;
    return (
      message.authorId === currentMember.id || message.recipientsAtSend.includes(currentMember.id)
    );
  });
  const groupMembers = members.filter((member) => member.groupIds.includes(activeGroup.id));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
    setDraft("");
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
                {citedDoc && (
                  <button className="citation-chip" type="button" onClick={() => setSelectedCitation(citedDoc.code)}>
                    <Link2 size={14} aria-hidden />
                    {citedDoc.code} · {citedDoc.title}
                  </button>
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
          <button className="primary-button icon-button" type="submit" title="Enviar">
            <MessageCircle size={18} aria-hidden />
            <span>Enviar</span>
          </button>
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
  }) => void;
  toggleRsvp: (eventId: string) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    startsAt: "2026-06-25T19:30",
    place: "",
    groupId: groups[0]?.id ?? "",
    capacity: 10,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.startsAt || !form.place.trim()) return;
    addEvent(form);
    setForm((current) => ({ ...current, title: "", place: "" }));
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
              <button
                className={attending ? "secondary-button selected" : "secondary-button"}
                type="button"
                onClick={() => toggleRsvp(event.id)}
              >
                <Check size={16} aria-hidden />
                {attending ? "Confirmade" : "Confirmar"}
              </button>
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
}: {
  docs: CommunityDoc[];
  members: Member[];
  currentMember: Member;
  memberById: Map<string, Member>;
  search: string;
  setSearch: (value: string) => void;
  selectedCitation: string;
  setSelectedCitation: (code: string) => void;
  addDoc: (input: { title: string; summary: string; tags: string }) => void;
}) {
  const [form, setForm] = useState({ title: "", summary: "", tags: "" });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.summary.trim()) return;
    addDoc(form);
    setForm({ title: "", summary: "", tags: "" });
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
          {docs.map((doc) => (
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
              <button className="icon-only" type="button" onClick={() => setSelectedCitation(doc.code)} title="Usar citação">
                <Copy size={17} aria-hidden />
              </button>
            </article>
          ))}
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
  addGroup: (input: { name: string; focus: string; privacy: GroupPrivacy; stewardId: string }) => void;
  toggleGroupMember: (groupId: string, memberId: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    focus: "",
    privacy: "convite" as GroupPrivacy,
    stewardId: members[0]?.id ?? "",
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.focus.trim()) return;
    addGroup(form);
    setForm((current) => ({ ...current, name: "", focus: "" }));
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
            <label htmlFor="group-steward">Guardião/a</label>
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
            <footer>Guardião/a: {memberById.get(group.stewardId)?.name}</footer>
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
}: {
  members: Member[];
  groups: Group[];
  memberById: Map<string, Member>;
  addMember: (input: { name: string; pronouns: string; sponsorId: string; groupIds: string[] }) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    pronouns: "",
    sponsorId: members[0]?.id ?? "",
    groupIds: ["g_geral"],
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.sponsorId) return;
    addMember(form);
    setForm((current) => ({ ...current, name: "", pronouns: "" }));
  }

  return (
    <section className="entrances-layout">
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
    return JSON.parse(stored) as CommunityState;
  } catch {
    return seedState;
  }
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
