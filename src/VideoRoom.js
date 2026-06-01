import { useState, useEffect, useRef } from 'react';

// ============== INLINE SVG ICONS ==============
const Svg = ({ children, d, size = 20, style, ...rest }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ flexShrink: 0, ...style }} {...rest}>
    {d ? (typeof d === 'string' ? <path d={d} /> : d) : children}
  </svg>
);
const I = {
  Mic: (p) => <Svg {...p} d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>,
  MicOff: (p) => <Svg {...p} d="M19 11h-1.7c0 .74-.16 1.44-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>,
  Camera: (p) => <Svg {...p} d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>,
  CameraOff: (p) => <Svg {...p} d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2z"/>,
  Screen: (p) => <Svg {...p} d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>,
  Invite: (p) => <Svg {...p} d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>,
  Members: (p) => <Svg {...p} d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>,
  Chat: (p) => <Svg {...p} d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>,
  Close: (p) => <Svg {...p} d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>,
  ChevronDown: (p) => <Svg {...p} d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>,
  ChevronUp: (p) => <Svg {...p} d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>,
  Speaker: (p) => <Svg {...p} d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>,
  SpeakerOff: (p) => <Svg {...p} d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>,
  Caption: (p) => <Svg {...p} d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 13H7v-2h3v2zm0-3H7v-1h3v1zm0-3H7V9h3v2zm4.68 6h-2.16l-.84-2h-1.68l-.84 2h-2.16L10.22 7h2.56l1.9 7zM14 11.73L13.06 9h-.12L12 11.73V13h2v-1.27z"/>,
  Record: (p) => <Svg {...p}><circle cx="12" cy="12" r="6"/></Svg>,
  Poll: (p) => <Svg {...p} d="M3 3v18h18V3H3zm6 14H7v-5h2v5zm4 0h-2V7h2v10zm4 0h-2v-5h2v5z"/>,
  Crown: (p) => <Svg {...p} d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3v2H5v-2h14z"/>,
  Translate: (p) => <Svg {...p} d="M12.87 15.07l-2.54-2.51.03-.03C12.88 10.14 14.67 7.76 15.5 5h-11V3h7V1h2v2h7v2h-2.07c-.88 2.77-2.47 5.5-4.63 7.58.79 1.05 1.68 1.99 2.67 2.8l-1.27 1.26c-1.04-.93-2.06-2.01-3-3.29zm-3.54-2.71L7 14.67V17H5v-3H2v-2h3.45l.87-1.3-.82-1.22H3.67l1.43-1.95h3.54l2.69 3.83z"/>,
  Hand: (p) => <Svg {...p} d="M21 7c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05V4.5c0-1.38-1.12-2.5-2.5-2.5-.54 0-1.04.18-1.44.46C13.45 1.43 12.33 1 11 1c-1.74 0-3.26.83-4.23 2.12-.67-.45-1.47-.67-2.27-.55C2.9 2.86 2 4.03 2 5.5V17c0 3.31 2.69 6 6 6h6c4.97 0 9-4.03 9-9V7z"/>,
  Layout: (p) => <Svg {...p} d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>,
  Search: (p) => <Svg {...p} d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>,
  VideoCall: (p) => <Svg {...p} d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>,
  Emoji: (p) => <Svg {...p} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>,
  Sparkle: (p) => <Svg {...p} d="M19.48 12.35c-1.57-4.08-7.11-4.66-10.44-.82-1.22 1.38-2.17 2.81-2.84 4.28-.3.65-.09 1.43.5 1.83.6.4 1.39.28 1.85-.28.62-.76 1.38-1.49 2.26-2.14 2.31-1.73 5.33-1.75 6.67-.05.33.42.84.63 1.35.55.51-.08.93-.44 1.09-.93.15-.49.02-1.03-.31-1.41-.43-.52-.93-1.03-1.13-1.03zM7 6c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM12 2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>,
  AI: (p) => <Svg {...p} d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/>,
  Check: (p) => <Svg {...p} d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>,
  WindowMin: (p) => <Svg {...p} d="M19 13H5v-2h14v2z"/>,
  WindowMax: (p) => <Svg {...p} d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>,
  Settings: (p) => <Svg {...p} d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>,
  Send: (p) => <Svg {...p} d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>,
  Warning: (p) => <Svg {...p} d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>,
  Robot: (p) => <Svg {...p} d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm4.5-1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zM9 17h6v-2H9v2z"/>,
  Pin: (p) => <Svg {...p} d="M14 4v5c0 1.12.37 2.16 1 3H9c.63-.84 1-1.88 1-3V4H14zm3-2H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 .55-.45 1-1 1s-1 .45-1 1 .45 1 1 1h3.01L9 22h2l.99-10H15c.55 0 1-.45 1-1s-.45-1-1-1c-.55 0-1-.45-1-1V4h1c.55 0 1-.45 1-1s-.45-1-1-1z"/>,
  More: (p) => <Svg {...p} d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>,
};

// ============== HELPERS ==============
const fmtTime = s => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
};
const statusDot = { active: '#34c759', away: '#ff9f0a', offline: '#8e8e93' };

// ============== DATA ==============
// Load contacts from registered family accounts + teachers + students in localStorage
function loadContactsFromLocalStorage() {
  const contacts = [];
  const addedIds = new Set();
  let removedIds;
  try { removedIds = new Set(JSON.parse(localStorage.getItem('video_room_removed_ids') || '[]')); } catch (_) { removedIds = new Set(); }

  // 1) Family accounts (parents + children)
  try {
    const families = JSON.parse(localStorage.getItem('classroom_family_accounts') || '[]');
    for (const f of families) {
      const parentId = `family-${f.id}-parent`;
      if (!addedIds.has(parentId) && !removedIds.has(parentId)) {
        contacts.push({ id: parentId, name: f.parentName || 'Parent', role: 'Parent', email: f.parentEmail || '', avatar: '👨‍👩‍👧', status: 'active', source: 'family' });
        addedIds.add(parentId);
      }
      if (Array.isArray(f.children)) {
        f.children.forEach((child, idx) => {
          const cid = `family-${f.id}-child-${idx}`;
          if (!addedIds.has(cid) && !removedIds.has(cid)) {
            contacts.push({ id: cid, name: child.name || 'Child', role: 'Student', email: f.parentEmail || '', subject: child.subject || '', avatar: '👦', status: 'active', source: 'family' });
            addedIds.add(cid);
          }
        });
      }
    }
  } catch (_) {}

  // 2) Managed teachers
  try {
    const teachers = JSON.parse(localStorage.getItem('linguaclass_teachers') || '[]');
    for (const t of teachers) {
      const tid = `teacher-${t.id}`;
      if (!addedIds.has(tid) && !removedIds.has(tid) && t.name) {
        contacts.push({ id: tid, name: t.name, role: 'Teacher', email: t.email || '', subject: t.subject || '', avatar: '👩‍🏫', status: t.status === 'inactive' ? 'offline' : 'active', source: 'teacher' });
        addedIds.add(tid);
      }
    }
  } catch (_) {}

  // 3) Registered students (from admin panel)
  try {
    const students = JSON.parse(localStorage.getItem('linguaclass_students') || '[]');
    for (const s of students) {
      const sid = `student-${s.id}`;
      if (!addedIds.has(sid) && !removedIds.has(sid) && s.name) {
        contacts.push({ id: sid, name: s.name, role: 'Student', email: s.parentEmail || '', subject: s.subject || '', avatar: s.avatar || '👦', status: 'active', source: 'student' });
        addedIds.add(sid);
      }
    }
  } catch (_) {}

  // 4) Manually added video-room contacts (persisted)
  try {
    const vr = JSON.parse(localStorage.getItem('video_room_contacts') || '[]');
    for (const c of vr) {
      if (!addedIds.has(c.id) && !removedIds.has(c.id)) {
        contacts.push({ ...c, source: 'manual' });
        addedIds.add(c.id);
      }
    }
  } catch (_) {}

  // 5) No seeds — if empty, show helpful empty state
  return contacts;
}

function persistVideoRoomContacts(contacts) {
  const manual = contacts.filter(c => c.source === 'manual');
  localStorage.setItem('video_room_contacts', JSON.stringify(manual));
}

function addRemovedId(id) {
  try {
    const removed = JSON.parse(localStorage.getItem('video_room_removed_ids') || '[]');
    if (!removed.includes(id)) {
      removed.push(id);
      localStorage.setItem('video_room_removed_ids', JSON.stringify(removed));
    }
  } catch (_) {}
}

const TX = [
  { en:"Good morning everyone, let's get started with today's agenda.", zh:'大家早上好，让我们开始今天的议程。', speaker:'AI Huihui' },
  { en:'It is necessary to plan how to better link the procurement and sales sides.', zh:'有必要规划如何更好地连接采购和销售端。', speaker:'Wang Dapeng' },
  { en:'I have a question about the timeline for Q3 deliverables.', zh:'我有关于第三季度交付时间线的问题。', speaker:'Zhang Xiaoyu' },
  { en:'Pointed out the possibility of project delays, but also saw that efforts are being made to adhere to the original schedule.', zh:'指出了项目延迟的可能性，但也看到正在努力遵守原定时间表。', speaker:'Wang Xiaohong' },
  { en:'Meanwhile, Wang Xiao tactfully brought up the current risk factors.', zh:'与此同时，王晓巧妙地向与会者提出了当前的风险因素。', speaker:'AI Huihui' },
  { en:"Though she couldn't help but convey a hint of concern about the project's progress.", zh:'尽管她忍不住表达了对项目进展的担忧。', speaker:'Wang Dapeng' },
  { en:"Let's review the action items from last week's meeting.", zh:'让我们回顾上周会议的行动项目。', speaker:'AI Huihui' },
  { en:'The marketing campaign needs to launch by next Monday.', zh:'营销活动需要在下周一前启动。', speaker:'Wang Xiaohong' },
  { en:"I'll coordinate with the design team on the assets.", zh:'我会与设计团队协调相关素材。', speaker:'Zhang Xiaoyu' },
  { en:"Great, let's also discuss the budget allocation for this quarter.", zh:'好的，我们来讨论一下本季度的预算分配。', speaker:'Wang Dapeng' },
  { en:'Forty percent for R&D, thirty for marketing, thirty for operations.', zh:'研发占40%，营销占30%，运营占30%。', speaker:'AI Huihui' },
  { en:'That sounds reasonable. Any objections?', zh:'听起来很合理。有反对意见吗？', speaker:'Wang Xiaohong' },
  { en:'No objections from my side.', zh:'我没有异议。', speaker:'Zhang Xiaoyu' },
  { en:"Any more questions before we wrap up today's session?", zh:'结束前还有问题吗？', speaker:'AI Huihui' },
];

const CHAT_SEED = [
  { id:1, from:'AI Huihui', av:'👩', txt:'Welcome everyone! The meeting minutes will be generated automatically.', t:'20:26', me:false },
  { id:2, from:'Wang Dapeng', av:'👨', txt:'Thanks! I can see the real-time summary on the side panel.', t:'20:26', me:false },
];

// ============== MAIN COMPONENT ==============
export default function VideoRoom({ user, onLeave, classData }) {
  const name = user?.name || 'You';
  const role = user?.role || 'student';
  const av = user?.avatar || '🙂';

  // Meeting state
  const [meetingTitle] = useState('Weekly Product Sync — Q3 Planning');
  const [meetingId] = useState(() => String(Math.floor(100000000 + Math.random() * 900000000)));
  const [duration, setDuration] = useState(5469); // Start at ~1:31:09 like screenshot
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [layoutMode, setLayoutMode] = useState('spotlight');
  const [pinnedMember, setPinnedMember] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fullscreenTile, setFullscreenTile] = useState(false);

  // Side panels
  const [activePanel, setActivePanel] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  // Members / Media - start with ONLY the host
  const [members, setMembers] = useState([{
    id: 'me', name, avatar: av, role: 'Host', status: 'active', speaking: false, videoOn: false, micOn: false, isMe: true, verified: true
  }]);
  // Contacts (people you can invite) — loaded from real registered data
  const [contacts, setContacts] = useState(loadContactsFromLocalStorage);
  const [contactSearch, setContactSearch] = useState('');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', role: 'Student', email: '', subject: '' });
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenVideoRef = useRef(null);
  const [screenStream, setScreenStream] = useState(null);

  // Chat
  const [chatMsg, setChatMsg] = useState('');
  const [chatMsgs, setChatMsgs] = useState([]);
  const chatEndRef = useRef(null);

  // Transcript
  const [transcriptLines, setTranscriptLines] = useState(TX.slice(0, 5).map((l, i) => ({ ...l, time: fmtTime(5469 + i * 300), id: i })));
  const txIdx = useRef(5);
  const [isTranscribing, setIsTranscribing] = useState(true);

  // AI Summary
  const [aiSummary, setAiSummary] = useState([
    { title: 'Conference', content: 'It is necessary to plan how to better link the procurement and sales sides in the next stage to increase the company\'s overall profit scale.', expanded: true },
    { title: 'Meeting to be done', content: 'Finalize Q3 budget allocation, coordinate design assets for marketing campaign.', expanded: false },
  ]);

  // Call state
  const [callingMember, setCallingMember] = useState(null);
  const [ringing, setRinging] = useState(false);

  // ============== INVITE CODE SYSTEM ==============
  const generate6DigitCode = () => String(Math.floor(100000 + Math.random() * 900000));
  const [inviteCode, setInviteCode] = useState(() => {
    const saved = localStorage.getItem('video_room_invite_code');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Expire after 24 hours
        if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) return parsed.code;
      } catch (_) {}
    }
    const code = generate6DigitCode();
    localStorage.setItem('video_room_invite_code', JSON.stringify({ code, ts: Date.now() }));
    return code;
  });
  const [inviteCopied, setInviteCopied] = useState('');
  const [guestJoining, setGuestJoining] = useState(false);
  const [guestName, setGuestName] = useState('');
  const guestInputRef = useRef(null);

  // Regenerate invite code
  const regenerateCode = () => {
    const code = generate6DigitCode();
    setInviteCode(code);
    localStorage.setItem('video_room_invite_code', JSON.stringify({ code, ts: Date.now() }));
  };

  // Build invite link
  const inviteLink = `${window.location.origin}${window.location.pathname}#?invite=${inviteCode}`;

  // Copy helpers
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setInviteCopied(label);
      setTimeout(() => setInviteCopied(''), 2000);
    }).catch(() => {});
  };

  // ============== GUEST JOIN (via invite code) ==============
  // Check URL hash for invite code on mount
  useEffect(() => {
    const hash = window.location.hash || '';
    const match = hash.match(/[?&]invite=(\d{6})/);
    if (match) {
      const urlCode = match[1];
      const saved = localStorage.getItem('video_room_invite_code');
      let valid = false;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.code === urlCode && (Date.now() - parsed.ts < 24 * 60 * 60 * 1000)) {
            valid = true;
          }
        } catch (_) {}
      }
      if (valid) {
        setGuestJoining(true);
        setTimeout(() => guestInputRef.current?.focus(), 100);
      }
    }
  }, []);

  const handleGuestJoin = () => {
    const name = guestName.trim();
    if (!name) return;
    const guestMember = {
      id: `guest-${Date.now()}`,
      name,
      avatar: '🔑',
      role: 'Guest',
      status: 'active',
      speaking: false,
      videoOn: false,
      micOn: true,
      verified: true,
      isMe: false,
      inCall: true,
      source: 'invite'
    };
    setMembers(prev => [...prev, guestMember]);
    setChatMsgs(prev => [...prev, {
      id: Date.now(),
      sender: 'System',
      avatar: '🔑',
      text: `${name} joined via invite code.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: false,
      isSystem: true
    }]);
    setGuestJoining(false);
    setGuestName('');
    // Clean URL hash so refresh doesn't re-trigger
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // ============== TIMER ==============
  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ============== CAMERA ==============
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = stream;
        // Start with camera & mic OFF
        stream.getVideoTracks().forEach(t => { t.enabled = false; });
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (e) {
        console.log('Camera error:', e);
        setVideoEnabled(false);
        setMembers(prev => prev.map(m => m.id === 'me' ? { ...m, videoOn: false } : m));
      }
    })();
    return () => { if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; } };
  }, []);

  // Re-attach srcObject when video element re-enters DOM after toggling video on
  useEffect(() => {
    if (videoEnabled && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [videoEnabled]);

  useEffect(() => {
    const vt = localStreamRef.current?.getVideoTracks()[0];
    if (vt) vt.enabled = videoEnabled;
  }, [videoEnabled]);
  useEffect(() => {
    const at = localStreamRef.current?.getAudioTracks()[0];
    if (at) at.enabled = audioEnabled;
  }, [audioEnabled]);

  // ============== TRANSCRIPT SIMULATION ==============
  useEffect(() => {
    if (!isTranscribing) return;
    const interval = setInterval(() => {
      if (txIdx.current < TX.length) {
        const line = TX[txIdx.current];
        setTranscriptLines(prev => [...prev, { ...line, time: fmtTime(duration), id: Date.now() }]);
        setMembers(prev => prev.map(m => {
          if (m.name === line.speaker) return { ...m, speaking: true };
          return m;
        }));
        setTimeout(() => {
          setMembers(prev => prev.map(m => ({ ...m, speaking: false })));
        }, 2500);
        txIdx.current++;
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isTranscribing, duration]);

  // ============== SCROLL CHAT ==============
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  // ============== ACTIONS ==============
  const toggleVideo = () => {
    const vt = localStreamRef.current?.getVideoTracks()[0];
    if (!vt) return;
    vt.enabled = !vt.enabled;
    setVideoEnabled(vt.enabled);
    setMembers(prev => prev.map(m => m.id === 'me' ? { ...m, videoOn: vt.enabled } : m));
  };
  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    setMembers(prev => prev.map(m => m.id === 'me' ? { ...m, micOn: !audioEnabled } : m));
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
        setScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => { setScreenSharing(false); setScreenStream(null); };
      } catch (e) { }
    }
  };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    const msg = { id: Date.now(), sender: 'You', avatar: av, text: chatMsg.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: true };
    setChatMsgs(prev => [...prev, msg]);
    setChatMsg('');
  };

  const sendEmoji = (emoji) => {
    const msg = { id: Date.now(), sender: 'You', avatar: av, text: emoji, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: true, isEmoji: true };
    setChatMsgs(prev => [...prev, msg]);
    setShowEmojiPicker(false);
  };

  const togglePanel = (p) => setActivePanel(prev => prev === p ? null : p);

  const handleLeave = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    onLeave?.();
  };

  // ============== CALL A CONTACT / MEMBER ==============
  const callMember = (member) => {
    if (member.isMe) return;
    setCallingMember(member);
    setRinging(true);
    setTimeout(() => {
      setRinging(false);
      setCallingMember(null);
      // If not already in members, add them to the room
      setMembers(prev => {
        const exists = prev.find(m => m.id === member.id);
        if (exists) {
          return prev.map(m => m.id === member.id ? { ...m, status: 'active', inCall: true } : m);
        }
        return [...prev, {
          id: member.id,
          name: member.name,
          avatar: member.avatar || '👤',
          role: member.role || 'Participant',
          subject: member.subject,
          speaking: false,
          videoOn: true,
          micOn: true,
          verified: !!member.verified,
          status: 'active',
          inCall: true,
          isMe: false
        }];
      });
      // Also add to chat
      setChatMsgs(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        avatar: '📞',
        text: `${member.name} joined the call.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: false,
        isSystem: true
      }]);
    }, 2500);
  };

  // Filter contacts not yet in the room
  const availableContacts = contacts.filter(c => !members.some(m => m.id === c.id));
  const filteredAvailable = availableContacts.filter(c => {
    const q = contactSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q) || (c.subject || '').toLowerCase().includes(q);
  });

  // Remove a participant
  const removeMember = (memberId) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  // ============== CONTACT MANAGEMENT ==============
  const AVATAR_MAP = { Student: '👦', Teacher: '👩‍🏫', Parent: '👨‍👩‍👧' };
  const addContact = () => {
    const name = (newContact.name || '').trim();
    if (!name) return;
    const c = {
      id: `manual-${Date.now()}`,
      name,
      role: newContact.role || 'Student',
      email: (newContact.email || '').trim(),
      subject: (newContact.subject || '').trim(),
      avatar: AVATAR_MAP[newContact.role] || '👤',
      status: 'active',
      source: 'manual'
    };
    const updated = [c, ...contacts];
    setContacts(updated);
    persistVideoRoomContacts(updated);
    setNewContact({ name: '', role: 'Student', email: '', subject: '' });
    setShowAddContactForm(false);
  };
  const removeContact = (contactId) => {
    const updated = contacts.filter(c => c.id !== contactId);
    setContacts(updated);
    persistVideoRoomContacts(updated);
    addRemovedId(contactId);
  };

  const getMemberTiles = () => {
    if (layoutMode === 'speaker') {
      const speaker = pinnedMember || members.find(m => m.speaking && !m.isMe) || members[0];
      const others = members.filter(m => m !== speaker);
      return { speaker, others };
    }
    if (layoutMode === 'spotlight') {
      const mainPerson = pinnedMember || members.find(m => m.speaking) || members[0];
      const sideParticipants = members.filter(m => m !== mainPerson);
      return { speaker: mainPerson, others: sideParticipants, mainPerson, sideParticipants };
    }
    return { speaker: null, others: members };
  };

  const { speaker, others, mainPerson = members[0], sideParticipants = members.slice(1) } = getMemberTiles();
  const visibleMembers = screenSharing ? members.slice(0, 4) : (layoutMode === 'speaker' ? [speaker, ...others] : members);

  const handleSpotlightClick = (m) => {
    if (!m.isMe) setPinnedMember(m);
  };

  // Emoji reactions
  const EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '🔥', '😮', '🤔'];

  return (
    <div className="vroom">
      {/* ========== TOP BAR ========== */}
      <header className="vr-top">
        <div className="vr-top-l">
          <div className="vr-top-meeting-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <div className="vr-top-info">
            <span className="vr-top-title">Meeting details</span>
            <span className="vr-top-meta">{fmtTime(duration)}</span>
          </div>
          <div className="vr-top-signal">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
          </div>
          <button className="vr-top-icon-btn" title="Copy meeting info">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          </button>
        </div>
        <div className="vr-top-r">
          <button className="vr-top-layout-btn" onClick={() => setLayoutMode(l => l === 'spotlight' ? 'speaker' : l === 'speaker' ? 'grid' : 'spotlight')}>
            <I.Layout size={14} />
            <span>{layoutMode === 'spotlight' ? 'Spotlight' : layoutMode === 'speaker' ? 'Speaker View' : 'Grid Layout'}</span>
            <I.ChevronDown size={12} />
          </button>
          <button className="vr-top-icon-btn" title="Host Tools">
            <I.Crown size={14} />
            <span>Host Tools</span>
            <I.ChevronDown size={10} />
          </button>
          <button className="vr-top-icon-btn" title="Settings">
            <I.Settings size={14} />
          </button>
          <div className="vr-top-divider" />
          <button className="vr-top-win-btn" title="Minimize"><I.WindowMin size={12} /></button>
          <button className="vr-top-win-btn" title="Maximize"><I.WindowMax size={12} /></button>
          <button className="vr-top-win-btn vr-top-close" title="Close" onClick={handleLeave}><I.Close size={12} /></button>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <div className="vr-main">
        {/* --- Video Area --- */}
        <div className="vr-video-area" style={activePanel ? { marginRight: 360 } : {}}>
          {/* Screen Share Overlay */}
          {screenSharing && (
            <div className="vr-screen-share">
              <video ref={screenVideoRef} autoPlay playsInline className="vr-screen-vid" />
              <div className="vr-screen-badge"><I.Screen size={12} /> You are sharing screen</div>
            </div>
          )}

          {/* Layout: Speaker View */}
          {layoutMode === 'speaker' && speaker && !screenSharing && (
            <div className="vr-speaker-view">
              <div className={`vr-tile vr-tile-speaker ${speaker.speaking ? 'vr-speaking' : ''}`}>
                {speaker.isMe ? (
                  videoEnabled ? <video ref={localVideoRef} autoPlay playsInline muted className="vr-tile-vid" /> : <div className="vr-tile-off"><span className="vr-avatar-big">{av}</span></div>
                ) : (
                  <div className="vr-tile-off"><span className="vr-avatar-big">{speaker.avatar}</span></div>
                )}
                <div className="vr-tile-label">
                  <span className="vr-tile-name">{speaker.isMe ? `${name}` : speaker.name}</span>
                  <span className="vr-tile-role">{speaker.isMe ? 'Host' : speaker.role}</span>
                  {speaker.verified && <span className="vr-verified">✓</span>}
                  {!speaker.micOn && <span className="vr-mute-badge"><I.MicOff size={10} /></span>}
                </div>
              </div>
              {pinnedMember && (
                <button className="vr-unpin" onClick={() => setPinnedMember(null)}><I.Pin size={11} /></button>
              )}
              <div className="vr-speaker-strip">
                {others.map(m => (
                  <div key={m.id}
                    className={`vr-tile vr-tile-thumb ${m.speaking ? 'vr-speaking' : ''}`}
                    onClick={() => setPinnedMember(m)}
                  >
                    {m.isMe ? (
                      videoEnabled ? <video ref={localVideoRef} autoPlay playsInline muted className="vr-tile-vid" /> : <span className="vr-avatar-sm">{av}</span>
                    ) : (
                      <span className="vr-avatar-sm">{m.avatar}</span>
                    )}
                    <div className="vr-tile-label-mini">
                      <span>{m.isMe ? 'You' : m.name}</span>
                      {m.micOn ? <I.Mic size={8} /> : <I.MicOff size={8} style={{ color: '#ff3b30' }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layout: Spotlight (Theater) View */}
          {layoutMode === 'spotlight' && !screenSharing && (
            <div className="vr-spotlight-view">
              {/* Main speaker tile */}
              <div className={`vr-tile vr-tile-spotlight ${(mainPerson.speaking) ? 'vr-speaking' : ''}`}>
                {mainPerson.isMe ? (
                  videoEnabled ? <video ref={localVideoRef} autoPlay playsInline muted className="vr-tile-vid" /> : <div className="vr-tile-off"><span className="vr-avatar-big">{av}</span></div>
                ) : (
                  <div className="vr-tile-off"><span className="vr-avatar-big">{mainPerson.avatar}</span></div>
                )}
                <div className="vr-tile-label">
                  <span className="vr-tile-name">{mainPerson.isMe ? name : mainPerson.name}</span>
                  <span className="vr-tile-role">{mainPerson.isMe ? 'Host' : mainPerson.role}</span>
                  {mainPerson.verified && <span className="vr-verified">✓</span>}
                  {!mainPerson.micOn && <span className="vr-mute-badge"><I.MicOff size={10} /></span>}
                  {mainPerson.speaking && <span className="vr-speaking-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg></span>}
                </div>
              </div>
              {/* Side participant strip */}
              <div className="vr-spotlight-strip">
                {sideParticipants.map(m => (
                  <div key={m.id}
                    className={`vr-tile vr-tile-spot ${m.speaking ? 'vr-speaking' : ''}`}
                    onClick={() => handleSpotlightClick(m)}
                  >
                    {m.isMe ? (
                      videoEnabled ? <video ref={localVideoRef} autoPlay playsInline muted className="vr-tile-vid" /> : <span className="vr-avatar-sm">{av}</span>
                    ) : (
                      <span className="vr-avatar-sm">{m.avatar}</span>
                    )}
                    <div className="vr-tile-label-min">
                      <span>{m.isMe ? 'You' : m.name}</span>
                      {!m.micOn && <I.MicOff size={8} style={{ color: '#ff3b30' }} />}
                      {m.speaking && <span style={{width:6,height:6,background:'#34c759',borderRadius:'50%',display:'inline-block'}} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layout: Grid View */}
          {(layoutMode === 'grid' || (screenSharing && layoutMode !== 'speaker')) && (
            <div className={`vr-grid ${screenSharing ? 'vr-grid-pip' : ''}`}>
              {screenSharing ? (
                members.slice(0, 4).map(m => (
                  <div key={m.id} className={`vr-tile vr-tile-grid ${m.speaking ? 'vr-speaking' : ''}`}>
                    {m.isMe ? (
                      videoEnabled ? <video ref={localVideoRef} autoPlay playsInline muted className="vr-tile-vid" /> : <span className="vr-avatar-big">{av}</span>
                    ) : (
                      <span className="vr-avatar-big">{m.avatar}</span>
                    )}
                    <div className="vr-tile-label">
                      <span className="vr-tile-name">{m.isMe ? name : m.name}</span>
                      {!m.micOn && <I.MicOff size={10} style={{ color: '#ff3b30' }} />}
                    </div>
                  </div>
                ))
              ) : (
                visibleMembers.map(m => (
                  <div key={m.id}
                    className={`vr-tile vr-tile-grid ${m.speaking ? 'vr-speaking' : ''}`}
                    onClick={() => layoutMode === 'speaker' && !m.isMe && setPinnedMember(m)}
                  >
                    {m.isMe ? (
                      videoEnabled ? <video ref={localVideoRef} autoPlay playsInline muted className="vr-tile-vid" /> : <div className="vr-tile-off"><span className="vr-avatar-big">{av}</span></div>
                    ) : (
                      <div className="vr-tile-off"><span className="vr-avatar-big">{m.avatar}</span></div>
                    )}
                    <div className="vr-tile-label">
                      <span className="vr-tile-name">{m.isMe ? name : m.name}</span>
                      <span className="vr-tile-role">{m.isMe ? 'Host' : m.role}</span>
                      {m.verified && <span className="vr-verified">✓</span>}
                      {!m.micOn && <span className="vr-mute-badge"><I.MicOff size={10} /></span>}
                      {m.speaking && <span className="vr-speaking-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg></span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* HD Badge */}
          <div className="vr-hd-badge">HD ULTRA</div>

          {/* Empty room label */}
          {members.length <= 1 && (
            <div className="vr-empty-room-label">
              <span className="vr-empty-dot" />
              <span>Waiting for participants · Invite from contacts to start the class</span>
            </div>
          )}
        </div>

        {/* --- Side Panel --- */}
        {activePanel && (
          <aside className="vr-panel">
            {/* Members Panel */}
            {activePanel === 'members' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-title">
                    <I.Members size={16} />
                    <span>Participants ({members.length})</span>
                  </div>
                  <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                </div>
                <div className="vr-panel-search">
                  <I.Search size={14} />
                  <input placeholder="Search participants" />
                </div>
                <div className="vr-members-body">
                  {/* Current participants */}
                  {members.map(m => (
                    <div key={m.id} className={`vr-member-row ${m.isMe ? 'vr-member-me' : ''}`}>
                      <div className="vr-member-av">
                        <span>{m.avatar}</span>
                        <span className="vr-status-dot" style={{ background: statusDot[m.status] || '#8e8e93' }} />
                      </div>
                      <div className="vr-member-info">
                        <span className="vr-member-name">
                          {m.isMe ? `${name}` : m.name}
                          {m.role === 'teacher' && <I.Crown size={10} style={{ color: '#ff9f0a', marginLeft: 4 }} />}
                        </span>
                        <span className="vr-member-sub">{m.isMe ? 'Host · Host' : (m.role || 'Participant')}{m.subject ? ` · ${m.subject}` : ''}</span>
                      </div>
                      <div className="vr-member-actions">
                        {m.micOn ? <I.Mic size={14} style={{ color: '#8e8e93' }} /> : <I.MicOff size={14} style={{ color: '#ff3b30' }} />}
                        {m.videoOn ? <I.Camera size={14} style={{ color: '#8e8e93' }} /> : <I.CameraOff size={14} style={{ color: '#8e8e93' }} />}
                        {!m.isMe && (
                          <button className="vr-remove-btn" onClick={() => removeMember(m.id)} title="Remove">
                            <I.Close size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Divider + Add from Contacts */}
                  <div className="vr-members-divider">
                    <span>Add from Contacts</span>
                    <span className="vr-members-divider-count">{availableContacts.length} available</span>
                  </div>
                  <div className="vr-panel-search" style={{ marginTop: 0 }}>
                    <I.Search size={14} />
                    <input placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
                    <button className="vr-add-contact-btn" onClick={() => setShowAddContactForm(!showAddContactForm)} title="Add contact" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', padding: 2 }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </button>
                  </div>

                  {/* Add Contact Form */}
                  {showAddContactForm && (
                    <div className="vr-add-contact-form">
                      <input placeholder="Name *" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                      <select value={newContact.role} onChange={e => setNewContact({ ...newContact, role: e.target.value })}>
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Parent">Parent</option>
                      </select>
                      <input placeholder="Email (optional)" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
                      <input placeholder="Subject (optional)" value={newContact.subject} onChange={e => setNewContact({ ...newContact, subject: e.target.value })} />
                      <div className="vr-add-contact-actions">
                        <button className="vr-add-contact-save" onClick={addContact}>Add Contact</button>
                        <button className="vr-add-contact-cancel" onClick={() => { setShowAddContactForm(false); setNewContact({ name: '', role: 'Student', email: '', subject: '' }); }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {filteredAvailable.length === 0 ? (
                    <div className="vr-no-contacts">
                      <span style={{ fontSize: 28, opacity: 0.4 }}>📋</span>
                      <span style={{ fontSize: 12, color: '#8e8e93', marginTop: 6 }}>
                        {contactSearch ? 'No contacts match your search' : 
                         contacts.length === 0 ? 'No contacts yet — Register families/teachers/students first, or use + to add one.' :
                         'All contacts are already in the call'}
                      </span>
                    </div>
                  ) : (
                    filteredAvailable.map(c => (
                      <div key={c.id} className="vr-member-row vr-contact-row" onClick={() => callMember(c)} title={`Click to call ${c.name}`}>
                        <div className="vr-member-av">
                          <span>{c.avatar}</span>
                          <span className="vr-status-dot" style={{ background: statusDot[c.status] || '#8e8e93' }} />
                        </div>
                        <div className="vr-member-info">
                          <span className="vr-member-name">{c.name}</span>
                          <span className="vr-member-sub">{c.role}{c.subject ? ` · ${c.subject}` : ''}{c.source === 'manual' ? ' · Added by you' : ''}</span>
                        </div>
                        <div className="vr-member-actions">
                          <button className="vr-call-btn" onClick={(e) => { e.stopPropagation(); callMember(c); }} title="Call to join">
                            <I.VideoCall size={14} />
                          </button>
                          <button className="vr-remove-btn" onClick={(e) => { e.stopPropagation(); removeContact(c.id); }} title="Remove contact">
                            <I.Close size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Chat Panel */}
            {activePanel === 'chat' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-title">
                    <I.Chat size={16} />
                    <span>Chat</span>
                  </div>
                  <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                </div>
                <div className="vr-chat-body">
                  <div className="vr-chat-msgs">
                    {chatMsgs.map(m => (
                      <div key={m.id} className={`vr-msg ${m.isMe ? 'vr-msg-me' : ''} ${m.isSystem ? 'vr-msg-system' : ''}`}>
                        {!m.isSystem && <span className="vr-msg-av">{m.avatar}</span>}
                        <div className="vr-msg-bub">
                          {!m.isSystem && <span className="vr-msg-sender">{m.sender}</span>}
                          <span className={`vr-msg-txt ${m.isEmoji ? 'vr-msg-emoji' : ''}`}>{m.text}</span>
                          {!m.isSystem && <span className="vr-msg-time">{m.time}</span>}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="vr-chat-input">
                    <input placeholder="Send a message to everyone..." value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
                    <button onClick={sendChat}><I.Send size={16} /></button>
                  </div>
                </div>
              </>
            )}

            {/* Transcript Panel */}
            {activePanel === 'transcript' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-title">
                    <I.Caption size={16} />
                    <span>Yuanbao Minutes</span>
                  </div>
                  <div className="vr-panel-actions">
                    <button className={`vr-translate-toggle ${showTranslation ? 'vr-translate-on' : ''}`} onClick={() => setShowTranslation(!showTranslation)}>
                      <I.Translate size={12} /> {showTranslation ? '中文' : 'EN'}
                    </button>
                    <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                  </div>
                </div>
                <div className="vr-transcript-body">
                  {/* AI Summary Section */}
                  <div className="vr-ai-summary">
                    <div className="vr-ai-header">
                      <I.Sparkle size={14} style={{ color: '#007aff' }} />
                      <span>Real-time summary</span>
                    </div>
                    {aiSummary.map((item, idx) => (
                      <div key={idx} className="vr-ai-item">
                        <div className="vr-ai-title" onClick={() => setAiSummary(prev => prev.map((s, i) => i === idx ? { ...s, expanded: !s.expanded } : s))}>
                          <span>{item.title}</span>
                          {item.expanded ? <I.ChevronUp size={12} /> : <I.ChevronDown size={12} />}
                        </div>
                        {item.expanded && <div className="vr-ai-content">{item.content}</div>}
                      </div>
                    ))}
                    <div className="vr-ai-divider" />
                    <div className="vr-ai-feature">
                      <I.Check size={12} style={{ color: '#34c759' }} />
                      <span>Distinguish participating speakers</span>
                    </div>
                  </div>

                  {/* Live Transcript */}
                  <div className="vr-transcript-live">
                    {isTranscribing && (
                      <div className="vr-transcribing-indicator">
                        <span className="vr-pulse-dot" /> Transcribing live
                      </div>
                    )}
                    {transcriptLines.map(line => (
                      <div key={line.id} className="vr-transcript-line">
                        <div className="vr-transcript-header">
                          <span className="vr-transcript-speaker">{line.speaker}</span>
                          <span className="vr-transcript-time">{line.time}</span>
                        </div>
                        <p className="vr-transcript-text">{showTranslation ? line.zh : line.en}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* AI Secretary */}
                  <div className="vr-ai-secretary">
                    <div className="vr-ai-avatar">🤖</div>
                    <div className="vr-ai-info">
                      <span>WeMeet Secretary</span>
                      <small>AI-powered meeting assistant</small>
                    </div>
                    <button className="vr-ai-action">Summary now</button>
                  </div>
                </div>
              </>
            )}

            {/* Invite Panel — Share code to let non-contacts join */}
            {activePanel === 'invite' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-title">
                    <I.Invite size={16} />
                    <span>Invite to Room</span>
                  </div>
                  <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                </div>
                <div className="vr-invite-body">
                  {/* Room Info */}
                  <div className="vr-invite-section">
                    <h4 className="vr-invite-label">Meeting ID</h4>
                    <div className="vr-invite-code-row">
                      <span className="vr-invite-id">{meetingId}</span>
                      <button className="vr-invite-copy" onClick={() => copyToClipboard(meetingId, 'id')}>
                        {inviteCopied === 'id' ? <><I.Check size={12} /> Copied</> : <><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy ID</>}
                      </button>
                    </div>
                  </div>

                  {/* Invite Code (One-Time Access) */}
                  <div className="vr-invite-section vr-invite-highlight">
                    <h4 className="vr-invite-label">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
                      One-Time Access Code
                    </h4>
                    <p className="vr-invite-desc">Share this 6-digit code. Anyone can join your room — no account or contact needed.</p>
                    <div className="vr-invite-big-code">{inviteCode}</div>
                    <div className="vr-invite-btn-row">
                      <button className="vr-invite-copy vr-invite-copy-primary" onClick={() => copyToClipboard(inviteCode, 'code')}>
                        {inviteCopied === 'code' ? <><I.Check size={12} /> Copied!</> : <><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy Code</>}
                      </button>
                      <button className="vr-invite-copy vr-invite-copy-primary" onClick={() => copyToClipboard(inviteLink, 'link')}>
                        {inviteCopied === 'link' ? <><I.Check size={12} /> Copied!</> : <><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg> Copy Link</>}
                      </button>
                    </div>
                    <button className="vr-invite-refresh" onClick={regenerateCode}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                      Generate New Code
                    </button>
                  </div>

                  {/* How it works */}
                  <div className="vr-invite-steps">
                    <h4 className="vr-invite-label">How participants join</h4>
                    <div className="vr-invite-step">
                      <span className="vr-invite-step-num">1</span>
                      <span>Share the <strong>6-digit code</strong> or <strong>link</strong> with them (WhatsApp, SMS, email, etc.)</span>
                    </div>
                    <div className="vr-invite-step">
                      <span className="vr-invite-step-num">2</span>
                      <span>They open the link or paste the code on the <strong>Join a Room</strong> box on the dashboard.</span>
                    </div>
                    <div className="vr-invite-step">
                      <span className="vr-invite-step-num">3</span>
                      <span>They enter their name — then join your room instantly as a <strong>verified guest</strong>.</span>
                    </div>
                  </div>

                  {/* Quick test: simulate guest join */}
                  <div className="vr-invite-test">
                    <h4 className="vr-invite-label">Quick Test</h4>
                    <p className="vr-invite-desc">Simulate a guest joining with this code:</p>
                    <div className="vr-invite-test-row">
                      <input
                        placeholder="Guest name..."
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleGuestJoin()}
                        className="vr-invite-test-input"
                      />
                      <button className="vr-invite-test-btn" onClick={handleGuestJoin} disabled={!guestName.trim()}>
                        <I.VideoCall size={14} /> Join as Guest
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* More Panel */}
            {activePanel === 'more' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-title">
                    <I.More size={16} />
                    <span>More</span>
                  </div>
                  <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                </div>
                <div className="vr-more-body">
                  <button className={`vr-more-item ${isRecording ? 'vr-more-active' : ''}`} onClick={() => setIsRecording(!isRecording)}>
                    <span className="vr-more-icon" style={isRecording ? { color: '#ff3b30' } : {}}><I.Record size={20} /></span>
                    <div className="vr-more-text"><strong>Record</strong><small>{isRecording ? 'Recording in progress...' : 'Start recording'}</small></div>
                  </button>
                  <button className={`vr-more-item ${isTranscribing ? 'vr-more-active' : ''}`} onClick={() => setIsTranscribing(!isTranscribing)}>
                    <span className="vr-more-icon" style={isTranscribing ? { color: '#007aff' } : {}}><I.Caption size={20} /></span>
                    <div className="vr-more-text"><strong>Transcription</strong><small>{isTranscribing ? 'On · AI captions active' : 'Turn on captions'}</small></div>
                  </button>
                  <button className="vr-more-item">
                    <span className="vr-more-icon"><I.Poll size={20} /></span>
                    <div className="vr-more-text"><strong>Poll / Vote</strong><small>Create a quick poll</small></div>
                  </button>
                  <button className="vr-more-item" onClick={() => setShowTranslation(!showTranslation)}>
                    <span className="vr-more-icon"><I.Translate size={20} /></span>
                    <div className="vr-more-text"><strong>Translation</strong><small>{showTranslation ? 'Chinese → English' : 'English → Chinese'}</small></div>
                  </button>
                  <button className="vr-more-item" onClick={() => togglePanel('invite')}>
                    <span className="vr-more-icon"><I.Invite size={20} /></span>
                    <div className="vr-more-text"><strong>Invite</strong><small>Share room code & invite link</small></div>
                  </button>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* ========== BOTTOM CONTROL BAR ========== */}
      <div className="vr-bar-wrap">
        <div className="vr-bar">
          {/* Left group - reactions */}
          <div className="vr-bar-group">
            <div className="vr-bar-emoji-wrap">
              <button className="vr-bar-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Reactions">
                <I.Emoji />
              </button>
              {showEmojiPicker && (
                <div className="vr-emoji-picker">
                  {EMOJIS.map(e => <button key={e} className="vr-emoji-btn" onClick={() => sendEmoji(e)}>{e}</button>)}
                </div>
              )}
            </div>
            <button className={`vr-bar-btn ${handRaised ? 'vr-bar-on' : ''}`} onClick={() => setHandRaised(!handRaised)} title="Raise Hand">
              <I.Hand />
            </button>
          </div>

          {/* Center group - main controls */}
          <div className="vr-bar-group">
            <button className={`vr-bar-btn ${!audioEnabled ? 'vr-bar-off' : ''}`} onClick={toggleAudio} title="Microphone">
              {audioEnabled ? <I.Mic /> : <I.MicOff />}
              <span className="vr-bar-lbl">Mute</span>
            </button>
            <button className={`vr-bar-btn ${!videoEnabled ? 'vr-bar-off' : ''}`} onClick={toggleVideo} title="Camera">
              {videoEnabled ? <I.Camera /> : <I.CameraOff />}
              <span className="vr-bar-lbl">{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
            </button>
            <button className={`vr-bar-btn ${screenSharing ? 'vr-bar-on' : ''}`} onClick={toggleScreenShare} title="Share Screen">
              <I.Screen />
              <span className="vr-bar-lbl">Share Screen</span>
            </button>
            <button className="vr-bar-btn" onClick={() => togglePanel('invite')} title="Invite">
              <I.Invite />
              <span className="vr-bar-lbl">Invite</span>
            </button>
          </div>

          {/* Right group - panels */}
          <div className="vr-bar-group">
            <button className={`vr-bar-btn ${activePanel === 'members' ? 'vr-bar-on' : ''}`} onClick={() => togglePanel('members')} title="Attendees">
              <I.Members />
              <span className="vr-bar-lbl">Attendees({members.length})</span>
            </button>
            <button className={`vr-bar-btn ${activePanel === 'chat' ? 'vr-bar-on' : ''}`} onClick={() => togglePanel('chat')} title="Chat">
              <I.Chat />
              <span className="vr-bar-lbl">Chat</span>
              {chatMsgs.length > 0 && <span className="vr-bar-badge">{chatMsgs.length}</span>}
            </button>
            <button className={`vr-bar-btn ${activePanel === 'transcript' ? 'vr-bar-on' : ''}`} onClick={() => togglePanel('transcript')} title="Yuanbao Minutes">
              <I.AI size={20} />
              <span className="vr-bar-lbl">Yuanbao Minutes</span>
            </button>
            <button className="vr-bar-btn" title="Apps">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
              <span className="vr-bar-lbl">App</span>
            </button>
          </div>

          {/* End call */}
          <button className="vr-bar-end" onClick={handleLeave} title="End">
            <span>End</span>
          </button>
        </div>
      </div>

      {/* ========== GUEST JOIN OVERLAY (when invite code is in URL) ========== */}
      {guestJoining && (
        <div className="vr-ring-overlay">
          <div className="vr-guest-card">
            <span className="vr-guest-icon">🔑</span>
            <h2>You've been invited!</h2>
            <p className="vr-guest-room">Room code: <strong>{inviteCode}</strong></p>
            <p className="vr-guest-desc">Enter your name to join the video classroom as a guest.</p>
            <input
              ref={guestInputRef}
              className="vr-guest-input"
              placeholder="Your name"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuestJoin()}
              autoFocus
            />
            <div className="vr-guest-actions">
              <button className="vr-guest-join" onClick={handleGuestJoin} disabled={!guestName.trim()}>
                <I.VideoCall size={16} /> Join Room
              </button>
              <button className="vr-guest-cancel" onClick={() => { setGuestJoining(false); setGuestName(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== RINGING OVERLAY ========== */}
      {ringing && callingMember && (
        <div className="vr-ring-overlay">
          <div className="vr-ring-card">
            <span className="vr-ring-av">{callingMember.avatar}</span>
            <h2>{callingMember.name}</h2>
            <p>Calling...</p>
            <div className="vr-ring-dots"><span /><span /><span /></div>
            <button className="vr-ring-cancel" onClick={() => { setRinging(false); setCallingMember(null); }}>
              <I.Close size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ========== STYLES ========== */}
      <style>{`
/* ========== ROOT / RESET ========== */
.vroom{position:fixed;inset:0;background:#f0f2f5;display:flex;flex-direction:column;z-index:200;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;}

/* ========== TOP BAR ========== */
.vr-top{display:flex;align-items:center;justify-content:space-between;height:40px;padding:0 12px;background:#fff;border-bottom:1px solid #e5e5e7;flex-shrink:0;z-index:10;}
.vr-top-l{display:flex;align-items:center;gap:8px;}
.vr-top-meeting-icon{width:22px;height:22px;background:#007aff;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#fff;}
.vr-top-info{display:flex;align-items:center;gap:6px;}
.vr-top-title{font-size:12px;font-weight:500;color:#1d1d1f;}
.vr-top-meta{font-size:11px;color:#8e8e93;}
.vr-top-signal{color:#34c759;display:flex;align-items:center;}
.vr-top-icon-btn{display:flex;align-items:center;gap:4px;padding:4px 8px;border:none;background:transparent;color:#6e6e73;border-radius:5px;cursor:pointer;font-size:11px;transition:all 0.15s;}
.vr-top-icon-btn:hover{background:#f2f2f7;}
.vr-top-layout-btn{display:flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid #e5e5e7;background:#fff;border-radius:6px;cursor:pointer;font-size:11px;color:#1d1d1f;transition:all 0.15s;}
.vr-top-layout-btn:hover{background:#f2f2f7;}
.vr-top-divider{width:1px;height:16px;background:#e5e5e7;margin:0 4px;}
.vr-top-r{display:flex;align-items:center;gap:2px;}
.vr-top-win-btn{width:28px;height:28px;border:none;background:transparent;color:#6e6e73;border-radius:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-top-win-btn:hover{background:#f2f2f7;}
.vr-top-close:hover{background:#ff3b30;color:#fff;}

/* ========== MAIN ========== */
.vr-main{flex:1;display:flex;overflow:hidden;position:relative;background:#f0f2f5;}
.vr-video-area{flex:1;position:relative;transition:margin-right 0.25s ease;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:8px;}

/* ========== SCREEN SHARE ========== */
.vr-screen-share{position:absolute;inset:8px;z-index:5;background:#000;border-radius:12px;overflow:hidden;}
.vr-screen-vid{width:100%;height:100%;object-fit:contain;}
.vr-screen-badge{position:absolute;top:12px;left:12px;padding:5px 12px;background:rgba(0,0,0,0.7);border-radius:6px;font-size:11px;color:#fff;display:flex;align-items:center;gap:6px;backdrop-filter:blur(4px);}

/* ========== GRID ========== */
.vr-grid{display:grid;grid-template-columns:repeat(2, 1fr);grid-template-rows:repeat(2, 1fr);gap:8px;width:100%;height:100%;max-width:1100px;max-height:640px;}
.vr-grid-pip{position:absolute;bottom:70px;right:12px;width:auto;height:auto;z-index:8;gap:4px;grid-template-columns:repeat(2, 160px);grid-template-rows:repeat(2, 110px);}

/* ========== SPEAKER VIEW ========== */
.vr-speaker-view{display:flex;flex-direction:column;height:100%;width:100%;max-width:1100px;}
.vr-tile-speaker{flex:1;min-height:0;border-radius:12px;position:relative;background:#e8eaed;margin:0 0 8px;}
.vr-speaker-strip{display:flex;gap:8px;padding:0;overflow-x:auto;justify-content:center;flex-shrink:0;}
.vr-unpin{position:absolute;top:12px;right:12px;z-index:6;background:rgba(0,0,0,0.5);border:none;color:#fff;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px;backdrop-filter:blur(4px);}

/* ========== SPOTLIGHT (THEATER) VIEW ========== */
.vr-spotlight-view{display:flex;gap:0;width:100%;height:100%;max-width:1200px;max-height:680px;}
.vr-tile-spotlight{flex:1;min-width:0;border-radius:12px;position:relative;background:#e8eaed;margin:0 8px 0 0;overflow:hidden;}
.vr-spotlight-strip{display:flex;flex-direction:column;gap:6px;width:200px;flex-shrink:0;overflow-y:auto;padding:0;}
.vr-tile-spot{aspect-ratio:16/10;width:100%;flex-shrink:0;border-radius:10px;position:relative;background:#e8eaed;overflow:hidden;cursor:pointer;transition:all 0.2s;}
.vr-tile-spot:hover{outline:2px solid #007aff;outline-offset:-2px;}
.vr-tile-spot .vr-tile-vid{width:100%;height:100%;object-fit:cover;}
.vr-tile-spot .vr-avatar-sm{font-size:18px;opacity:0.45;}
.vr-tile-label-min{position:absolute;bottom:4px;left:4px;right:4px;padding:3px 6px;background:rgba(0,0,0,0.55);border-radius:4px;font-size:10px;color:#fff;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(6px);gap:4px;}
.vr-tile-label-min span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* ========== TILES ========== */
.vr-tile{border-radius:12px;overflow:hidden;position:relative;background:#e8eaed;transition:all 0.2s;}
.vr-tile-grid{aspect-ratio:16/10;}
.vr-tile-thumb{width:160px;height:100px;flex-shrink:0;cursor:pointer;border-radius:8px;}
.vr-tile-thumb:hover{outline:2px solid #007aff;outline-offset:-2px;}
.vr-speaking{outline:2px solid #34c759!important;outline-offset:-2px;}
.vr-tile-vid{width:100%;height:100%;object-fit:cover;}
.vr-tile-off{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#e8eaed;}
.vr-avatar-big{font-size:28px;opacity:0.5;}
.vr-avatar-sm{font-size:20px;opacity:0.5;}

/* Tile label - matching Tencent Meeting style */
.vr-tile-label{position:absolute;bottom:10px;left:10px;right:10px;padding:6px 10px;background:rgba(0,0,0,0.55);border-radius:8px;font-size:12px;color:#fff;display:flex;align-items:center;gap:6px;flex-wrap:wrap;backdrop-filter:blur(6px);}
.vr-tile-name{font-weight:500;}
.vr-tile-role{font-size:10px;color:rgba(255,255,255,0.75);}
.vr-verified{width:14px;height:14px;background:#34c759;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;}
.vr-mute-badge{width:18px;height:18px;background:rgba(255,59,48,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;}
.vr-speaking-badge{width:18px;height:18px;background:#34c759;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;}
.vr-tile-label-mini{position:absolute;bottom:6px;left:6px;right:6px;padding:4px 8px;background:rgba(0,0,0,0.55);border-radius:6px;font-size:11px;color:#fff;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(6px);}

/* HD Badge */
.vr-hd-badge{position:absolute;top:16px;right:16px;padding:4px 8px;background:rgba(255,255,255,0.9);border-radius:6px;font-size:10px;font-weight:700;color:#1d1d1f;backdrop-filter:blur(4px);letter-spacing:0.5px;border:1px solid rgba(0,0,0,0.06);}

/* ========== SIDE PANEL ========== */
.vr-panel{width:360px;background:#fff;border-left:1px solid #e5e5e7;display:flex;flex-direction:column;flex-shrink:0;position:absolute;top:0;right:0;bottom:0;z-index:15;animation:vr-slide 0.2s ease;}
@keyframes vr-slide{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
.vr-panel-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f2f2f7;}
.vr-panel-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#1d1d1f;}
.vr-panel-actions{display:flex;align-items:center;gap:6px;}
.vr-panel-x{width:28px;height:28px;border:none;background:transparent;color:#8e8e93;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-panel-x:hover{background:#f2f2f7;color:#1d1d1f;}
.vr-panel-search{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid #f2f2f7;}
.vr-panel-search svg{color:#8e8e93;}
.vr-panel-search input{flex:1;border:none;background:transparent;font-size:13px;color:#1d1d1f;outline:none;}
.vr-panel-search input::placeholder{color:#c7c7cc;}

/* ========== MEMBERS ========== */
.vr-members-body{flex:1;overflow-y:auto;padding:4px 0;}
.vr-member-row{cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 16px;transition:background 0.15s;}
.vr-member-row:hover{background:#f9f9fb;}
.vr-contact-row:hover{background:#f0f7ff;}
.vr-member-me{background:#f0f7ff;}
.vr-member-av{font-size:32px;position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;}
.vr-status-dot{position:absolute;bottom:0;right:0;width:8px;height:8px;border-radius:50%;border:2px solid #fff;}
.vr-member-info{flex:1;min-width:0;display:flex;flex-direction:column;}
.vr-member-name{font-size:13px;font-weight:500;color:#1d1d1f;display:flex;align-items:center;}
.vr-member-sub{font-size:11px;color:#8e8e93;margin-top:1px;}
.vr-member-actions{display:flex;align-items:center;gap:8px;}
.vr-call-btn{width:28px;height:28px;border:none;background:#f0f7ff;color:#007aff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-call-btn:hover{background:#007aff;color:#fff;}
.vr-remove-btn{width:24px;height:24px;border:none;background:transparent;color:#8e8e93;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-remove-btn:hover{background:#ff3b30;color:#fff;}

/* Members divider - Add from Contacts */
.vr-members-divider{display:flex;align-items:center;justify-content:space-between;padding:10px 16px 6px;font-size:11px;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #f2f2f7;margin-top:6px;}
.vr-members-divider-count{font-weight:400;color:#c7c7cc;text-transform:none;font-size:10px;}
.vr-no-contacts{display:flex;flex-direction:column;align-items:center;padding:20px 16px;gap:4px;}

/* Add Contact Form */
.vr-add-contact-form{display:flex;flex-direction:column;gap:8px;padding:8px 16px 12px;background:#fafafa;border-bottom:1px solid #f2f2f7;margin:0;}
.vr-add-contact-form input,.vr-add-contact-form select{padding:8px 10px;border:1px solid #e5e5e7;border-radius:8px;font-size:12px;color:#1d1d1f;background:#fff;outline:none;font-family:inherit;}
.vr-add-contact-form input:focus,.vr-add-contact-form select:focus{border-color:#007aff;}
.vr-add-contact-form select{cursor:pointer;}
.vr-add-contact-actions{display:flex;gap:8px;}
.vr-add-contact-save{flex:1;padding:7px 0;border:none;background:#007aff;color:#fff;border-radius:8px;cursor:pointer;font-size:12px;font-weight:500;transition:background 0.15s;}
.vr-add-contact-save:hover{background:#0051d5;}
.vr-add-contact-cancel{flex:1;padding:7px 0;border:1px solid #e5e5e7;background:#fff;color:#6e6e73;border-radius:8px;cursor:pointer;font-size:12px;transition:all 0.15s;}
.vr-add-contact-cancel:hover{background:#f2f2f7;}

/* ========== CHAT ========== */
.vr-chat-body{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.vr-chat-msgs{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px;}
.vr-msg{display:flex;gap:8px;align-items:flex-start;}
.vr-msg-me{flex-direction:row-reverse;}
.vr-msg-av{font-size:28px;flex-shrink:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;}
.vr-msg-bub{max-width:78%;padding:8px 12px;background:#f2f2f7;border-radius:14px;display:flex;flex-direction:column;}
.vr-msg-me .vr-msg-bub{background:#007aff;}
.vr-msg-sender{font-size:11px;font-weight:500;color:#8e8e93;margin-bottom:3px;}
.vr-msg-me .vr-msg-sender{color:rgba(255,255,255,0.7);}
.vr-msg-txt{font-size:13px;color:#1d1d1f;line-height:1.45;word-break:break-word;}
.vr-msg-me .vr-msg-txt{color:#fff;}
.vr-msg-emoji{font-size:28px;line-height:1;}

/* System message */
.vr-msg-system{justify-content:center!important;padding:4px 0;}
.vr-msg-system .vr-msg-bub{background:#f0f7ff;border-radius:10px;max-width:90%;text-align:center;padding:6px 14px;font-size:11px;color:#007aff;font-weight:500;}

/* Empty room label */
.vr-empty-room-label{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);padding:8px 20px;background:rgba(0,0,0,0.55);border-radius:20px;color:#fff;font-size:12px;backdrop-filter:blur(8px);display:flex;align-items:center;gap:8px;pointer-events:none;z-index:5;}
.vr-empty-room-label .vr-empty-dot{width:7px;height:7px;background:#ff9f0a;border-radius:50%;animation:vr-pulse 1.5s infinite;}
.vr-msg-time{font-size:10px;color:#c7c7cc;align-self:flex-end;margin-top:4px;}
.vr-msg-me .vr-msg-time{color:rgba(255,255,255,0.5);}
.vr-chat-input{display:flex;gap:8px;padding:10px 16px;border-top:1px solid #f2f2f7;background:#fff;}
.vr-chat-input input{flex:1;padding:9px 14px;background:#f2f2f7;border:1px solid transparent;border-radius:18px;color:#1d1d1f;font-size:13px;outline:none;}
.vr-chat-input input:focus{border-color:#007aff;background:#fff;}
.vr-chat-input input::placeholder{color:#c7c7cc;}
.vr-chat-input button{width:36px;height:36px;border:none;background:#007aff;border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0;}
.vr-chat-input button:hover{background:#0051d5;}

/* ========== TRANSCRIPT / YUANBAO MINUTES ========== */
.vr-translate-toggle{padding:4px 10px;border:1px solid #e5e5e7;background:#fff;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px;color:#6e6e73;transition:all 0.15s;}
.vr-translate-on{background:#f0f7ff;border-color:#007aff;color:#007aff;}
.vr-transcript-body{flex:1;overflow-y:auto;display:flex;flex-direction:column;}

/* AI Summary */
.vr-ai-summary{padding:14px 16px;border-bottom:1px solid #f2f2f7;background:#fafafa;}
.vr-ai-header{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#1d1d1f;margin-bottom:10px;}
.vr-ai-item{margin-bottom:6px;}
.vr-ai-title{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#fff;border-radius:8px;font-size:12px;font-weight:500;color:#1d1d1f;cursor:pointer;border:1px solid #e5e5e7;transition:all 0.15s;}
.vr-ai-title:hover{background:#f9f9fb;}
.vr-ai-content{padding:8px 10px;font-size:12px;color:#6e6e73;line-height:1.6;background:#fff;border:1px solid #f2f2f7;border-top:none;border-radius:0 0 8px 8px;}
.vr-ai-divider{height:1px;background:#e5e5e7;margin:10px 0;}
.vr-ai-feature{display:flex;align-items:center;gap:6px;font-size:12px;color:#1d1d1f;padding:4px 0;}

/* Live Transcript */
.vr-transcript-live{flex:1;overflow-y:auto;padding:12px 16px;}
.vr-transcribing-indicator{display:flex;align-items:center;gap:6px;font-size:11px;color:#34c759;padding:4px 0 10px;font-weight:500;}
.vr-pulse-dot{width:6px;height:6px;background:#34c759;border-radius:50%;animation:vr-pulse 1.5s infinite;}
@keyframes vr-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.vr-transcript-line{padding:8px 0;border-bottom:1px solid #f2f2f7;}
.vr-transcript-header{display:flex;align-items:center;gap:8px;margin-bottom:3px;}
.vr-transcript-speaker{font-size:11px;font-weight:600;color:#007aff;}
.vr-transcript-time{font-size:10px;color:#c7c7cc;}
.vr-transcript-text{font-size:12px;color:#3a3a3c;margin:4px 0 0;line-height:1.6;}

/* AI Secretary */
.vr-ai-secretary{display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid #f2f2f7;background:#fafafa;}
.vr-ai-avatar{width:32px;height:32px;background:#007aff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;}
.vr-ai-info{flex:1;}
.vr-ai-info span{font-size:12px;font-weight:500;color:#1d1d1f;display:block;}
.vr-ai-info small{font-size:10px;color:#8e8e93;}
.vr-ai-action{padding:5px 12px;border:1px solid #007aff;background:#fff;color:#007aff;border-radius:6px;cursor:pointer;font-size:11px;transition:all 0.15s;}
.vr-ai-action:hover{background:#007aff;color:#fff;}

/* ========== MORE PANEL ========== */
.vr-more-body{flex:1;padding:8px;}
.vr-more-item{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:none;background:transparent;color:#1d1d1f;border-radius:10px;cursor:pointer;text-align:left;font-size:13px;transition:all 0.15s;}
.vr-more-item:hover{background:#f9f9fb;}
.vr-more-active{background:#f0f7ff!important;}
.vr-more-icon{width:36px;height:36px;background:#f2f2f7;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#6e6e73;}
.vr-more-text{display:flex;flex-direction:column;line-height:1.45;}
.vr-more-text strong{font-size:13px;color:#1d1d1f;}
.vr-more-text small{font-size:11px;color:#8e8e93;}

/* ========== BOTTOM CONTROL BAR ========== */
.vr-bar-wrap{display:flex;justify-content:center;padding:10px 0 14px;flex-shrink:0;z-index:20;background:#fff;border-top:1px solid #e5e5e7;}
.vr-bar{display:flex;align-items:center;gap:4px;padding:4px 10px;background:#fff;border-radius:16px;}
.vr-bar-group{display:flex;align-items:center;gap:4px;}
.vr-bar-group::after{content:'';width:1px;height:24px;background:#e5e5e7;margin-left:6px;}
.vr-bar-group:last-of-type::after{display:none;}

.vr-bar-btn{position:relative;min-width:42px;height:42px;border:none;background:transparent;color:#6e6e73;border-radius:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all 0.15s;padding:2px;}
.vr-bar-btn:hover{background:#f2f2f7;color:#1d1d1f;}
.vr-bar-btn svg{width:18px;height:18px;}
.vr-bar-lbl{font-size:8px;color:#8e8e93;line-height:1;font-weight:500;}
.vr-bar-btn:hover .vr-bar-lbl{color:#1d1d1f;}

/* Off state - red */
.vr-bar-off{color:#ff3b30!important;}
.vr-bar-off:hover{background:#fff2f2!important;}

/* On/active state - blue */
.vr-bar-on{color:#007aff!important;background:#f0f7ff!important;}
.vr-bar-on .vr-bar-lbl{color:#007aff!important;}

.vr-bar-badge{position:absolute;top:2px;right:4px;min-width:16px;height:16px;padding:0 4px;background:#ff3b30;border-radius:8px;font-size:9px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;line-height:1;}

/* Emoji picker */
.vr-bar-emoji-wrap{position:relative;}
.vr-emoji-picker{position:absolute;bottom:48px;left:50%;transform:translateX(-50%);display:flex;gap:4px;padding:8px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12);border:1px solid #e5e5e7;z-index:30;}
.vr-emoji-btn{width:36px;height:36px;border:none;background:transparent;border-radius:8px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-emoji-btn:hover{background:#f2f2f7;transform:scale(1.15);}

/* End button */
.vr-bar-end{min-width:44px;height:32px;border:none;background:#ff3b30;color:#fff;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-size:11px;font-weight:600;margin-left:6px;padding:0 12px;}
.vr-bar-end:hover{background:#d70015;}

/* ========== RINGING OVERLAY ========== */
.vr-ring-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:300;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);}
.vr-ring-card{text-align:center;animation:vr-pop 0.3s ease;background:#fff;padding:40px 48px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
@keyframes vr-pop{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}
.vr-ring-av{font-size:80px;display:block;margin-bottom:16px;}
.vr-ring-card h2{color:#1d1d1f;margin:0 0 8px;font-size:22px;font-weight:600;}
.vr-ring-card p{color:#8e8e93;margin:0 0 20px;font-size:14px;}
.vr-ring-dots{display:flex;justify-content:center;gap:8px;margin-bottom:24px;}
.vr-ring-dots span{width:8px;height:8px;background:#007aff;border-radius:50%;animation:vr-bounce 1.4s infinite;}
.vr-ring-dots span:nth-child(2){animation-delay:0.2s;}
.vr-ring-dots span:nth-child(3){animation-delay:0.4s;}
@keyframes vr-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
.vr-ring-cancel{width:52px;height:52px;border:none;background:#ff3b30;color:#fff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:0 auto;transition:all 0.15s;}
.vr-ring-cancel:hover{background:#d70015;transform:scale(1.08);}

/* ========== INVITE PANEL ========== */
.vr-invite-body{flex:1;overflow-y:auto;padding:16px;}
.vr-invite-section{margin-bottom:16px;}
.vr-invite-label{font-size:11px;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;display:flex;align-items:center;gap:4px;}
.vr-invite-code-row{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#f9f9fb;border-radius:10px;border:1px solid #e5e5e7;}
.vr-invite-id{font-size:18px;font-weight:700;letter-spacing:1px;color:#1d1d1f;font-family:'SF Mono','Cascadia Code','Fira Code',monospace;}
.vr-invite-copy{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border:1px solid #e5e5e7;background:#fff;color:#007aff;border-radius:8px;cursor:pointer;font-size:11px;font-weight:500;transition:all 0.15s;font-family:inherit;white-space:nowrap;}
.vr-invite-copy:hover{background:#f0f7ff;border-color:#007aff;}
.vr-invite-copy-primary{flex:1;justify-content:center;padding:8px 12px;font-size:12px;}
.vr-invite-highlight{padding:16px;background:linear-gradient(135deg,#f0f7ff,#fafbff);border-radius:14px;border:1.5px dashed #007aff;}
.vr-invite-highlight .vr-invite-label{color:#007aff;}
.vr-invite-desc{font-size:12px;color:#6e6e73;margin:0 0 12px;line-height:1.55;}
.vr-invite-big-code{font-size:36px;font-weight:800;letter-spacing:6px;color:#007aff;text-align:center;padding:12px 0 4px;font-family:'SF Mono','Cascadia Code','Fira Code',monospace;background:#fff;border-radius:10px;margin-bottom:12px;border:1px solid #e5e5e7;user-select:all;}
.vr-invite-btn-row{display:flex;gap:8px;margin-bottom:10px;}
.vr-invite-refresh{width:100%;padding:8px;border:1px solid #e5e5e7;background:#fff;color:#6e6e73;border-radius:8px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s;font-family:inherit;}
.vr-invite-refresh:hover{background:#f2f2f7;color:#1d1d1f;}
.vr-invite-steps{margin-top:8px;}
.vr-invite-step{display:flex;gap:10px;padding:8px 0;font-size:12px;color:#6e6e73;line-height:1.5;}
.vr-invite-step-num{width:22px;height:22px;background:#f2f2f7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#007aff;flex-shrink:0;}
.vr-invite-test{margin-top:16px;padding:14px;background:#f9f9fb;border-radius:12px;border:1px solid #e5e5e7;}
.vr-invite-test-row{display:flex;gap:8px;}
.vr-invite-test-input{flex:1;padding:9px 12px;border:1px solid #e5e5e7;border-radius:8px;font-size:13px;color:#1d1d1f;background:#fff;outline:none;font-family:inherit;}
.vr-invite-test-input:focus{border-color:#007aff;}
.vr-invite-test-btn{padding:8px 16px;border:none;background:#007aff;color:#fff;border-radius:8px;cursor:pointer;font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px;transition:all 0.15s;font-family:inherit;white-space:nowrap;}
.vr-invite-test-btn:hover{background:#0051d5;}
.vr-invite-test-btn:disabled{opacity:0.4;cursor:not-allowed;}

/* ========== GUEST JOIN OVERLAY ========== */
.vr-guest-card{text-align:center;animation:vr-pop 0.3s ease;background:#fff;padding:36px 44px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.2);max-width:380px;width:90%;}
.vr-guest-icon{font-size:48px;display:block;margin-bottom:12px;}
.vr-guest-card h2{color:#1d1d1f;margin:0 0 6px;font-size:20px;font-weight:600;}
.vr-guest-room{font-size:13px;color:#8e8e93;margin:0 0 12px;}
.vr-guest-room strong{color:#007aff;letter-spacing:2px;}
.vr-guest-desc{font-size:13px;color:#6e6e73;margin:0 0 16px;line-height:1.5;}
.vr-guest-input{width:100%;padding:12px 16px;border:2px solid #e5e5e7;border-radius:12px;font-size:16px;color:#1d1d1f;outline:none;text-align:center;box-sizing:border-box;transition:border 0.15s;font-family:inherit;}
.vr-guest-input:focus{border-color:#007aff;}
.vr-guest-input::placeholder{color:#c7c7cc;}
.vr-guest-actions{display:flex;gap:10px;margin-top:16px;}
.vr-guest-join{flex:1;padding:12px 0;border:none;background:#007aff;color:#fff;border-radius:12px;cursor:pointer;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.15s;font-family:inherit;}
.vr-guest-join:hover{background:#0051d5;}
.vr-guest-join:disabled{opacity:0.4;cursor:not-allowed;}
.vr-guest-cancel{flex:1;padding:12px 0;border:1px solid #e5e5e7;background:#fff;color:#6e6e73;border-radius:12px;cursor:pointer;font-size:15px;font-weight:500;transition:all 0.15s;font-family:inherit;}
.vr-guest-cancel:hover{background:#f2f2f7;}

/* ========== RESPONSIVE ========== */
@media(max-width:768px){
  .vr-panel{position:fixed;inset:0;width:100%;z-index:50;}
  .vr-bar{gap:2px;padding:4px 6px;}
  .vr-bar-btn{min-width:38px;height:38px;}
  .vr-bar-btn svg{width:16px;height:16px;}
  .vr-bar-lbl{display:none;}
  .vr-bar-group::after{margin-left:2px;}
  .vr-bar-end{min-width:38px;height:28px;padding:0 8px;}
  .vr-grid{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;}
  .vr-grid-pip{grid-template-columns:repeat(2, 120px);grid-template-rows:repeat(2, 80px);}
  .vr-speaker-strip{gap:4px;}
  .vr-tile-thumb{width:110px;height:70px;}
  .vr-top-title{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .vr-hd-badge{display:none;}
  .vr-spotlight-view{flex-direction:column;max-height:100%;}
  .vr-tile-spotlight{flex:0 0 55%;margin:0 0 6px 0;}
  .vr-spotlight-strip{flex-direction:row;width:100%;overflow-y:hidden;overflow-x:auto;gap:4px;padding:0 0 4px;flex:0 0 auto;max-height:120px;}
  .vr-tile-spot{width:130px;flex-shrink:0;aspect-ratio:16/10;}
  .vr-tile-label-min{padding:2px 4px;font-size:9px;}
}
      `}</style>
    </div>
  );
}
